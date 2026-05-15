import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './RncSignatures.css';

const ROLE_LABELS = {
  QUALITY_ANALYST: 'Analista de Qualidade',
  QUALITY_COORDINATOR: 'Coordenador de Qualidade',
  CGI: 'CGI',
  LOGISTICS: 'Logística',
  PCP: 'PCP'
};

export default function RheSignatures({ rheId, userRole, onChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const fetchStatus = () => {
    setLoading(true);
    api
      .getRheSignaturesStatus(rheId)
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (rheId) fetchStatus();
  }, [rheId]);

  const handleSign = async (role) => {
    if (!window.confirm(`Assinar formalmente como ${ROLE_LABELS[role] || role}?`)) return;
    setSigning(true);
    try {
      await api.signRhe(rheId, role);
      fetchStatus();
      if (onChange) onChange();
    } catch (err) {
      alert(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <div className="signatures-loading">Carregando assinaturas RHE...</div>;
  if (!status) return null;

  return (
    <div className="signatures-panel" style={{ marginTop: '1rem' }}>
      <div className="panel-header">
        <h4>Assinaturas paralelas (RHE — fase final)</h4>
        {status.is_complete && <span className="status-badge complete">TODAS CONCLUÍDAS</span>}
        {!status.can_sign && !status.is_complete && status.status === 'DRAFT' && (
          <span className="status-badge warning">APROVE O CHECKLIST PARA LIBERAR</span>
        )}
        {status.status === 'UNDER_REVIEW' && !status.is_complete && (
          <span className="status-badge warning">AGUARDANDO ASSINATURAS</span>
        )}
      </div>

      <div className="roles-grid">
        {status.required_roles.map((role) => {
          const sig = status.current_signatures.find((s) => s.role === role);
          const signed = sig && sig.status === 'SIGNED';
          const isMyRole = userRole === role || userRole === 'admin';

          return (
            <div key={role} className={`role-card ${signed ? 'signed' : 'pending'}`}>
              <div className="role-info">
                <span className="role-label">{ROLE_LABELS[role] || role}</span>
                {signed ? (
                  <div className="signature-data">
                    <p className="signed-by">Assinado por: {sig.user_name || '—'}</p>
                    {sig.signed_at && <p className="signed-at">{new Date(sig.signed_at).toLocaleString()}</p>}
                    {sig.signature_hash && (
                      <code className="hash" title={sig.signature_hash}>
                        {String(sig.signature_hash).slice(0, 8)}...
                      </code>
                    )}
                  </div>
                ) : (
                  <p className="status-text">Pendente</p>
                )}
              </div>

              {!signed && isMyRole && status.can_sign && (
                <button type="button" className="btn-sign" onClick={() => handleSign(role)} disabled={signing}>
                  {signing ? 'Assinando...' : 'Assinar'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
