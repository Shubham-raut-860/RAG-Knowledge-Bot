import os
import json
import re
import uuid
import logging
from pathlib import Path
from typing import List, Tuple, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from openai import AzureOpenAI
import tiktoken

try:
    from rank_bm25 import BM25Okapi
    from sentence_transformers import CrossEncoder
except ImportError:
    BM25Okapi = None
    CrossEncoder = None

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_chroma_client: Any | None = None
_openai_client: AzureOpenAI | None = None
_cross_encoder: Any | None = None

_bm25_index = None
_bm25_docs = None
_bm25_ids = None
_bm25_metas = None

def invalidate_bm25_cache():
    global _bm25_index
    _bm25_index = None

def get_bm25_index():
    global _bm25_index, _bm25_docs, _bm25_ids, _bm25_metas
    if _bm25_index is None:
        all_ids, all_docs, all_metas = get_all_documents()
        if all_docs:
            tokenized_corpus = [doc.lower().split(" ") for doc in all_docs]
            _bm25_index = BM25Okapi(tokenized_corpus)
            _bm25_docs = all_docs
            _bm25_ids = all_ids
            _bm25_metas = all_metas
    return _bm25_index, _bm25_ids, _bm25_docs, _bm25_metas

def get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None and CrossEncoder is not None:
        logger.info("Loading cross-encoder model...")
        _cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    return _cross_encoder


def get_chroma() -> Any:
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_collection() -> chromadb.Collection:
    return get_chroma().get_or_create_collection(
        name="support_docs",
        metadata={"hnsw:space": "cosine"},
    )


def get_openai() -> AzureOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint
        )
    return _openai_client


