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

  // Estados EVIDENCE_SUBMISSION
  const [acrType, setAcrType] = useState('5_WHYS');
  const [fiveWhys, setFiveWhys] = useState(['', '', '', '', '']);
  const [ishikawa, setIshikawa] = useState({
    metodo: '', maquina: '', material: '', mao_de_obra: '', medida: '', ambiente: ''
  });
  const [rootCause, setRootCause] = useState('');
  const [capaType, setCapaType] = useState('CORRETIVA');
  const [capaDescription, setCapaDescription] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isObjective, setIsObjective] = useState(false);

  // Estados RVT_SCHEDULING
  const [selectedDate, setSelectedDate] = useState('');

  // Estados RVT_SIGNATURE
  const [signerName, setSignerName] = useState('');

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

  const handleSubmitEvidence = async (e) => {
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
          acr_type: acrType,
          acr_data: acrType === '5_WHYS' ? { levels: fiveWhys } : { categories: ishikawa },
          capa_type: capaType,
          capa_description: capaDescription,
          evidence_description: evidenceDescription,
          photo_url: photoUrl,
          is_objective: isObjective
        })
      });

      if (!res.ok) throw new Error('Erro ao submeter evidência');
      setSuccess(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDate = async (e) => {
    e.preventDefault();
    if (!selectedDate) return alert('Selecione uma data.');
    
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/portal/rvt/${token}/select-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedDate })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao agendar data');
      }
      setSuccess(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignRvt = async (e) => {
    e.preventDefault();
    if (!signerName) return alert('Informe seu nome completo para assinar.');
    
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/portal/rvt/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName })
      });
      if (!res.ok) throw new Error('Erro ao assinar relatório');
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
      <h1>Operação Concluída</h1>
      <p>Obrigado! Sua interação foi processada com sucesso e o acesso foi encerrado para sua segurança.</p>
    </div>
  );

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="badge">PORTAL DO FORNECEDOR</div>
        <h1>{data.code}</h1>
        <p className="supplier-name">{data.supplier_name}</p>
      </header>

      <main className="portal-content">
        {/* FLUXO: SUBMISSÃO DE EVIDÊNCIA (RNC) */}
        {data.scope === 'EVIDENCE_SUBMISSION' && (
          <>
            <section className="info-section">
              <h3>Resumo da Ocorrência</h3>
              <div className="card">
                <p><strong>Defeito:</strong> {data.defect_category}</p>
                <p><strong>Descrição:</strong> {data.rnc_description}</p>
              </div>

              <h3>1. Análise de Causa Raiz (ACR)</h3>
              <div className="card highlight">
                <label className="form-label">Selecione o Modelo de Análise:</label>
                <select className="form-input" value={acrType} onChange={(e) => setAcrType(e.target.value)} style={{ marginBottom: '1.5rem' }}>
                  <option value="5_WHYS">Modelo 5 Porquês (Análise de Causa)</option>
                  <option value="ISHIKAWA">Diagrama de Ishikawa (6Ms)</option>
                </select>

                {acrType === '5_WHYS' ? (
                  <div className="acr-5whys">
                    {[1, 2, 3, 4, 5].map((num, i) => (
                      <div key={num} className="form-group">
                        <label>Por que #{num}:</label>
                        <input type="text" className="form-input" placeholder={`Motivo da ocorrência #${num}`} value={fiveWhys[i]} onChange={(e) => {
                          const newWhys = [...fiveWhys];
                          newWhys[i] = e.target.value;
                          setFiveWhys(newWhys);
                        }} required={num === 1} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="acr-ishikawa">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {['metodo', 'maquina', 'material', 'mao_de_obra', 'medida', 'ambiente'].map(m => (
                        <div key={m} className="form-group">
                          <label>{m.replace('_', ' ').toUpperCase()}:</label>
                          <input type="text" className="form-input" value={ishikawa[m]} onChange={(e) => setIshikawa({ ...ishikawa, [m]: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Causa Raiz Final Identificada:</label>
                  <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Resuma a causa fundamental..." required rows={3} className="form-input" />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3>2. Plano de Ação e Evidência</h3>
              <form onSubmit={handleSubmitEvidence} className="evidence-form">
                <div className="form-group">
                  <label>Tipo de Ação (CAPA):</label>
                  <select value={capaType} onChange={(e) => setCapaType(e.target.value)}>
                    <option value="CORRETIVA">Ação Corretiva</option>
                    <option value="PREVENTIVA">Ação Preventiva</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Descrição da Ação Executada:</label>
                  <textarea className="form-input" value={capaDescription} onChange={(e) => setCapaDescription(e.target.value)} required rows={3} />
                </div>
                <div className="form-group">
                  <label>Evidências Técnicas:</label>
                  <textarea value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} required />
                </div>
                <button type="submit" disabled={submitting} className="btn-submit">
                  {submitting ? 'Enviando...' : 'Confirmar e Encerrar Submissão'}
                </button>
              </form>
            </section>
          </>
        )}

        {/* FLUXO: AGENDAMENTO DE RVT */}
        {data.scope === 'RVT_SCHEDULING' && !data.scheduled_date && (
          <section className="form-section">
            <div className="card highlight" style={{ textAlign: 'center' }}>
              <h2>Agendamento de Visita Técnica</h2>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Selecione uma data disponível dentro da janela acordada.</p>

              {(data.product_name || data.pauta || data.subjects_covered) && (
                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                  {data.product_name && <p style={{ margin: '0 0 0.5rem' }}><strong>Produto:</strong> {data.product_name}</p>}
                  {data.pauta && <p style={{ margin: '0 0 0.5rem' }}><strong>Pauta:</strong> {data.pauta}</p>}
                  {data.subjects_covered && <p style={{ margin: 0 }}><strong>Assuntos / escopo:</strong> {data.subjects_covered}</p>}
                </div>
              )}
              
              {data.linked_rncs && data.linked_rncs.length > 0 && (
                <div style={{ textAlign: 'left', background: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>RNCs VINCULADAS:</p>
                  {data.linked_rncs.map(rnc => (
                    <div key={rnc.code} style={{ fontSize: '13px', marginBottom: '4px' }}>
                      <strong>{rnc.code}</strong>: {rnc.description}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSelectDate}>
                <div className="form-group">
                  <label>Janela Disponível:</label>
                  <p><strong>{new Date(data.window_start).toLocaleDateString()}</strong> até <strong>{new Date(data.window_end).toLocaleDateString()}</strong></p>
                </div>
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>Sua escolha:</label>
                  <input type="date" className="form-input" value={selectedDate} min={data.window_start.split('T')[0]} max={data.window_end.split('T')[0]} onChange={e => setSelectedDate(e.target.value)} required />
                </div>
                <button type="submit" disabled={submitting} className="btn-submit" style={{ marginTop: '2rem' }}>
                  {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* FLUXO: ASSINATURA DE RVT */}
        {data.scope === 'RVT_SIGNATURE' && (
          <section className="form-section">
            <div className="card highlight">
              <h2>Revisão e Assinatura Técnica</h2>
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                <p><strong>Produto:</strong> {data.product_name}</p>
                <p><strong>Data da Visita:</strong> {new Date(data.visit_date).toLocaleDateString()}</p>
                <p style={{ marginTop: '1rem' }}><strong>Resumo da Conclusão:</strong></p>
                <p style={{ fontStyle: 'italic' }}>{data.conclusion}</p>
              </div>

              {data.linked_rncs && data.linked_rncs.length > 0 && (
                <div style={{ textAlign: 'left', background: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>RNCs VINCULADAS AO RELATÓRIO:</p>
                  {data.linked_rncs.map(rnc => (
                    <div key={rnc.code} style={{ fontSize: '12px', marginBottom: '4px' }}>
                      <strong>{rnc.code}</strong>: {rnc.description}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSignRvt}>
                <div className="form-group">
                  <label>Nome Completo do Representante:</label>
                  <input type="text" className="form-input" value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Digite seu nome como assinatura..." required />
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1rem' }}>
                  Ao assinar, você confirma a veracidade das informações contidas no relatório técnico de visita.
                </p>
                <button type="submit" disabled={submitting} className="btn-submit" style={{ marginTop: '2rem' }}>
                  {submitting ? 'Assinando...' : 'Assinar Digitalmente'}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default PortalFornecedor;
