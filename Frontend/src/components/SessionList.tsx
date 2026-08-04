import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { ChatSession, MessageRecord } from '../types';

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (id: string) => void;
  sessionHistories?: Record<string, MessageRecord[]>;
  hideHeader?: boolean;
}

export default function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  sessionHistories = {},
  hideHeader = false,
}: SessionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      if (diffHrs < 1) return 'Just now';
      if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
      if (diffHrs < 48) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getPreview = (sessionId: string): string => {
    const msgs = sessionHistories[sessionId];
    if (!msgs || msgs.length === 0) return 'Empty conversation';
    const firstUser = msgs.find(m => m.role === 'user');
    if (!firstUser) return 'Empty conversation';
    return firstUser.content.length > 48
      ? firstUser.content.substring(0, 48) + '…'
      : firstUser.content;
  };

  const getMsgCount = (sessionId: string): number => {
    return sessionHistories[sessionId]?.length ?? 0;
  };

  const filteredSessions = sessions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const preview = getPreview(s.session_id).toLowerCase();
    if (preview.includes(term)) return true;
    const msgs = sessionHistories[s.session_id];
    if (msgs) return msgs.some(m => m.content.toLowerCase().includes(term));
    return false;
  });

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!onDeleteSession) return;
    setDeletingId(sessionId);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!hideHeader && (
        <div className="px-4 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>
              Threads
            </span>
            <button
              onClick={onNewSession}
              id="new-chat-session-btn"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              title="New thread (Ctrl+N)"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search threads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm sm:text-xs outline-none transition-all placeholder:opacity-40"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-soft)', color: 'var(--text-primary)' }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-soft)'; }}
              id="session-search-input"
            />
          </div>
        </div>
      )}

      {hideHeader && (
        <div className="px-3 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-xs outline-none transition-all placeholder:opacity-40"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-soft)', color: 'var(--text-primary)' }}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--border-soft)'; }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <MessageSquare className="h-8 w-8 mb-3" style={{ color: 'var(--text-faint)' }} />
            <p className="text-xs font-light" style={{ color: 'var(--text-muted)' }}>
              {searchTerm ? 'No threads match' : 'No threads yet'}
            </p>
            {!searchTerm && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>Send a message to start</p>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = activeSessionId === session.session_id;
            const isDeleting = deletingId === session.session_id;
            const isHovered = hoveredId === session.session_id;
            const preview = getPreview(session.session_id);
            const msgCount = getMsgCount(session.session_id);
            return (
              <motion.div
                key={session.session_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="relative group"
                onMouseEnter={() => setHoveredId(session.session_id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => onSelectSession(session.session_id)}
                  className={`w-full min-h-[52px] text-left rounded-xl px-3 py-3 transition-all pr-9 border ${
                    isActive ? '' : 'border-transparent'
                  }`}
                  style={isActive
                    ? { background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }
                    : { background: 'transparent' }
                  }
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  id={`session-item-${session.session_id}`}
                >
                  <p className={`text-xs font-medium truncate leading-relaxed`}
                     style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {preview}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(session.created_at)}
                    </span>
                    {msgCount > 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>· {msgCount} msg{msgCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {(isHovered || isActive) && onDeleteSession && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.12 }}
                      onClick={(e) => handleDelete(e, session.session_id)}
                      disabled={isDeleting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 transition-all"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                      title="Delete thread"
                    >
                      {isDeleting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-faint)' }} />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
