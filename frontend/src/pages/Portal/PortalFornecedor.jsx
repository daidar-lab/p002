import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './PortalFornecedor.css';

const PortalFornecedor = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Estados do formulário de evidência
  const [selectedCapa, setSelectedCapa] = useState('');
  const [description, setDescription] = useState('');
  const [isObjective, setIsObjective] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/portal/access/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Acesso negado ou link expirado');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCapa) return alert('Selecione uma CAPA');
    
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/portal/evidence/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capa_id: selectedCapa,
          description,
          is_objective: isObjective
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao submeter');
      }

      setSuccess(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="portal-loading">Validando acesso soberano...</div>;
  if (error) return <div className="portal-error"><h1>Acesso Negado</h1><p>{error}</p></div>;
  if (success) return (
    <div className="portal-success">
      <h1>Evidência Enviada</h1>
      <p>Sua submissão foi registrada com sucesso e o link foi invalidado por segurança.</p>
    </div>
  );

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="badge">PORTAL DO FORNECEDOR</div>
        <h1>RNC: {data.code}</h1>
        <p className="supplier-name">{data.supplier_name}</p>
      </header>

      <main className="portal-content">
        <section className="info-section">
          <h3>Resumo da Não Conformidade</h3>
          <div className="card">
            <p><strong>Defeito:</strong> {data.defect_category}</p>
            <p><strong>Descrição:</strong> {data.rnc_description}</p>
          </div>

          <h3>Análise de Causa Raiz</h3>
          <div className="card highlight">
            <p><strong>Causa Identificada:</strong> {data.root_cause}</p>
          </div>
        </section>

        <section className="form-section">
          <h3>Submissão de Evidência Técnica</h3>
          <form onSubmit={handleSubmit} className="evidence-form">
            <div className="form-group">
              <label>Selecione a Ação (CAPA):</label>
              <select 
                value={selectedCapa} 
                onChange={(e) => setSelectedCapa(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {data.capas?.map(capa => (
                  <option key={capa.id} value={capa.id}>
                    [{capa.type}] {capa.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descrição Detalhada da Evidência:</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva como a ação foi executada e quais as evidências objetivas..."
                required
              />
            </div>

            <div className="form-group checkbox-group">
              <input 
                type="checkbox" 
                id="isObjective" 
                checked={isObjective}
                onChange={(e) => setIsObjective(e.target.checked)}
              />
              <label htmlFor="isObjective"> Declaro que esta é uma <strong>evidência objetiva</strong> e verificável.</label>
            </div>

            <div className="disclaimer">
              <p>⚠️ <strong>Nota:</strong> Esta submissão é de uso único. Ao enviar, o acesso será encerrado e os dados serão processados pelo Motor de Eficácia do SGNC.</p>
            </div>

            <button type="submit" disabled={submitting} className="btn-submit">
              {submitting ? 'Enviando...' : 'Confirmar Submissão Técnica'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default PortalFornecedor;
