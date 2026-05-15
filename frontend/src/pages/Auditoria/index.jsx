import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { TypeBadge, StatusBadge } from '../../components/Badge.jsx';
import { Pagination } from '../../components/Pagination.jsx';

export default function AuditoriaView() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments({ page, limit, search });
      setDocuments(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search]);

  const selectDocument = async (doc) => {
    setSelectedDoc(doc);
    try {
      const history = await api.getTimeline(doc.id);
      setTimeline(history);
    } catch (err) {
      console.error('Erro ao carregar timeline:', err);
    }
  };

  if (loading && documents.length === 0) return <div className="p-8">Carregando centro de auditoria...</div>;

  return (
    <div className="page-container" style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '400px 1fr' : '1fr', gap: '20px' }}>
      
      {/* ─── LISTA DE TODOS OS DOCUMENTOS ─────────────────────── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <header style={{ marginBottom: 16 }}>
          <h1 className="page-title">Centro de Auditoria</h1>
          <p className="page-subtitle">Histórico e Rastreabilidade Completa</p>
          <input 
            type="text" 
            placeholder="Buscar por código ou fornecedor..." 
            className="form-input"
            style={{ marginTop: 12, width: '100%' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {documents.map(doc => (
            <div 
              key={doc.id} 
              className={`nav-item ${selectedDoc?.id === doc.id ? 'nav-item--active' : ''}`}
              style={{ cursor: 'pointer', marginBottom: 8, padding: '12px' }}
              onClick={() => selectDocument(doc)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>{doc.code}</strong>
                <TypeBadge type={doc.type} />
              </div>
              <div className="text-sub" style={{ fontSize: '11px' }}>{doc.supplier_name || 'Sem fornecedor'}</div>
              <div style={{ marginTop: 8 }}><StatusBadge status={doc.status} /></div>
            </div>
          ))}
          
          <Pagination 
            currentPage={page} 
            totalItems={total} 
            itemsPerPage={limit} 
            onPageChange={setPage} 
          />
        </div>
      </div>

      {/* ─── VISÃO 360º DO DOCUMENTO ───────────────────────────── */}
      {selectedDoc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{selectedDoc.code}</h2>
                <div className="text-sub">Cadastrado em {new Date(selectedDoc.created_at).toLocaleDateString()}</div>
              </div>
              <StatusBadge status={selectedDoc.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Severidade</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge badge--gut-${(selectedDoc.severity || 'LOW').toLowerCase()}`}>{selectedDoc.severity}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Categoria de Defeito</div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{selectedDoc.defect_category}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Fornecedor</div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{selectedDoc.supplier_name}</div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: 8 }}>Descrição da Ocorrência</div>
              <p className="text-sub" style={{ fontSize: '14px', lineHeight: 1.6 }}>{selectedDoc.item_description}</p>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Evidência de Rastreabilidade (Timeline)</h3>
            <div className="timeline">
              {timeline.length === 0 ? (
                <div className="text-sub">Processando histórico inicial...</div>
              ) : (
                timeline.map((event, idx) => (
                  <div key={idx} style={{ 
                    paddingLeft: '24px', 
                    borderLeft: '2px solid #e2e8f0', 
                    paddingBottom: '24px',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: '12px', height: '12px', 
                      borderRadius: '50%', background: 'var(--blue)',
                      position: 'absolute', left: '-7px', top: '4px',
                      border: '2px solid #fff', boxShadow: '0 0 0 2px var(--blue-light)'
                    }} />
                    <div className="text-sub" style={{ fontSize: '11px', marginBottom: 4 }}>
                      {new Date(event.created_at).toLocaleString()} • <strong>{event.user_name || 'Sistema'}</strong>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{event.action}</div>
                    <div className="text-sub" style={{ fontSize: '13px', marginTop: 4 }}>{event.detail}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {!selectedDoc && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
          <div style={{ fontSize: '48px', marginBottom: 16 }}></div>
          <p>Selecione um documento para realizar a auditoria completa.</p>
        </div>
      )}
    </div>
  );
}
