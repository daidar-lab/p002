import React, { useState, useEffect } from 'react';
import './RncSignatures.css';

const RncSignatures = ({ documentId, userRole, onSignSuccess }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const fetchStatus = () => {
    fetch(`${import.meta.env.VITE_API_URL}/signatures/${documentId}/status`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
    })
      .then(res => res.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (documentId) fetchStatus();
  }, [documentId]);

  const handleSign = async () => {
    if (!window.confirm(`Deseja realizar a assinatura eletrônica formal como ${userRole}?`)) return;

    setSigning(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/signatures/${documentId}/sign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`
        },
        body: JSON.stringify({ role: userRole })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao assinar');
      }

      fetchStatus();
      if (onSignSuccess) onSignSuccess();
    } catch (err) {
      alert(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <div className="signatures-loading">Carregando painel de assinaturas...</div>;

  return (
    <div className="signatures-panel">
      <div className="panel-header">
        <h4>Painel de Assinaturas Paralelas</h4>
        {status.is_complete && <span className="status-badge complete">PRONTO PARA ENCERRAR</span>}
        {!status.can_sign && <span className="status-badge warning">AGUARDANDO DECISÃO TÉCNICA</span>}
      </div>

      <div className="roles-grid">
        {status.required_roles.map(role => {
          const sig = status.current_signatures.find(s => s.role === role);
          const isMyRole = userRole === role || userRole === 'admin';

          return (
            <div key={role} className={`role-card ${sig ? 'signed' : 'pending'}`}>
              <div className="role-info">
                <span className="role-label">{role.toUpperCase()}</span>
                {sig ? (
                  <div className="signature-data">
                    <p className="signed-by">Assinado por: {sig.user_name}</p>
                    <p className="signed-at">{new Date(sig.signed_at).toLocaleString()}</p>
                    <code className="hash" title={sig.signature_hash}>
                      {sig.signature_hash.substring(0, 8)}...
                    </code>
                  </div>
                ) : (
                  <p className="status-text">Pendente</p>
                )}
              </div>

              {!sig && isMyRole && status.can_sign && (
                <button 
                  className="btn-sign" 
                  onClick={handleSign}
                  disabled={signing}
                >
                  {signing ? 'Assinando...' : 'Assinar'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RncSignatures;
