import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../utils/auth.jsx';
import RheSignatures from '../../components/RheSignatures.jsx';

function fmt(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return String(v);
  return String(v);
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
      quantidade_requerida_kg: ''
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
      setSuppliers(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get(`/rhes/${id}`);
      setData(res);
      setItems(res.checklist || []);
      if (res.rhe) setForm(mergeRheIntoForm(res.rhe));
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

    try {
      setSaving(true);
      await api.post(`/rhes/${id}/checklist`, { items });

      const res = await api.post(`/rhes/${id}/gate`, { decision });
      setData(res);
      setItems(res.checklist || []);
      if (res.rhe) setForm(mergeRheIntoForm(res.rhe));
      alert(
        decision === 'APPROVE' && res.phase === 'FINAL' && res.status === 'UNDER_REVIEW'
          ? 'Checklist aprovado. Fluxo segue para assinaturas paralelas.'
          : 'Processo atualizado.'
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
          numero_rhe: form.identificacao.numero_rhe === '' ? null : Number(form.identificacao.numero_rhe)
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
      console.log('Retorno update:', updated);
      
      // Atualiza o estado central
      setData(updated);
      
      // Atualiza o formulário com o que veio do banco (RHE DTO)
      const newRheDto = updated.rhe || updated; 
      if (newRheDto) {
        setForm(mergeRheIntoForm(newRheDto));
      }
      
      alert('Dados salvos com sucesso!');
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
    if (desc === null) return; // Cancelou

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
      
      // Automação: Mês e Ano baseados na Data de Emissão
      if (field === 'data_emissao' && val) {
        const d = new Date(val + 'T12:00:00'); // T12:00:00 evita problemas de timezone
        if (!isNaN(d.getTime())) {
          newIdent.mes = d.getMonth() + 1;
          newIdent.ano = Number(String(d.getFullYear()).slice(-2));
        }
      }
      
      return { ...prev, identificacao: newIdent };
    });
  };

  const setFp = (field, val) => {
    setForm((prev) => ({
      ...prev,
      fornecedor_produto: { ...prev.fornecedor_produto, [field]: val }
    }));
  };
  
  const setRes = (k, v) => setForm((p) => ({ ...p, resultados: { ...p.resultados, [k]: v } }));
  const setConc = (k, v) => setForm((p) => ({ ...p, conclusao: { ...p.conclusao, [k]: v } }));

  if (loading) return <div className="loading-state">Carregando detalhes...</div>;
  if (!data || !data.rhe) return <div className="error-state">RHE não encontrado.</div>;

  const { rhe } = data;
  const idv = rhe.identificacao || {};
  const fp = rhe.fornecedor_produto || {};
  const res = rhe.resultados || {};
  const obs = Array.isArray(res.observacoes_tecnicas) ? res.observacoes_tecnicas : [];
  const fotos = Array.isArray(res.fotos) ? res.fotos : [];

  const isDraft = data.status === 'DRAFT';
  const checklistLocked = !isDraft;
  const showSignatures = data.phase === 'FINAL';

  return (
    <div className="page" style={{ margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <button className="btn-ghost" style={{ minWidth: '120px' }} onClick={() => navigate('/rhes')}>
          Voltar
        </button>
        <div style={{ flex: 1, marginLeft: '1.5rem' }}>
          <h1 className="page-title">Relatório de Homologação (RHE)</h1>
          <p className="page-subtitle">ID: {data.id}</p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <button className="btn-secondary" style={{ minWidth: '150px' }} onClick={handleSaveChecklist} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar checklist'}
              </button>
              <button className="btn-danger" style={{ minWidth: '150px' }} onClick={() => handleGate('REJECT')} disabled={saving}>
                Reprovar RHE
              </button>
              <button className="btn-primary" style={{ minWidth: '150px' }} onClick={() => handleGate('APPROVE')} disabled={saving}>
                Aprovar checklist
              </button>
            </>
          )}
        </div>
      </header>

      {isDraft && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 className="card-section-title">Editar formulário (persistido no banco)</h3>
          <p className="text-sub" style={{ marginBottom: '1rem', fontSize: '13px' }}>
            Preencha os blocos abaixo e clique em Salvar. Na fase final, inclua também a conclusão. Fotos: envio de arquivo (armazenado na API).
          </p>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Código formulário</label>
              <input className="form-input" value={form.identificacao.codigo_formulario || ''} onChange={(e) => setIdent('codigo_formulario', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Versão</label>
              <input className="form-input" value={form.identificacao.versao || ''} onChange={(e) => setIdent('versao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data emissão</label>
              <input type="date" className="form-input" value={form.identificacao.data_emissao || ''} onChange={(e) => setIdent('data_emissao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unidade</label>
              <select className="form-input" value={form.identificacao.unidade || ''} onChange={(e) => setIdent('unidade', e.target.value)}>
                <option value="">Selecione...</option>
                <option value="Frutal">Frutal</option>
                <option value="Petrópolis">Petrópolis</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mês</label>
              <input className="form-input" type="number" readOnly value={form.identificacao.mes ?? ''} style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Ano</label>
              <input className="form-input" type="number" readOnly value={form.identificacao.ano ?? ''} style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Nº RHE (Auto)</label>
              <input className="form-input" type="number" readOnly value={form.identificacao.numero_rhe ?? ''} style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Título</label>
              <input className="form-input" readOnly value={form.identificacao.titulo || ''} style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo Homologação</label>
              <input className="form-input" readOnly value={form.identificacao.tipo_homologacao || ''} style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Linha de envase</label>
              <input className="form-input" value={form.identificacao.linha_envase || ''} onChange={(e) => setIdent('linha_envase', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Embalagem</label>
              <input className="form-input" value={form.fornecedor_produto.embalagem || ''} onChange={(e) => setFp('embalagem', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Produto</label>
              <input className="form-input" value={form.fornecedor_produto.produto || ''} onChange={(e) => setFp('produto', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fornecedor</label>
              <select className="form-input" value={form.fornecedor_produto.fornecedor || ''} onChange={(e) => setFp('fornecedor', e.target.value)}>
                <option value="">Selecione...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data fabricação</label>
              <input type="date" className="form-input" value={form.fornecedor_produto.data_fabricacao || ''} onChange={(e) => setFp('data_fabricacao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Validade</label>
              <input type="date" className="form-input" value={form.fornecedor_produto.validade || ''} onChange={(e) => setFp('validade', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Lote</label>
              <input className="form-input" value={form.fornecedor_produto.lote || ''} onChange={(e) => setFp('lote', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Qtd. recebida (kg)</label>
              <input className="form-input" value={form.fornecedor_produto.quantidade_recebida_kg ?? ''} onChange={(e) => setFp('quantidade_recebida_kg', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nota fiscal</label>
              <input className="form-input" value={form.fornecedor_produto.nota_fiscal || ''} onChange={(e) => setFp('nota_fiscal', e.target.value)} />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Descrição / resultados</span>
                <label className="text-primary" style={{ cursor: 'pointer', fontSize: '12px' }}>
                  [ {rhe.parametros_recebimento_url ? 'Trocar imagem parâmetros' : 'Anexar imagem parâmetros'} ]
                  <input type="file" accept="image/*" hidden onChange={handleParamsPhoto} />
                </label>
              </label>
              {rhe.parametros_recebimento_url && (
                <div style={{ marginBottom: '1rem', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>
                   <a href={rhe.parametros_recebimento_url} target="_blank" rel="noreferrer">
                     <img src={rhe.parametros_recebimento_url} alt="Parâmetros" style={{ maxHeight: '200px', display: 'block', margin: '0 auto' }} />
                   </a>
                </div>
              )}
              <textarea className="form-input" rows={4} value={form.resultados.descricao || ''} onChange={(e) => setRes('descricao', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data recebimento</label>
              <input type="date" className="form-input" value={form.resultados.data_recebimento || ''} onChange={(e) => setRes('data_recebimento', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data teste</label>
              <input type="date" className="form-input" value={form.resultados.data_teste || ''} onChange={(e) => setRes('data_teste', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Linha teste</label>
              <input className="form-input" value={form.resultados.linha_teste || ''} onChange={(e) => setRes('linha_teste', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Observações técnicas (uma por linha)</label>
              <textarea className="form-input" rows={3} value={form.resultados.observacoes_tecnicas || ''} onChange={(e) => setRes('observacoes_tecnicas', e.target.value)} />
            </div>

            {data.phase === 'FINAL' && (
              <>
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label className="form-label">Conclusão — resumo</label>
                  <textarea className="form-input" rows={3} value={form.conclusao.resumo || ''} onChange={(e) => setConc('resumo', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Próxima fase</label>
                  <input className="form-input" value={form.conclusao.proxima_fase || ''} onChange={(e) => setConc('proxima_fase', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. requerida (kg)</label>
                  <input className="form-input" value={form.conclusao.quantidade_requerida_kg ?? ''} onChange={(e) => setConc('quantidade_requerida_kg', e.target.value)} />
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-primary" onClick={handleSaveForm} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar dados do formulário'}
            </button>
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
              {saving ? '...' : 'Anexar foto'}
              <input type="file" accept="image/*" hidden onChange={handlePhoto} />
            </label>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Bloco de Ações e Checklist */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 className="card-section-title">Checklist de Requisitos Técnicos</h3>
          <div className="checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item) => (
              <div
                key={item.item_id}
                className={`card ${item.approved ? 'border-success' : ''}`}
                style={{ padding: '1rem', background: item.approved ? 'var(--blue-soft)' : 'transparent' }}
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

          {showSignatures && (
            <div style={{ marginTop: '2rem' }}>
              <RheSignatures rheId={id} userRole={user?.role} onChange={fetchDetail} />
            </div>
          )}
        </div>

        {/* Bloco de Dados Preenchidos (Resumo) */}
        <div className="card" style={{ padding: '2rem' }}>
          <header style={{ marginBottom: '2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
            <h2 className="card-title" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>RESUMO DAS INFORMAÇÕES</h2>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
              <span>FASE: <strong>{data.phase}</strong></span>
              <span>STATUS: <strong className="text-primary">{data.status}</strong></span>
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            <section>
              <h3 className="card-section-title" style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Identificação</h3>
              <div className="info-list" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div className="info-row"><span className="text-sub">Unidade:</span> {fmt(idv.unidade)}</div>
                <div className="info-row"><span className="text-sub">Mês/Ano:</span> {fmt(idv.mes)}/{fmt(idv.ano)}</div>
                <div className="info-row"><span className="text-sub">Nº RHE:</span> {fmt(idv.numero_rhe)}</div>
                <div className="info-row"><span className="text-sub">Título:</span> {fmt(idv.titulo)}</div>
                <div className="info-row"><span className="text-sub">Tipo:</span> {fmt(idv.tipo_homologacao)}</div>
                <div className="info-row"><span className="text-sub">Formulário:</span> {fmt(idv.codigo_formulario)} {idv.versao ? `v${idv.versao}` : ''}</div>
                <div className="info-row"><span className="text-sub">Emissão:</span> {fmt(idv.data_emissao)}</div>
                <div className="info-row"><span className="text-sub">Linha envase:</span> {fmt(idv.linha_envase)}</div>
              </div>
            </section>

            <section>
              <h3 className="card-section-title" style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Fornecedor e Produto</h3>
              <div className="info-list" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div className="info-row"><span className="text-sub">Fornecedor (cadastro):</span> {data.supplier_name || 'N/A'}</div>
                <div className="info-row"><span className="text-sub">Fornecedor (texto):</span> {fmt(fp.fornecedor)}</div>
                <div className="info-row"><span className="text-sub">Produto:</span> {fmt(fp.produto)}</div>
                <div className="info-row"><span className="text-sub">Embalagem:</span> {fmt(fp.embalagem)}</div>
                <div className="info-row"><span className="text-sub">Fabr. / Val.:</span> {fmt(fp.data_fabricacao)} / {fmt(fp.validade)}</div>
                <div className="info-row"><span className="text-sub">Lote:</span> {fmt(fp.lote)}</div>
                <div className="info-row"><span className="text-sub">Qtd. (kg):</span> {fmt(fp.quantidade_recebida_kg)}</div>
                <div className="info-row"><span className="text-sub">NF:</span> {fmt(fp.nota_fiscal)}</div>
              </div>
            </section>

            <section>
              <h3 className="card-section-title" style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Checklist</h3>
              <div className="info-list" style={{ fontSize: '12px' }}>
                {items.length === 0 && <span className="text-hint">Nenhum item definido.</span>}
                {items.map(it => (
                  <div key={it.item_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{getLabel(it.item_id)}:</span>
                    <strong style={{ color: it.approved ? 'var(--success)' : 'var(--text-hint)' }}>
                      {it.approved ? 'APROVADO' : 'PENDENTE'}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3 className="card-section-title" style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Metadados</h3>
              <div className="info-list" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                <div className="info-row">Criado em: {data.created_at ? new Date(data.created_at).toLocaleString() : '—'}</div>
                <div className="info-row">Por: {data.creator_name || '—'}</div>
                <div className="info-row">Objeto: {data.object_type}</div>
                <div className="info-row">Linha: {data.production_line}</div>
              </div>
            </section>
          </div>

          <hr style={{ margin: '2rem 0', opacity: 0.1 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <section>
              <h3 className="card-section-title">Resultados e Avaliação</h3>
              <div className="info-list" style={{ fontSize: '13px' }}>
                <p style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{fmt(res.descricao)}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="info-row"><span className="text-sub">Recebimento:</span> {fmt(res.data_recebimento)}</div>
                  <div className="info-row"><span className="text-sub">Teste:</span> {fmt(res.data_teste)}</div>
                  <div className="info-row"><span className="text-sub">Linha teste:</span> {fmt(res.linha_teste)}</div>
                </div>
                {obs.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <span className="text-sub">Observações Técnicas:</span>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                      {obs.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section>
              {rhe.parametros_recebimento_url && (
                <div style={{ marginBottom: '1rem' }}>
                  <span className="text-sub" style={{ display: 'block', marginBottom: '0.5rem' }}>Parâmetros de Recebimento:</span>
                  <a href={rhe.parametros_recebimento_url} target="_blank" rel="noreferrer">
                    <img src={rhe.parametros_recebimento_url} alt="Parâmetros" style={{ width: '100%', borderRadius: '8px', border: '1px solid #eee' }} />
                  </a>
                </div>
              )}
            </section>
          </div>

          {fotos.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 className="card-section-title">Galeria de Homologação</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {fotos.map((f, i) => (
                  <div key={i} className="card" style={{ padding: '0.75rem', background: '#fcfcfc' }}>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      <img src={f.url} alt={f.nome} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                    </a>
                    <div style={{ fontSize: '11px', marginTop: '0.6rem', fontWeight: 500, color: 'var(--text-main)', textAlign: 'center' }}>
                      {f.descricao || 'Sem descrição'}
                    </div>
                    {isDraft && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', justifyContent: 'center' }}>
                        <button onClick={() => handleUpdatePhotoDesc(f.id, f.descricao)} className="btn-ghost" style={{ fontSize: '10px', padding: '2px 8px' }}>Editar</button>
                        <button onClick={() => handleDeletePhoto(f.id)} className="btn-ghost" style={{ fontSize: '10px', padding: '2px 8px', color: 'red' }}>Excluir</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(rhe.conclusao || rhe.parecer_final) && (
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              {rhe.conclusao && (
                <section>
                  <h3 className="card-section-title">Conclusão</h3>
                  <div className="info-list" style={{ fontSize: '13px' }}>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{fmt(rhe.conclusao.resumo)}</p>
                    <div className="info-row" style={{ marginTop: '0.5rem' }}>
                      <span className="text-sub">Próxima fase:</span> {fmt(rhe.conclusao.proxima_fase)}
                    </div>
                    <div className="info-row">
                      <span className="text-sub">Qtd. requerida (kg):</span> {fmt(rhe.conclusao.quantidade_requerida_kg)}
                    </div>
                  </div>
                </section>
              )}
              {rhe.parecer_final && (
                <section>
                  <h3 className="card-section-title">Parecer Final</h3>
                  <div className="info-list" style={{ fontSize: '13px' }}>
                    <div className="info-row"><span className="text-sub">Status:</span> <strong>{rhe.parecer_final.status}</strong></div>
                    <div className="info-row"><span className="text-sub">Data:</span> {fmt(rhe.parecer_final.data)}</div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
