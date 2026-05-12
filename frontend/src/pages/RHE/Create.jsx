import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';

export default function RHECreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryPhase = new URLSearchParams(location.search).get('phase');

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phase: queryPhase || 'INITIAL',
    object_type: 'SUPPLIER',
    supplier_id: '',
    packaging_id: '',
    production_line: '',
    related_initial_rhe_id: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Hardening: Converte strings vazias em null para satisfazer o Postgres (UUID)
      const payload = {
        ...form,
        related_initial_rhe_id: form.related_initial_rhe_id || null,
        supplier_id: form.supplier_id || null,
        packaging_id: form.packaging_id || null
      };

      const rhe = await api.post('/rhes', payload);
      // Após criar o RHE, inicializamos o checklist padrão
      const items = form.phase === 'INITIAL' 
        ? ['DOC_VALIDATION', 'TECH_SAMPLES', 'INITIAL_AUDIT']
        : ['STABILITY_TEST', 'PERFORMANCE_RUN', 'FINAL_DECISION'];
      
      await api.post(`/rhes/${rhe.id}/checklist`, {
        items: items.map(id => ({ item_id: id, approved: false }))
      });

      navigate(`/rhes/${rhe.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <button className="btn-ghost" style={{ minWidth: '120px' }} onClick={() => navigate('/rhes')}>Voltar</button>
        <div style={{ flex: 1, marginLeft: '1.5rem' }}>
          <h1 className="page-title">Novo Processo de Homologação</h1>
          <p className="page-subtitle">Abertura de RHE Inicial ou Final</p>
        </div>
      </header>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>
        <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Fase do Processo</label>
            <select 
              className="form-input" 
              value={form.phase}
              onChange={e => setForm({...form, phase: e.target.value})}
              required
              disabled={!!queryPhase}
              style={queryPhase ? { background: '#f8fafc', cursor: 'not-allowed' } : {}}
            >
              <option value="INITIAL">Fase Inicial (Técnica)</option>
              <option value="FINAL">Fase Final (Estabilidade/Desempenho)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Objeto</label>
            <select 
              className="form-input" 
              value={form.object_type}
              onChange={e => setForm({...form, object_type: e.target.value})}
              required
            >
              <option value="SUPPLIER">Fornecedor</option>
              <option value="PACKAGING">Embalagem</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">
              {form.object_type === 'SUPPLIER' ? 'Fornecedor' : 'Fornecedor da Embalagem'}
            </label>
            <select 
              className="form-input" 
              value={form.supplier_id}
              onChange={e => setForm({...form, supplier_id: e.target.value})}
              required
            >
              <option value="">Selecione um fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {form.object_type === 'PACKAGING' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Identificação da Embalagem (Cód. ou Descrição)</label>
              <input 
                className="form-input" 
                placeholder="Ex: Frasco 500ml PET, Tampa Flip-top, etc"
                value={form.packaging_id || ''}
                onChange={e => setForm({...form, packaging_id: e.target.value})}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Linha de Envase / Produção</label>
            <input 
              className="form-input" 
              placeholder="Ex: Linha 01, Envase Pet, etc"
              value={form.production_line}
              onChange={e => setForm({...form, production_line: e.target.value})}
              required
            />
          </div>

          {form.phase === 'FINAL' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">ID do RHE Inicial Aprovado (Herança de Dados)</label>
              <div className="flex gap-2">
                <input 
                  className="form-input" 
                  style={{ flex: 1 }}
                  placeholder="UUID do processo inicial"
                  value={form.related_initial_rhe_id}
                  onChange={e => setForm({...form, related_initial_rhe_id: e.target.value})}
                  onBlur={async (e) => {
                    const id = e.target.value;
                    if (id && id.length > 30) {
                      try {
                        const initial = await api.get(`/rhes/${id}`);
                        if (initial) {
                          setForm(prev => ({
                            ...prev,
                            object_type: initial.object_type,
                            supplier_id: initial.supplier_id,
                            production_line: initial.production_line
                          }));
                        }
                      } catch (err) {
                        console.error('Falha ao herdar dados:', err);
                      }
                    }
                  }}
                  required
                />
              </div>
              <small className="text-hint" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Dica: Ao colar o ID e sair do campo, os dados do fornecedor e linha serão preenchidos automaticamente.
              </small>
            </div>
          )}

          <div className="form-actions" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary w-full" disabled={loading} style={{ padding: '0.85rem', fontSize: '14px' }}>
              {loading ? 'Criando...' : 'Iniciar Homologação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
