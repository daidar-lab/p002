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

  // Estados do formulário soberano
  const [rootCause, setRootCause] = useState('');
  const [capaType, setCapaType] = useState('CORRETIVA');
  const [capaDescription, setCapaDescription] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
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
    if (!rootCause || !capaDescription || !evidenceDescription) {
      return alert('Por favor, preencha todos os campos obrigatórios.');
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/portal/evidence/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root_cause: rootCause,
          capa_type: capaType,
          capa_description: capaDescription,
          evidence_description: evidenceDescription,
          photo_url: photoUrl,
          is_objective: isObjective
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao submeter evidência');
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
      <h1>Submissão Concluída</h1>
      <p>Obrigado! Seus dados foram processados com sucesso e o acesso foi encerrado para sua segurança.</p>
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
          <h3>Resumo da Ocorrência</h3>
          <div className="card">
            <p><strong>Defeito:</strong> {data.defect_category}</p>
            <p><strong>Descrição:</strong> {data.rnc_description}</p>
          </div>

          <h3>1. Análise de Causa Raiz (ACR)</h3>
          <div className="card highlight">
            <label className="form-label">Descreva o motivo real da falha (Causa Raiz):</label>
            <textarea 
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Ex: Falha no sensor de temperatura durante o lote X..."
              required
              rows={4}
              style={{ width: '100%', marginTop: '8px' }}
            />
          </div>
        </section>

        <section className="form-section">
          <h3>2. Plano de Ação e Evidência</h3>
          <form onSubmit={handleSubmit} className="evidence-form">
            
            <div className="form-group">
              <label>Tipo de Ação (CAPA):</label>
              <select value={capaType} onChange={(e) => setCapaType(e.target.value)}>
                <option value="CORRETIVA">Ação Corretiva</option>
                <option value="PREVENTIVA">Ação Preventiva</option>
                <option value="PREDITIVA">Ação Preditiva</option>
              </select>
            </div>

            <div className="form-group">
              <label>Descrição da Ação Executada:</label>
              <input 
                type="text"
                value={capaDescription}
                onChange={(e) => setCapaDescription(e.target.value)}
                placeholder="Ex: Substituição do componente e recalibração..."
                required
              />
            </div>

            <div className="form-group">
              <label>Evidências Técnicas (Detalhes):</label>
              <textarea 
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="Liste laudos ou detalhes técnicos da ação..."
                required
              />
            </div>

            <div className="form-group">
              <label>URL de Foto/Anexo (Opcional):</label>
              <input 
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Link da imagem (Google Drive, Dropbox, etc.)..."
              />
            </div>

            <div className="form-group checkbox-group">
              <input 
                type="checkbox" 
                id="isObjective" 
                checked={isObjective}
                onChange={(e) => setIsObjective(e.target.checked)}
              />
              <label htmlFor="isObjective"> Confirmo que os dados acima são <strong>evidências objetivas</strong>.</label>
            </div>

            <button type="submit" disabled={submitting} className="btn-submit">
              {submitting ? 'Enviando...' : 'Confirmar e Encerrar Submissão'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default PortalFornecedor;