def embed_texts(texts: List[str]) -> List[List[float]]:
    client = get_openai()
    try:
        response = client.embeddings.create(
            model=settings.embedding_model,
            input=texts,
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        logger.error("Embedding failed for %d texts: %s", len(texts), str(e))
        raise


def chunk_text(text: str) -> List[str]:
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = splitter.split_text(text)
        return [c for c in chunks if c.strip()]
    except ImportError:
        logger.warning("langchain-text-splitters not installed, falling back to simple chunker")
        # simple fallback
        size = settings.chunk_size
        return [text[i:i+size] for i in range(0, len(text), size)]


def extract_text_from_file(file_path: str, original_name: str) -> str:
    ext = Path(original_name).suffix.lower()
    if ext == ".pdf":
        import pdfplumber
        text_parts: List[str] = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    elif ext in (".txt", ".md"):
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    elif ext == ".docx":
        import docx
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    elif ext in (".png", ".jpg", ".jpeg"):
        import easyocr
        # Disable GPU to avoid driver issues unless user has a solid CUDA setup
        reader = easyocr.Reader(['en'], gpu=False)
        result = reader.readtext(file_path, detail=0)
        return "\n".join(result)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def ingest_document(file_path: str, original_name: str, doc_id: int) -> int:
    text = extract_text_from_file(file_path, original_name)
    chunks = chunk_text(text)
    if not chunks:
        return 0

    collection = get_collection()
    batch_size = 50
    total = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        embeddings = embed_texts(batch)
        ids = [f"doc{doc_id}_chunk{i+j}" for j in range(len(batch))]
        metadatas = [{"doc_id": str(doc_id), "filename": original_name, "chunk_index": i + j} for j in range(len(batch))]
        collection.add(documents=batch, embeddings=embeddings, ids=ids, metadatas=metadatas)
        total += len(batch)

    invalidate_bm25_cache()
    logger.info("Ingested %d chunks from %s", total, original_name)
    return total


def delete_document_chunks(doc_id: int) -> None:
    collection = get_collection()
    results = collection.get(where={"doc_id": str(doc_id)})
    if results["ids"]:
        collection.delete(ids=results["ids"])
        invalidate_bm25_cache()
        logger.info("Deleted %d chunks for doc_id=%d", len(results["ids"]), doc_id)


def get_all_documents() -> Tuple[List[str], List[str], List[dict]]:
    try:
        collection = get_collection()
        results = collection.get(include=["documents", "metadatas"])
        return results["ids"], results["documents"], results["metadatas"]
    except Exception as e:
        logger.error("Failed to fetch all documents: %s", str(e))
        return [], [], []


def retrieve_context(query: str) -> Tuple[str, List[dict]]:
    collection = get_collection()
    q_embedding = embed_texts([query])[0]
    
    # 1. Semantic Search (Top K*2)
    semantic_results = collection.query(
        query_embeddings=[q_embedding],
        n_results=settings.top_k_results * 2,
        include=["documents", "metadatas", "distances"],
    )

    semantic_ids = semantic_results["ids"][0] if semantic_results["ids"] else []
    semantic_docs = semantic_results["documents"][0] if semantic_results["documents"] else []
    semantic_metas = semantic_results["metadatas"][0] if semantic_results["metadatas"] else []

    # 2. BM25 Lexical Search (Top K*2)
    bm25_ids, bm25_docs, bm25_metas = [], [], []
    if BM25Okapi is not None:
        bm25, all_ids, all_docs, all_metas = get_bm25_index()
        if bm25 is not None:
            tokenized_query = query.lower().split(" ")
            scores = bm25.get_scores(tokenized_query)
            
            scored_corpus = list(zip(scores, range(len(scores))))
            scored_corpus.sort(key=lambda x: x[0], reverse=True)
            top_indices = [idx for score, idx in scored_corpus if score > 0][:settings.top_k_results * 2]
            
            bm25_ids = [all_ids[i] for i in top_indices]
            bm25_docs = [all_docs[i] for i in top_indices]
            bm25_metas = [all_metas[i] for i in top_indices]

    # 3. Combine unique documents
    combined_docs = {}
    for sid, sdoc, smeta in zip(semantic_ids, semantic_docs, semantic_metas):
        combined_docs[sid] = {"doc": sdoc, "meta": smeta}
    for bid, bdoc, bmeta in zip(bm25_ids, bm25_docs, bm25_metas):
        combined_docs[bid] = {"doc": bdoc, "meta": bmeta}
        
    if not combined_docs:
        return "", []

    doc_list = list(combined_docs.values())
    
    # 4. Re-rank with CrossEncoder
    encoder = get_cross_encoder()
    if encoder is not None:
        pairs = [[query, item["doc"]] for item in doc_list]
        scores = encoder.predict(pairs)
        scored_items = list(zip(scores, doc_list))
        scored_items.sort(key=lambda x: x[0], reverse=True)
        top_items = [item for score, item in scored_items][:settings.top_k_results]
    else:
        # Fallback if no encoder
        top_items = doc_list[:settings.top_k_results]

    sources: List[dict] = []
    context_parts: List[str] = []
    seen_files: set = set()
    
    for item in top_items:
        doc = item["doc"]
        meta = item["meta"]
        context_parts.append(f"[Source: {meta['filename']}]\n{doc}")
        fname = meta["filename"]
        if fname not in seen_files:
            seen_files.add(fname)
            sources.append({"filename": fname, "content_preview": doc[:200]})

    return "\n\n---\n\n".join(context_parts), sources


def generate_answer_stream(query: str, context: str, history: List[dict]):
    client = get_openai()

    system_prompt = (
        "You are a helpful customer support assistant. "
        "Answer ONLY using the provided context. "
        "If the context does not contain the answer, say: 'I don't have information about that in our documentation.' "
        "Be concise and accurate. Do not hallucinate.\n\n"
        "If the user asks to visualize data or if a chart would be helpful, output a JSON block with the language 'json-chart'. "
        "The JSON should be an array of objects representing the data points, e.g., ```json-chart\n[{\"name\": \"Jan\", \"value\": 400}]\n```."
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Conversational memory windowing (max ~2000 tokens of history)
    try:
        encoding = tiktoken.encoding_for_model(settings.azure_chat_deployment)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
        
    windowed_history = []
    current_tokens = 0
    
    # Dynamic context window limits
    user_content = f"Context:\n{context}\n\nQuestion: {query}" if context else f"Question: {query}"
    system_tokens = len(encoding.encode(system_prompt))
    context_tokens = len(encoding.encode(user_content))
    
    # Assuming standard 4000 token limit. 600 reserved for completion response
    total_budget = 4000
    max_history_tokens = max(0, total_budget - system_tokens - context_tokens - 600)
    
    for msg in reversed(history):
        msg_text = msg.get("content", "")
        # approximate tokens: role + content + structural overhead
        msg_tokens = len(encoding.encode(msg_text)) + 4 
        if current_tokens + msg_tokens > max_history_tokens:
            break
        windowed_history.insert(0, msg)
        current_tokens += msg_tokens

    for msg in windowed_history:
        messages.append({"role": msg["role"], "content": msg.get("content", "")})

    user_content = f"Context:\n{context}\n\nQuestion: {query}" if context else f"Question: {query}"
    messages.append({"role": "user", "content": user_content})

    response = client.chat.completions.create(
        model=settings.azure_chat_deployment,
        messages=messages,
        max_completion_tokens=600,
        stream=True,
    )
    
    for chunk in response:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


def collection_doc_count() -> int:
    try:
        return get_collection().count()
    except Exception:
        return 0