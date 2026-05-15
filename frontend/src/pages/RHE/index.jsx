import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pagination } from '../../components/Pagination.jsx';

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
      const res = await api.listRhes({
        phase: queryPhase,
        page,
        limit,
        supplier: filters.supplier,
        status: filters.status
      });
      setRhes(res.data);
      setTotal(res.total);
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

            <Pagination 
              currentPage={page} 
              totalItems={total} 
              itemsPerPage={limit} 
              onPageChange={setPage} 
            />
          </>
        )}
      </div>
    </div>
  );
}
