import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

export default function RHECreate() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phase: 'INITIAL',
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
      const data = await api.get('/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const rhe = await api.post('/rhes', form);
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
    <div className="page-container">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/rhes')}>← Voltar</button>
        <div>
          <h1 className="page-title">Novo Processo de Homologação</h1>
          <p className="page-subtitle">Abertura de RHE Inicial ou Final</p>
        </div>
      </header>

      <div className="card max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Fase do Processo</label>
            <select 
              className="form-input" 
              value={form.phase}
              onChange={e => setForm({...form, phase: e.target.value})}
              required
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

          <div className="form-group">
            <label className="form-label">Fornecedor</label>
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

          <div className="form-group">
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
            <div className="form-group">
              <label className="form-label">ID do RHE Inicial Aprovado</label>
              <input 
                className="form-input" 
                placeholder="UUID do processo inicial"
                value={form.related_initial_rhe_id}
                onChange={e => setForm({...form, related_initial_rhe_id: e.target.value})}
                required
              />
            </div>
          )}

          <div className="form-actions mt-6">
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Criando...' : '🚀 Iniciar Homologação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
