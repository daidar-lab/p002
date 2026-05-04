import React, { useEffect, useState } from 'react';

let toastFn = null;
export const toast = (message, type = 'success') => toastFn?.(message, type);

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = (message, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return () => { toastFn = null; };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.type === 'success' ? '✓' : '!'} {t.message}
        </div>
      ))}
    </div>
  );
}
