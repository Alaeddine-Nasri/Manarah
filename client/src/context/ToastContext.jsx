import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X } from '../components/Icons';

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    clearTimeout(timers.current[id]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 210);
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++idSeq;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback((msg, d) => toast(msg, 'success', d), [toast]);
  const error   = useCallback((msg, d) => toast(msg, 'error', d), [toast]);
  const info    = useCallback((msg, d) => toast(msg, 'info', d), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.type}${t.exiting ? ' exiting' : ''}`} role="alert">
            <div className="toast-dot" />
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
