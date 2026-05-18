import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../utils/auth.jsx';
import RheSignatures from '../../components/RheSignatures.jsx';

function fmt(v) {
  if (v == null || v === '') return '—';
  return String(v);
}

const STATUS_LABELS = {
  'DRAFT': 'Rascunho',
  'INITIAL_APPROVED': 'Inicial Aprovada',
  'FINAL_APPROVED': 'Final Aprovada',
  'UNDER_REVIEW': 'Aguardando Assinaturas',
  'REPROVED': 'Reprovada'
};

const getStatusClass = (status) => {
  switch (status) {
    case 'DRAFT': return 'badge-draft';
    case 'INITIAL_APPROVED': return 'badge-approved';
    case 'FINAL_APPROVED': return 'badge-approved';
    case 'UNDER_REVIEW': return 'badge-review';
    case 'REPROVED': return 'badge-danger';
    default: return 'badge-draft';
  }
};

// Componente para edição segura com confirmação
function SafeInput({ label, value, onChange, type = 'text', readOnly = false, options = null, textArea = false, gridSpan = 1 }) {
  const [isEditing, setIsEditing] = React.useState(false);

  const handleClick = () => {
    if (readOnly || isEditing) return;
    const hasValue = value != null && String(value).trim() !== '' && String(value) !== '—';
    if (!hasValue || window.confirm(`Deseja alterar o campo "${label}"?`)) {
      setIsEditing(true);
    }
  };

  const containerStyle = {
    gridColumn: gridSpan > 1 ? `span ${gridSpan}` : 'auto',
  };

  return (
    <div className="form-group" style={containerStyle}>
      {label && <label className="form-label">{label}</label>}
      {isEditing ? (
        options ? (
          <select
            className="form-input"
            autoFocus
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Selecione...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : textArea ? (
          <textarea
            className="form-input"
            autoFocus
            rows={3}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={type}
            className="form-input"
            autoFocus
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
          />
        )
      ) : (
        <div
          className={`form-input form-input--static ${readOnly ? 'form-input--readonly' : ''}`}
          onClick={handleClick}
          style={{ cursor: readOnly ? 'default' : 'pointer', minHeight: '40px' }}
        >
          {fmt(value)}
        </div>
      )}
    </div>
  );
}

function emptyForm() {
  return {
    identificacao: {
      codigo_formulario: '',
      versao: '',
      data_emissao: '',
      unidade: '',
      mes: '',
      ano: '',
      numero_rhe: '',
      titulo: '',
      tipo_homologacao: '',
      linha_envase: ''
    },
    fornecedor_produto: {
      embalagem: '',
      produto: '',
      fornecedor: '',
      data_fabricacao: '',
      validade: '',
      lote: '',
      quantidade_recebida_kg: '',
      nota_fiscal: ''
    },
    resultados: {
      descricao: '',
      data_recebimento: '',
      data_teste: '',
      linha_teste: '',
      observacoes_tecnicas: ''
    },
    conclusao: {
      resumo: '',
      proxima_fase: '',
      quantidade_requerida_kg: '',
      data: ''
    }
  };
}

function mergeRheIntoForm(rhe) {
  const d = emptyForm();
  if (!rhe) return d;
  if (rhe.identificacao) Object.assign(d.identificacao, rhe.identificacao);
  if (rhe.fornecedor_produto) Object.assign(d.fornecedor_produto, rhe.fornecedor_produto);
  if (rhe.resultados) {
    Object.assign(d.resultados, rhe.resultados);
    const o = rhe.resultados.observacoes_tecnicas;
    d.resultados.observacoes_tecnicas = Array.isArray(o) ? o.join('\n') : o || '';
  }
  if (rhe.conclusao) Object.assign(d.conclusao, rhe.conclusao);
  return d;
}

export default function RHEDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const fetchSuppliers = async () => {
    try {
      const list = await api.getSuppliers();
      setSuppliers(list.rows || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchDetail = useCallback(async (skipForm = false) => {
    try {
      const res = await api.get(`/rhes/${id}`);
      setData(res);
      setItems(res.checklist || []);
      // Se skipForm for true, não sobrescrevemos o estado local do formulário
      // Isso evita que o usuário perca o que digitou mas ainda não salvou no botão "Salvar Alterações"
      if (res.rhe && !skipForm) setForm(mergeRheIntoForm(res.rhe));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
  }, [fetchDetail]);

  const handleGate = async (decision) => {
    if (!window.confirm(`Deseja realmente confirmar esta decisão (${decision === 'APPROVE' ? 'APROVAR' : 'REPROVAR'})?`)) return;

    if (!isFormComplete()) {
      alert('Atenção: Todos os campos do formulário (Identificação, Produto e Resultados) devem estar preenchidos antes de Aprovar ou Reprovar.');
      return;
    }

    try {
      setSaving(true);
      // Salva o checklist uma última vez para garantir
      await api.post(`/rhes/${id}/checklist`, { items });

      const res = await api.post(`/rhes/${id}/gate`, { decision });
      setData(res);
      setItems(res.checklist || []);
      if (res.rhe) setForm(mergeRheIntoForm(res.rhe));

      alert(
        decision === 'APPROVE' && res.phase === 'INITIAL' && res.status === 'APPROVED'
          ? 'Checklist aprovado e Homologação Inicial concluída.' :
          decision === 'APPROVE' && res.phase === 'FINAL' && res.status === 'UNDER_REVIEW'
            ? 'Checklist aprovado. Fluxo segue para assinaturas paralelas.'
            : 'Processo atualizado com sucesso.'
      );
    } catch (err) {
      alert(err.message || 'Erro ao executar gate');
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (itemId) => {
    setItems((prev) =>
      prev.map((item) => (item.item_id === itemId ? { ...item, approved: !item.approved } : item))
    );
  };

  const isFormComplete = () => {
    const idf = form.identificacao;
    const fp = form.fornecedor_produto;
    const res = form.resultados;

    const required = [
      idf.codigo_formulario, idf.versao, idf.data_emissao, idf.unidade, idf.linha_envase,
      fp.embalagem, fp.produto, fp.fornecedor, fp.data_fabricacao, fp.validade, fp.lote, fp.quantidade_recebida_kg, fp.nota_fiscal,
      res.descricao, res.data_recebimento, res.data_teste, res.linha_teste
    ];

    if (data?.phase === 'FINAL') {
      const c = form.conclusao;
      required.push(c.resumo, c.proxima_fase, c.quantidade_requerida_kg, c.data);
    }

    return required.every(v => v != null && String(v).trim() !== '');
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      const obsRaw = form.resultados.observacoes_tecnicas || '';
      const observacoes_tecnicas = obsRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        identificacao: {
          ...form.identificacao,
          mes: form.identificacao.mes === '' ? null : Number(form.identificacao.mes),
          ano: form.identificacao.ano === '' ? null : Number(form.identificacao.ano),
          // numero_rhe agora é string (RHE...), não converter para Number
          numero_rhe: form.identificacao.numero_rhe || null
        },
        fornecedor_produto: {
          ...form.fornecedor_produto,
          quantidade_recebida_kg:
            form.fornecedor_produto.quantidade_recebida_kg === '' || form.fornecedor_produto.quantidade_recebida_kg == null
              ? null
              : (() => {
                const val = String(form.fornecedor_produto.quantidade_recebida_kg).replace(',', '.');
                const n = parseFloat(val);
                return isNaN(n) ? null : n;
              })()
        },
        resultados: {
          ...form.resultados,
          observacoes_tecnicas
        }
      };
      if (data && data.phase === 'FINAL') {
        payload.conclusao = {
          ...form.conclusao,
          quantidade_requerida_kg:
            form.conclusao.quantidade_requerida_kg === '' || form.conclusao.quantidade_requerida_kg == null
              ? null
              : (() => {
                const val = String(form.conclusao.quantidade_requerida_kg).replace(',', '.');
                const n = parseFloat(val);
                return isNaN(n) ? null : n;
              })()
        };
      }
      const updated = await api.patchRheContent(id, payload);

      // Salva também o checklist no mesmo clique
      await api.post(`/rhes/${id}/checklist`, { items });

      setData(updated);
      const newRheDto = updated.rhe || updated;
      if (newRheDto) setForm(mergeRheIntoForm(newRheDto));
      alert('Todas as informações (formulário e checklist) foram salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar formulário:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const desc = window.prompt('Informe uma descrição para esta foto:');
    if (desc === null) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setSaving(true);
        const dataUrl = reader.result;
        const base64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : null;
        if (!base64) throw new Error('Falha ao ler arquivo.');
        await api.postRhePhoto(id, {
          nome: f.name,
          filename: f.name,
          file_base64: base64,
          descricao: desc || ''
        });
        e.target.value = '';
        await fetchDetail();
      } catch (err) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleParamsPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setSaving(true);
        const dataUrl = reader.result;
        const base64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : null;
        if (!base64) throw new Error('Falha ao ler arquivo.');
        await api.uploadRheParams(id, {
          filename: f.name,
          file_base64: base64
        });
        e.target.value = '';
        await fetchDetail();
      } catch (err) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleUpdatePhotoDesc = async (photoId, oldDesc) => {
    const desc = window.prompt('Nova descrição:', oldDesc);
    if (desc === null || desc === oldDesc) return;
    try {
      setSaving(true);
      await api.patchRhePhotoDescription(photoId, desc);
      await fetchDetail();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Excluir esta foto?')) return;
    try {
      setSaving(true);
      await api.deleteRhePhoto(photoId);
      await fetchDetail();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getLabel = (itemId) => {
    const labels = {
      DOC_VALIDATION: 'Validação de Documentação',
      TECH_SAMPLES: 'Avaliação de Amostras Técnicas',
      INITIAL_AUDIT: 'Auditoria Inicial / Técnica',
      STABILITY_TEST: 'Teste de Estabilidade',
      PERFORMANCE_RUN: 'Corrida de Performance / Estabilidade',
      FINAL_DECISION: 'Parecer Final de Homologação'
    };
    return labels[itemId] || itemId;
  };

  const setIdent = (field, val) => {
    setForm((prev) => {
      const newIdent = { ...prev.identificacao, [field]: val };
      if (field === 'data_emissao' && val) {
        const d = new Date(val + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          newIdent.mes = d.getMonth() + 1;
          newIdent.ano = Number(String(d.getFullYear()).slice(-2));
        }
      }
      return { ...prev, identificacao: newIdent };
    });
  };

  const setFp = (field, val) => setForm((p) => ({ ...p, fornecedor_produto: { ...p.fornecedor_produto, [field]: val } }));
  const setRes = (k, v) => setForm((p) => ({ ...p, resultados: { ...p.resultados, [k]: v } }));
  const setConc = (k, v) => setForm((p) => ({ ...p, conclusao: { ...p.conclusao, [k]: v } }));

  if (loading) return <div className="loading-state">Carregando detalhes...</div>;
  if (!data || !data.rhe) return <div className="error-state">RHE não encontrado.</div>;

  const { rhe } = data;
  const fotos = Array.isArray(rhe.resultados?.fotos) ? rhe.resultados.fotos : [];
  const isDraft = data.status === 'DRAFT';
  const isFinalPhase = data.phase === 'FINAL';
  const canEditTechnicalFields = isDraft; // Permite editar se for rascunho, independente da fase
  const checklistLocked = !isDraft; // Mantém o checklist editável apenas em DRAFT
  const showSignatures = isFinalPhase;

  return (
    <div className="page" style={{ margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <button className="btn-ghost" style={{ minWidth: '120px' }} onClick={() => navigate('/rhes')}>Voltar</button>
        <div style={{ flex: 1, marginLeft: '1.5rem' }}>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Relatório de Homologação (RHE)</h1>
            <span className={`badge ${getStatusClass(data.status)}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
              {STATUS_LABELS[data.status] || data.status}
            </span>
          </div>
          <p className="page-subtitle">ID: {data.id}</p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <button className="btn-danger" style={{ minWidth: '150px' }} onClick={() => handleGate('REJECT')} disabled={saving}>Reprovar</button>
              <button className="btn-primary" style={{ minWidth: '150px' }} onClick={() => handleGate('APPROVE')} disabled={saving}>Aprovar</button>
            </>
          )}
        </div>
      </header>

      {/* Formulário Principal */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <div>
            <h3 className="card-section-title" style={{ margin: 0 }}>Informações da Homologação</h3>
            <p className="text-sub" style={{ fontSize: '12px' }}>Clique nos campos para editar (requer confirmação)</p>
          </div>
          {isDraft && (
            <button className="btn-primary" onClick={handleSaveForm} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</button>
          )}
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          <SafeInput label="Código formulário" value={form.identificacao.codigo_formulario} onChange={(v) => setIdent('codigo_formulario', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Versão" value={form.identificacao.versao} onChange={(v) => setIdent('versao', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Data emissão" type="date" value={form.identificacao.data_emissao} onChange={(v) => setIdent('data_emissao', v)} readOnly={isFinalPhase || !isDraft} />

          <SafeInput label="Unidade" value={form.identificacao.unidade} onChange={(v) => setIdent('unidade', v)} options={['Frutal', 'Petrópolis']} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Mês" value={form.identificacao.mes} readOnly />
          <SafeInput label="Ano" value={form.identificacao.ano} readOnly />

          <SafeInput label="Nº RHE (Auto)" value={form.identificacao.numero_rhe} readOnly />
          <SafeInput label="Título" value={form.identificacao.titulo} readOnly />
          <SafeInput label="Tipo Homologação" value={form.identificacao.tipo_homologacao} readOnly />

          <SafeInput label="Linha de envase" value={form.identificacao.linha_envase} onChange={(v) => setIdent('linha_envase', v)} gridSpan={3} readOnly={!canEditTechnicalFields} />

          <SafeInput label="Embalagem" value={form.fornecedor_produto.embalagem} onChange={(v) => setFp('embalagem', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Produto" value={form.fornecedor_produto.produto} onChange={(v) => setFp('produto', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput
            label="Fornecedor (Cadastro)"
            value={form.fornecedor_produto.fornecedor}
            onChange={(v) => setFp('fornecedor', v)}
            options={suppliers.map(s => s.name)}
            readOnly={!canEditTechnicalFields}
          />

          <SafeInput label="Data fabricação" type="date" value={form.fornecedor_produto.data_fabricacao} onChange={(v) => setFp('data_fabricacao', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Validade" type="date" value={form.fornecedor_produto.validade} onChange={(v) => setFp('validade', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Lote" value={form.fornecedor_produto.lote} onChange={(v) => setFp('lote', v)} readOnly={!canEditTechnicalFields} />

          <SafeInput label="Qtd. recebida (kg)" value={form.fornecedor_produto.quantidade_recebida_kg} onChange={(v) => setFp('quantidade_recebida_kg', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Nota fiscal" value={form.fornecedor_produto.nota_fiscal} onChange={(v) => setFp('nota_fiscal', v)} readOnly={!canEditTechnicalFields} />

          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Descrição / resultados</label>
              {isDraft && (
                <div className="flex gap-2">
                  <label className="text-primary" style={{ cursor: 'pointer', fontSize: '12px' }}>
                    [ {rhe.parametros_recebimento_url ? 'Trocar imagem parâmetros' : 'Anexar imagem parâmetros'} ]
                    <input type="file" accept="image/*" hidden onChange={handleParamsPhoto} />
                  </label>
                  <label className="text-primary" style={{ cursor: 'pointer', fontSize: '12px' }}>
                    [ {saving ? '...' : 'Anexar foto evidência'} ]
                    <input type="file" accept="image/*" hidden onChange={handlePhoto} />
                  </label>
                </div>
              )}
            </div>
            {rhe.resultados?.parametros_recebimento_url && (
              <div style={{ marginBottom: '1rem', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>
                <a href={rhe.resultados.parametros_recebimento_url} target="_blank" rel="noreferrer">
                  <img src={rhe.resultados.parametros_recebimento_url} alt="Parâmetros" style={{ maxHeight: '200px', display: 'block', margin: '0 auto' }} />
                </a>
              </div>
            )}
            <SafeInput label="" value={form.resultados.descricao} onChange={(v) => setRes('descricao', v)} textArea gridSpan={3} readOnly={!canEditTechnicalFields} />
          </div>

          <SafeInput label="Data recebimento" type="date" value={form.resultados.data_recebimento} onChange={(v) => setRes('data_recebimento', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Data teste" type="date" value={form.resultados.data_teste} onChange={(v) => setRes('data_teste', v)} readOnly={!canEditTechnicalFields} />
          <SafeInput label="Linha teste" value={form.resultados.linha_teste} onChange={(v) => setRes('linha_teste', v)} readOnly={!canEditTechnicalFields} />

          <SafeInput label="Observações técnicas" value={form.resultados.observacoes_tecnicas} onChange={(v) => setRes('observacoes_tecnicas', v)} textArea gridSpan={3} readOnly={!canEditTechnicalFields} />

          {data.phase === 'FINAL' && (
            <>
              <div className="form-group" style={{ gridColumn: 'span 3', borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary)' }}>Conclusão (Fase Final)</h4>
              </div>
              <SafeInput label="Resumo conclusão" value={form.conclusao.resumo} onChange={(v) => setConc('resumo', v)} textArea gridSpan={3} readOnly={!isDraft} />
              <SafeInput label="Próxima fase" value={form.conclusao.proxima_fase} onChange={(v) => setConc('proxima_fase', v)} readOnly={!isDraft} />
              <SafeInput label="Qtd. requerida (kg)" value={form.conclusao.quantidade_requerida_kg} onChange={(v) => setConc('quantidade_requerida_kg', v)} readOnly={!isDraft} />
              <SafeInput label="Data conclusão" type="date" value={form.conclusao.data} onChange={(v) => setConc('data', v)} readOnly={!isDraft} />
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 className="card-section-title">Checklist de Requisitos Técnicos</h3>
          <div className="checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item) => (
              <div
                key={item.item_id}
                className={`card ${item.approved ? 'border-success' : ''}`}
                style={{ padding: '1rem', background: item.approved ? 'var(--blue-soft)' : 'transparent', boxShadow: 'none', border: '1px solid #e2e8f0' }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{getLabel(item.item_id)}</span>
                  <label className="switch">
                    <input type="checkbox" checked={item.approved} onChange={() => toggleItem(item.item_id)} disabled={checklistLocked} />
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
                    setItems((prev) =>
                      prev.map((i) => (i.item_id === item.item_id ? { ...i, evidence_ref: val } : i))
                    );
                  }}
                  disabled={checklistLocked}
                />
              </div>
            ))}
          </div>

          {fotos.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <h3 className="card-section-title">Galeria de Evidências (Homologação)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {fotos.map((f, i) => (
                  <div key={i} className="card" style={{ padding: '0.75rem', background: '#f8fafc', boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      <img src={f.url} alt={f.nome} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }} />
                    </a>
                    <div style={{ fontSize: '12px', marginTop: '0.75rem', fontWeight: 500, color: 'var(--text-main)', textAlign: 'center' }}>
                      {f.descricao || 'Sem descrição'}
                    </div>
                    {isDraft && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                        <button onClick={() => handleUpdatePhotoDesc(f.id, f.descricao)} className="btn-ghost btn-small" style={{ fontSize: '11px' }}>Editar</button>
                        <button onClick={() => handleDeletePhoto(f.id)} className="btn-ghost btn-small" style={{ fontSize: '11px', color: '#ef4444' }}>Excluir</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSignatures && (
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <h3 className="card-section-title">Assinaturas Técnicas</h3>
              <RheSignatures rheId={id} userRole={user?.role} onChange={fetchDetail} />
            </div>
          )}

          {rhe.parecer_final && (
            <div style={{ marginTop: '2rem', background: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <h3 className="card-section-title" style={{ color: '#166534', border: 'none', marginBottom: '0.5rem' }}>Parecer Final do Sistema</h3>
              <div className="flex gap-8">
                <div><span className="text-sub">Resultado:</span> <strong style={{ color: '#166534' }}>{rhe.parecer_final.status}</strong></div>
                <div><span className="text-sub">Data da Decisão:</span> <strong>{fmt(rhe.parecer_final.data)}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
