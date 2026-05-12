import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export default function RHEList() {
  const [rhes, setRhes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRhes();
  }, []);

  const fetchRhes = async () => {
    try {
      const data = await api.get('/rhes');
      setRhes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'INITIAL_APPROVED': return 'badge--success';
      case 'FINAL_APPROVED':   return 'badge--primary';
      case 'REPROVED':         return 'badge--error';
      case 'DRAFT':            return 'badge--warning';
      default:                 return 'badge--neutral';
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Homologação (RHE)</h1>
          <p className="page-subtitle">Gestão de aprovação de fornecedores e embalagens</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/rhes/new')}>
          + Novo RHE
        </button>
      </header>

      {loading ? (
        <div className="loading-state">Carregando RHEs...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Objeto</th>
                <th>Fornecedor</th>
                <th>Fase</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rhes.map(rhe => (
                <tr key={rhe.id}>
                  <td className="text-mono text-small">{rhe.id.substring(0, 8)}...</td>
                  <td>{rhe.object_type}</td>
                  <td>{rhe.supplier_name || 'N/A'}</td>
                  <td>{rhe.phase}</td>
                  <td>
                    <span className={`badge ${getStatusClass(rhe.status)}`}>
                      {rhe.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-ghost" 
                      onClick={() => navigate(`/rhes/${rhe.id}`)}
                    >
                      ✏️ Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {rhes.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted">Nenhum RHE encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
