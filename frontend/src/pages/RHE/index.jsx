import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';

const STATUS_LABELS = {
  'DRAFT': 'Rascunho',
  'INITIAL_APPROVED': 'Inicial Aprovada',
  'FINAL_APPROVED': 'Final Aprovada',
  'UNDER_REVIEW': 'Aguardando Assinaturas',
  'REPROVED': 'Reprovada'
};

const OBJECT_TYPE_LABELS = {
  'SUPPLIER': 'Fornecedor',
  'PACKAGING': 'Embalagem'
};

export default function RHEList() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryPhase = new URLSearchParams(location.search).get('phase') || 'INITIAL';

  const [rhes, setRhes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ supplier: '', status: '' });
  const limit = 10;

  useEffect(() => {
    setPage(1); // Reseta página ao mudar de fase
  }, [queryPhase]);

  useEffect(() => {
    fetchRhes();
  }, [queryPhase, page, filters.status]); // Recarrega se fase, página ou status mudar

  const fetchRhes = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        phase: queryPhase,
        limit,
        offset,
        supplier: filters.supplier,
        status: filters.status
      });
      const data = await api.get(`/rhes?${params.toString()}`);
      setRhes(data);
      setTotal(data[0]?.total_count || 0);
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
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Homologação (RHE) - {queryPhase === 'INITIAL' ? 'Fase Inicial' : 'Fase Final'}</h1>
          <p className="page-subtitle">Gestão de processos de aprovação técnica e operacional</p>
        </div>
        <button 
          className="btn-primary" 
          style={{ minWidth: '150px' }} 
          onClick={() => navigate(`/rhes/new?phase=${queryPhase}`)}
        >
          Novo RHE
        </button>
      </header>

      <div className="filters card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input 
          className="form-input" 
          style={{ flex: 1 }}
          placeholder="Pesquisar por fornecedor..."
          value={filters.supplier}
          onChange={e => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && fetchRhes()}
        />
        <select 
          className="form-input"
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">Todos os Status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button className="btn-secondary" onClick={fetchRhes}>Filtrar</button>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="loading-text">Buscando registros...</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Objeto</th>
                  <th>Fornecedor</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rhes.map(rhe => (
                  <tr key={rhe.id}>
                    <td className="text-mono text-small">{rhe.id.substring(0, 8)}...</td>
                    <td>{OBJECT_TYPE_LABELS[rhe.object_type] || rhe.object_type}</td>
                    <td>{rhe.supplier_name || 'N/A'}</td>
                    <td>
                      <span className={`badge ${getStatusClass(rhe.status)}`}>
                        {STATUS_LABELS[rhe.status] || rhe.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn-ghost" 
                        onClick={() => navigate(`/rhes/${rhe.id}`)}
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
                {rhes.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted" style={{ padding: '3rem' }}>
                      Nenhum processo de homologação encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {total > limit && (
              <div className="flex justify-between items-center" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                <span className="text-sub" style={{ fontSize: '12px' }}>Total: {total} registros</span>
                <div className="flex gap-2">
                  <button 
                    className="btn-ghost btn-small" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '13px' }}>Página {page}</span>
                  <button 
                    className="btn-ghost btn-small" 
                    disabled={page * limit >= total} 
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
