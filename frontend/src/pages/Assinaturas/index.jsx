import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { useAuth } from '../../utils/auth.jsx';
import { TypeBadge } from '../../components/Badge.jsx';

export default function Assinaturas() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  
  // Extrai o tipo da URL (?type=RNC ou ?type=RHE)
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type') || 'RNC';

  const load = async () => {
    setLoading(true);
    try {
      let data = [];
      if (type === 'RHE') {
        data = await api.getRheSignaturesPending();
      } else {
        data = await api.getSignaturesPending();
      }
      setPending(data);
    } catch (err) {
      console.error('Erro ao carregar assinaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [type]);

  const handleSign = async (docId, role) => {
    const label = type === 'RHE' ? 'RHE' : 'documento';
    if (!window.confirm(`Deseja realizar a assinatura formal para o ${label} ${docId} como ${role}?`)) return;
    
    setSigning(true);
    try {
      if (type === 'RHE') {
        await api.signRhe(docId, role);
      } else {
        await api.signDocument(docId, role);
      }
      await load(); 
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
          <h1 className="page-title">Centro de Assinaturas ({type})</h1>
          <p className="page-subtitle">Aprovação técnica de documentos pendentes</p>
        </div>
      </header>

      <div className="card" style={{ padding: 0 }}>
        {pending.length === 0 ? (
          <div className="p-16 text-center">
            <h3 style={{ color: 'var(--text-sub)' }}>Nenhuma assinatura pendente de {type} no momento.</h3>
            <p className="text-sub">Todos os seus documentos estão em dia.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Identificação</th>
                <th>Tipo/Fase</th>
                <th>Fornecedor</th>
                <th>Cargos Pendentes</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong style={{ fontSize: '14px' }}>
                      {type === 'RHE' ? item.codigo_formulario || item.numero_rhe : item.code}
                    </strong>
                  </td>
                  <td>
                    {type === 'RHE' ? (
                      <span className="badge badge--info">{item.phase}</span>
                    ) : (
                      <TypeBadge type={item.doc_type} />
                    )}
                  </td>
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
                      onClick={() => handleSign(type === 'RHE' ? item.rhe_id : item.document_id, item.role)}
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
