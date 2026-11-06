import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

let counter = 0;

/** Quiet, transient messages. Replaces alert() everywhere. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, { tone = 'info', action, duration = 3800 } = {}) => {
      counter += 1;
      const id = counter;
      setItems((prev) => [...prev.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.tone === 'error' ? ' toast--error' : ''}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
