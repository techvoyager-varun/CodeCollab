'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 150);
    }, duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 border text-sm font-medium
              ${t.exiting ? 'toast-exit' : 'toast-enter'}
              ${t.type === 'success' ? 'bg-brand-accentMuted border-brand-success text-brand-success' : ''}
              ${t.type === 'error' ? 'bg-brand-accentMuted border-brand-error text-brand-error' : ''}
              ${t.type === 'info' ? 'bg-brand-surface2 border-brand-border text-brand-text1' : ''}
              ${t.type === 'warning' ? 'bg-brand-accentMuted border-brand-warning text-brand-warning' : ''}
            `}
            style={{
              backgroundColor: t.type === 'success' ? 'var(--accent-muted)' :
                               t.type === 'error' ? 'rgba(180,60,60,0.12)' :
                               t.type === 'warning' ? 'rgba(210,146,58,0.12)' :
                               'var(--surface-2)',
              borderColor: t.type === 'success' ? 'var(--success)' :
                           t.type === 'error' ? 'var(--error)' :
                           t.type === 'warning' ? 'var(--warning)' :
                           'var(--border)',
              color: t.type === 'success' ? 'var(--success)' :
                     t.type === 'error' ? 'var(--error)' :
                     t.type === 'warning' ? 'var(--warning)' :
                     'var(--text-1)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
