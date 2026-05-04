import React, { useEffect } from 'react';

export default function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header className="drawer-header">
          <h3>{title}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Fechar">✕</button>
        </header>
        <div className="drawer-body">
          {children}
        </div>
      </aside>
    </div>
  );
}
