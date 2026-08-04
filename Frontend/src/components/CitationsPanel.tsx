import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronDown, ChevronUp, Copy, BookOpen, Quote } from 'lucide-react';
import { SourceDoc } from '../types';

interface CitationsPanelProps {
  sources: SourceDoc[];
}

export default function CitationsPanel({ sources }: CitationsPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!sources || sources.length === 0) return null;

  return (
    <div className="space-y-2 mt-3.5 pt-3.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
        <BookOpen className="h-3.5 w-3.5" />
        Sourced Evidence Node ({sources.length})
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={index}
              className="rounded-xl border p-3 flex flex-col justify-between transition-all"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-soft)' }}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-xs font-semibold font-mono truncate" style={{ color: 'var(--text-primary)' }} title={source.filename}>
                    {source.filename}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(source.content_preview, index)}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                    title="Copy excerpt"
                    id={`copy-citation-${index}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                    id={`toggle-citation-${index}`}
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="rounded-lg p-2.5 border text-xs font-mono leading-relaxed relative"
                         style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <Quote className="absolute right-2 top-2 h-3 w-3 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
                      {source.content_preview || "No preview segment indexed."}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Badge if copied */}
              <AnimatePresence>
                {copiedIndex === index && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-[10px] text-emerald-500 font-semibold mt-1 self-end font-mono"
                  >
                    Excerpt copied to clipboard.
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
