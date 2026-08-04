import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCheck, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// ── GLOBAL TOAST STATE ───────────────────────────────────────────────────────
let _addToast: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  if (_addToast) _addToast(message, type);
  else console.log(`[toast:${type}]`, message);
}
toast.success = (msg: string) => toast(msg, 'success');
toast.error   = (msg: string) => toast(msg, 'error');
toast.info    = (msg: string) => toast(msg, 'info');

// ── TOAST PROVIDER ───────────────────────────────────────────────────────────
export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />,
    error:   <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />,
    info:    <Info className="h-4 w-4 text-indigo-400 shrink-0" />,
  };

  return (
    <div className="toast-container">
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="toast"
          >
            {icons[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="text-inherit opacity-40 hover:opacity-80 transition-opacity ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
