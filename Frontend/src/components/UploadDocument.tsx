import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { DocumentRecord } from '../types';

interface UploadDocumentProps {
  onSuccess: () => void;
  documents: DocumentRecord[];
  onDelete: (id: number) => void;
}

interface ActiveUpload {
  docId: number;
  filename: string;
  progress: 'uploading' | 'processing' | 'ready' | 'error';
  errorMsg?: string;
  chunkCount: number;
}

export default function UploadDocument({ onSuccess, documents, onDelete }: UploadDocumentProps) {
  const [dragActive, setDragActive] = useState(false);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startPolling = (docId: number, filename: string) => {
    const pollId = setInterval(async () => {
      try {
        const check = await adminApi.getDocStatus(docId);
        
        setActiveUploads((prev) =>
          prev.map((up) => {
            if (up.docId === docId) {
              const updatedStatus = check.status as 'processing' | 'ready' | 'error';
              if (updatedStatus === 'ready' || updatedStatus === 'error') {
                clearInterval(pollId);
                setTimeout(() => {
                  onSuccess();
                  setTimeout(() => {
                     setActiveUploads(current => current.filter(item => item.docId !== docId));
                  }, 5000);
                }, 500);
              }
              return {
                ...up,
                progress: updatedStatus,
                chunkCount: check.chunk_count || 0,
              };
            }
            return up;
          })
        );
      } catch (err) {
        clearInterval(pollId);
        setActiveUploads((prev) =>
          prev.map((up) =>
            up.docId === docId ? { ...up, progress: 'error', errorMsg: 'Pipeline timeout' } : up
          )
        );
      }
    }, 2000);
  };

  const processFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("File exceeds maximum 20MB payload boundary.");
      return;
    }

    const tempId = Date.now();
    setActiveUploads((prev) => [
      ...prev,
      {
        docId: tempId,
        filename: file.name,
        progress: 'uploading',
        chunkCount: 0,
      },
    ]);

    try {
      const response = await adminApi.uploadDocument(file);
      setActiveUploads((prev) =>
        prev.map((up) =>
          up.docId === tempId
            ? { ...up, docId: response.doc_id, progress: 'processing' }
            : up
        )
      );
      startPolling(response.doc_id, file.name);
    } catch (e: any) {
      const errText = e.response?.data?.detail || 'Upload stream broken';
      setActiveUploads((prev) =>
        prev.map((up) =>
          up.docId === tempId
            ? { ...up, progress: 'error', errorMsg: errText }
            : up
        )
      );
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach((f: any) => processFile(f as File));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      Array.from(e.target.files).forEach((f: any) => processFile(f as File));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteClick = async (docId: number) => {
    setDeletingId(docId);
    try {
      await onDelete(docId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <h4 className="font-display text-base font-semibold tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          RAG Corpus Pipeline Intake
        </h4>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Upload manuals, PDF files, or markdown txt. They are parsed, split using overlap configurations semantic-wise, embedded with Azure OpenAI models, and synced into ChromaDB vector databases.
        </p>
      </div>

      {/* Drag & Drop Canvas */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-6 sm:py-10 px-6 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'shadow-[0_0_25px_rgba(99,102,241,0.1)]'
            : ''
        }`}
        style={dragActive
          ? { borderColor: '#6366f1', background: 'rgba(99,102,241,0.05)' }
          : { borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }
        }
        onMouseEnter={e => { if (!dragActive) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-focus)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; } }}
        onMouseLeave={e => { if (!dragActive) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; } }}
        id="drag-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx,.png,.jpg,.jpeg"
          onChange={handleFileInput}
          className="hidden"
          id="file-input-field"
        />
        
        <div className={`rounded-xl p-3.5 border shadow-md transition-transform duration-300 ${dragActive ? 'scale-110 text-indigo-500' : ''}`}
             style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: dragActive ? '#6366f1' : 'var(--text-muted)' }}>
          <Upload className="h-6 w-6" />
        </div>

        <p className="mt-4 font-display text-sm font-medium tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Drag and drop local corporate data
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Supports <span className="font-mono text-indigo-500 font-semibold">PDF, DOCX, TXT, MD, PNG, JPG</span> payloads up to 20 MB max.
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-focus)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; }}
          id="browse-files-btn"
        >
          Browse Files
        </button>
      </div>

      {/* Live Polling Pipelines List */}
      <AnimatePresence>
        {activeUploads.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-indigo-500 uppercase tracking-widest px-1">
              Active Segmentations & Embeddings Task ({activeUploads.length})
            </h5>
            
            {activeUploads.map((up) => (
              <motion.div
                key={up.docId}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between rounded-xl border p-4"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg p-2 border shrink-0 text-indigo-500" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{up.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {up.progress === 'uploading' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Stream transfer...
                        </span>
                      )}
                      {up.progress === 'processing' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 font-mono uppercase">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Indexing & Vectorizing...
                        </span>
                      )}
                      {up.progress === 'ready' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 font-mono uppercase">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Completed! {up.chunkCount} vector nodes stored
                        </span>
                      )}
                      {up.progress === 'error' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 font-mono uppercase" title={up.errorMsg}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Corpus pipeline failure
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Uploaded Corpus Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h5 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Ingested Context Corporuses ({documents.length})
          </h5>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-xl border p-6 text-center select-none" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No active knowledge sources found.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>The system is currently answering from base parameters without grounded context.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
            <div className="divide-y max-h-[40vh] overflow-y-auto" style={{ borderColor: 'var(--border-subtle)' }}>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3.5 transition-colors"
                     style={{ borderBottom: '1px solid var(--border-subtle)' }}
                     onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg p-2 border shrink-0" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={doc.original_name} style={{ color: 'var(--text-primary)' }}>
                        {doc.original_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span>{doc.chunk_count} partitions</span>
                        <span>•</span>
                        <span className="truncate">by {doc.uploaded_by || 'system'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 ml-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono ${
                      doc.status === 'ready'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                        : doc.status === 'processing'
                        ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/10'
                    }`}>
                      {doc.status}
                    </span>

                    <button
                      onClick={() => handleDeleteClick(doc.id)}
                      disabled={deletingId === doc.id}
                      className="rounded-lg p-1.5 disabled:opacity-30 transition-colors shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                      title="Erase corpus"
                      id={`delete-doc-${doc.id}`}
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
