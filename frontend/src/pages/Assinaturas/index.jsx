import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../utils/auth.jsx';
import { TypeBadge } from '../../components/Badge.jsx';

export default function Assinaturas() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      // Busca apenas o que o usuário logado PODE assinar (ou tudo se admin)
      const data = await api.getSignaturesPending();
      setPending(data);
    } catch (err) {
      console.error('Erro ao carregar assinaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSign = async (docId, role) => {
    if (!window.confirm(`Deseja realizar a assinatura formal para o documento ${docId} como ${role}?`)) return;
    
    setSigning(true);
    try {
      await api.signDocument(docId, role);
      await load(); // Recarrega a lista
    } catch (err) {
      alert(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <div className="p-8">Carregando fila de assinaturas...</div>;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Assinar Documentos (RNC)</h1>
          <p className="page-subtitle">Aprovação técnica de Não Conformidades pendentes</p>
        </div>
      </header>

      <div className="card" style={{ padding: 0 }}>
        {pending.length === 0 ? (
          <div className="p-16 text-center">
            <div style={{ fontSize: '48px', marginBottom: 16 }}></div>
            <h3 style={{ color: 'var(--text-sub)' }}>Nenhuma assinatura pendente no momento.</h3>
            <p className="text-sub">Todos os seus documentos estão em dia.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>RNC</th>
                <th>Tipo</th>
                <th>Fornecedor</th>
                <th>Cargos Pendentes</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(item => (
                <tr key={item.id}>
                  <td><strong style={{ fontSize: '14px' }}>{item.code}</strong></td>
                  <td><TypeBadge type={item.doc_type} /></td>
                  <td>{item.supplier_name || 'Interno'}</td>
                  <td>
                    <span className="badge badge--assinaturas" style={{ padding: '4px 10px' }}>
                      {item.role}
                    </span>
                  </td>
                  <td className="text-right">
                    <button 
                      className="btn-primary" 
                      style={{ padding: '8px 20px', borderRadius: '8px' }}
                      disabled={signing}
                      onClick={() => handleSign(item.document_id, item.role)}
                    >
                      {signing ? 'Assinando...' : 'Realizar Assinatura'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
