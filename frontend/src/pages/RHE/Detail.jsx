import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

export default function RHEDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const handleGate = async () => {
    if (!window.confirm('Deseja executar o Gate de Decisão? Após isso, o status será alterado e poderá ficar imutável.')) return;
    try {
      await api.post(`/rhes/${id}/gate`);
      fetchDetail();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-state">Carregando detalhes...</div>;
  if (!rhe) return <div className="error-state">RHE não encontrado.</div>;

  const isLocked = ['INITIAL_APPROVED', 'FINAL_APPROVED', 'REPROVED'].includes(rhe.status);

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/rhes')}>← Voltar</button>
        <div>
          <h1 className="page-title">Relatório de Homologação (RHE)</h1>
          <p className="page-subtitle">ID: {rhe.id}</p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <button className="btn-secondary" onClick={handleSaveChecklist} disabled={saving}>
              {saving ? 'Salvando...' : '💾 Salvar Progresso'}
            </button>
          )}
          <button className="btn-primary" onClick={handleGate} disabled={isLocked}>
            🎯 Executar Gate
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-1">
          <h3>Informações Estruturais</h3>
          <div className="info-list">
            <div className="info-row"><span>Fase:</span> <strong>{rhe.phase}</strong></div>
            <div className="info-row"><span>Status:</span> <span className="badge badge--primary">{rhe.status}</span></div>
            <div className="info-row"><span>Objeto:</span> <strong>{rhe.object_type}</strong></div>
            <div className="info-row"><span>Fornecedor:</span> <strong>{rhe.supplier_name || 'N/A'}</strong></div>
            <div className="info-row"><span>Linha:</span> <strong>{rhe.production_line}</strong></div>
            <hr />
            <div className="info-row"><span>Criado em:</span> {new Date(rhe.created_at).toLocaleString()}</div>
            <div className="info-row"><span>Por:</span> {rhe.creator_name}</div>
          </div>
        </div>

        <div className="card col-span-2">
          <h3>Checklist de Requisitos Técnicos</h3>
          <div className="checklist-container">
            {items.map(item => (
              <div key={item.item_id} className={`checklist-card ${item.approved ? 'checklist-card--approved' : ''}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold">{item.item_id}</span>
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
                  placeholder="Referência de evidência / Comentário"
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
