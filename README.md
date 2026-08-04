# RAG Knowledge Bot

Document Q&A chatbot. Upload PDFs or DOCX files, ask questions, get answers with source citations.

Uses hybrid retrieval — combines vector similarity (ChromaDB + text-embedding-3-small) with BM25 keyword matching to find the most relevant document chunks. GPT-4o generates the final answer.

## Setup

```bash
# Backend
cd Backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload

# Frontend
cd Frontend
npm install && npm run dev
```

Built with FastAPI, ChromaDB, Azure OpenAI, LangChain text splitters, rank-bm25, and a React frontend.

Config: `.env.example` has the Azure OpenAI keys, JWT secret, and ChromaDB path.
