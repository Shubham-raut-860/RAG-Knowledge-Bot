import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, CheckCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { getApiUrl, setApiUrl, healthApi } from '../lib/api';

interface ApiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onHealthUpdate?: (isHealthy: boolean) => void;
}

export default function ApiSettings({ isOpen, onClose, onHealthUpdate }: ApiSettingsProps) {
  const [urlInput, setUrlInput] = useState(getApiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [stats, setStats] = useState<{ docsCount: number } | null>(null);

  const checkConnection = async (targetUrl?: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const originalUrl = localStorage.getItem('rag_api_url') || '';
      if (targetUrl) {
        localStorage.setItem('rag_api_url', targetUrl);
      }
      
      const health = await healthApi.get();
      if (health.status === 'ok') {
        setTestResult('success');
        setStats({ docsCount: health.chroma_docs });
        if (onHealthUpdate) onHealthUpdate(true);
      } else {
        setTestResult('failed');
        if (onHealthUpdate) onHealthUpdate(false);
      }
      
      if (targetUrl && !originalUrl) {
        localStorage.removeItem('rag_api_url');
      } else if (targetUrl && originalUrl) {
        localStorage.setItem('rag_api_url', originalUrl);
      }
    } catch (e) {
      setTestResult('failed');
      if (onHealthUpdate) onHealthUpdate(false);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getApiUrl());
      checkConnection();
    }
  }, [isOpen]);

  const handleSave = () => {
    setApiUrl(urlInput.trim());
    localStorage.setItem('rag_api_url', urlInput.trim());
    checkConnection();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            className="relative w-full max-w-lg mx-4 sm:mx-0 overflow-hidden rounded-2xl border shadow-2xl"
            style={{ background: 'var(--modal-bg)', borderColor: 'var(--modal-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-4 px-6 pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-500" />
                <h3 className="font-display text-lg font-medium tracking-wide" style={{ color: 'var(--text-primary)' }}>
                  Local Backend Gateway Config
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                id="close-settings-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  FastAPI Base Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 rounded-xl border px-4 py-3 text-sm font-mono outline-none transition-all"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-soft)', color: 'var(--text-primary)' }}
                    onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-focus)'}
                    onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-soft)'}
                    placeholder="http://localhost:8000"
                    id="api-url-input"
                  />
                  <button
                    onClick={() => setUrlInput('http://localhost:8000')}
                    className="rounded-xl border px-3 text-xs font-semibold transition-colors"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                    title="Reset to localhost"
                    id="reset-api-url-btn"
                  >
                    Localhost
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Provide the connection endpoint to your FastAPI backend server. Default is <code className="font-mono text-indigo-500">http://localhost:8000</code>.
                </p>
              </div>

              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Connection Health State
                  </span>
                  <button
                    onClick={() => checkConnection(urlInput)}
                    disabled={testing}
                    className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-400 disabled:opacity-50 transition-colors"
                    id="api-test-conn-btn"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                    Test Ping
                  </button>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  {testing ? (
                    <div className="flex items-center gap-2 text-sm py-1" style={{ color: 'var(--text-secondary)' }}>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      Probing backend cluster connection...
                    </div>
                  ) : testResult === 'success' ? (
                    <div className="flex items-start gap-2.5 text-emerald-500">
                      <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Gateway Protocol Online</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Successfully hooked with ChromaDB metadata logs:
                          <strong className="text-emerald-500 font-mono ml-1.5">{stats?.docsCount ?? 0} ingested vectors</strong> cached inside network.
                        </p>
                      </div>
                    </div>
                  ) : testResult === 'failed' ? (
                    <div className="flex items-start gap-2.5 text-rose-500">
                      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Gateway Unreachable</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Failed connecting to backend. Ensure the FastAPI application is running locally on port 8000, or verify host routing permissions.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs py-1" style={{ color: 'var(--text-secondary)' }}>Connection not tested yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                id="cancel-settings-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: '#4f46e5', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4338ca'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5'; }}
                id="save-settings-btn"
              >
                Apply Gateway Address
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
