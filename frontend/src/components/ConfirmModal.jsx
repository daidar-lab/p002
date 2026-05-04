import React from 'react';

export default function ConfirmModal({ open, title, description, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="drawer-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="confirm-modal__actions">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}
