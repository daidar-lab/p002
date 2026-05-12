import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

export default function RHEDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rhe, setRhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const data = await api.get(`/rhes/${id}`);
      setRhe(data);
      setItems(data.checklist || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGate = async (decision) => {
    if (!window.confirm(`Deseja realmente confirmar esta decisão (${decision === 'APPROVE' ? 'APROVAR' : 'REPROVAR'})?`)) return;

    try {
      setSaving(true);
      // Primeiro salvamos o estado atual
      await api.post(`/rhes/${id}/checklist`, { items });
      
      // Depois executamos o gate com a decisão explícita
      const data = await api.post(`/rhes/${id}/gate`, { decision });
      setRhe(data);
      alert('Processo finalizado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao executar gate');
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (itemId) => {
    setItems(prev => prev.map(item => 
      item.item_id === itemId ? { ...item, approved: !item.approved } : item
    ));
  };

  const handleSaveChecklist = async () => {
    setSaving(true);
    try {
      await api.post(`/rhes/${id}/checklist`, { items });
      alert('Progresso salvo!');
      fetchDetail();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };


  const getLabel = (id) => {
    const labels = {
      'DOC_VALIDATION': 'Validação de Documentação',
      'TECH_SAMPLES':   'Avaliação de Amostras Técnicas',
      'INITIAL_AUDIT':  'Auditoria Inicial / Técnica',
      'STABILITY_TEST': 'Teste de Estabilidade',
      'PERFORMANCE_RUN': 'Corrida de Performance / Estabilidade',
      'FINAL_DECISION':  'Parecer Final de Homologação'
    };
    return labels[id] || id;
  };

  if (loading) return <div className="loading-state">Carregando detalhes...</div>;
  if (!rhe) return <div className="error-state">RHE não encontrado.</div>;

  const isLocked = ['INITIAL_APPROVED', 'FINAL_APPROVED', 'REPROVED'].includes(rhe.status);

  return (
    <div className="page" style={{ margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <button className="btn-ghost" style={{ minWidth: '120px' }} onClick={() => navigate('/rhes')}>Voltar</button>
        <div style={{ flex: 1, marginLeft: '1.5rem' }}>
          <h1 className="page-title">Relatório de Homologação (RHE)</h1>
          <p className="page-subtitle">ID: {rhe.id}</p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <>
              <button className="btn-secondary" style={{ minWidth: '150px' }} onClick={handleSaveChecklist} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Progresso'}
              </button>
              <button className="btn-danger" style={{ minWidth: '150px' }} onClick={() => handleGate('REJECT')} disabled={saving}>
                Reprovar RHE
              </button>
              <button className="btn-primary" style={{ minWidth: '150px' }} onClick={() => handleGate('APPROVE')} disabled={saving}>
                Aprovar RHE
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-1" style={{ padding: '1.5rem' }}>
          <h3 className="card-section-title">Informações Estruturais</h3>
          <div className="info-list">
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="text-sub">Fase:</span> <strong>{rhe.phase}</strong>
            </div>
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="text-sub">Status:</span> <span className="badge badge--primary">{rhe.status}</span>
            </div>
            <hr style={{ margin: '1rem 0', opacity: 0.1 }} />
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="text-sub">Objeto:</span> <strong>{rhe.object_type}</strong>
            </div>
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="text-sub">Fornecedor:</span> <strong>{rhe.supplier_name || 'N/A'}</strong>
            </div>
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="text-sub">Linha:</span> <strong>{rhe.production_line}</strong>
            </div>
            <hr style={{ margin: '1rem 0', opacity: 0.1 }} />
            <div className="info-row" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              Criado em: {new Date(rhe.created_at).toLocaleString()}
            </div>
            <div className="info-row" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              Por: {rhe.creator_name}
            </div>
          </div>
        </div>

        <div className="card col-span-2" style={{ padding: '1.5rem' }}>
          <h3 className="card-section-title">Checklist de Requisitos Técnicos</h3>
          <div className="checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map(item => (
              <div key={item.item_id} className={`card ${item.approved ? 'border-success' : ''}`} style={{ padding: '1rem', background: item.approved ? 'var(--blue-soft)' : 'transparent' }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{getLabel(item.item_id)}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={item.approved} 
                      onChange={() => toggleItem(item.item_id)}
                      disabled={isLocked}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <input 
                  className="form-input mt-2" 
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  placeholder="Referência de evidência ou comentário técnico"
                  value={item.evidence_ref || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems(prev => prev.map(i => 
                      i.item_id === item.item_id ? { ...i, evidence_ref: val } : i
                    ));
                  }}
                  disabled={isLocked}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
