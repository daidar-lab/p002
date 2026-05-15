import crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../config/db.js';
import RheRepository from '../repositories/RheRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_RHE_ROOT = path.join(__dirname, '../../uploads/rhe');

const CHECKLIST_TEMPLATES = {
  INITIAL: ['DOC_VALIDATION', 'TECH_SAMPLES', 'INITIAL_AUDIT'],
  FINAL: ['STABILITY_TEST', 'PERFORMANCE_RUN', 'FINAL_DECISION']
};

/** Mesmos papéis do fluxo RNC (assinaturas paralelas). */
export const RHE_SIGNATURE_ROLES = [
  'QUALITY_ANALYST',
  'QUALITY_COORDINATOR',
  'CGI',
  'LOGISTICS',
  'PCP'
];

function toDateString(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function firstDefined(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return null;
}

function normalizeObservacoesTecnicas(row) {
  const v = firstDefined(row, ['observacoes_tecnicas', 'observacoes_tecnicas_json']);
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'object' && v !== null) return [JSON.stringify(v)];
  if (typeof v === 'string') {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.map(String);
    } catch {
      /* ignore */
    }
    return v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function mapPhotoRow(p) {
  return {
    nome: firstDefined(p, ['nome', 'titulo', 'label', 'photo_name', 'name']) ?? null,
    url: firstDefined(p, ['url', 'file_url', 'storage_path', 'path']) ?? null,
    descricao: firstDefined(p, ['descricao', 'description', 'comment']) ?? null
  };
}

function mapParecerFinalStatus(status) {
  if (status === 'INITIAL_APPROVED' || status === 'FINAL_APPROVED') return 'APPROVED';
  if (status === 'REPROVED') return 'REJECTED';
  return 'PENDING';
}

function pickNumeroRhe(row) {
  const n = firstDefined(row, ['numero_rhe', 'numero', 'rhe_numero']);
  if (n != null) return typeof n === 'number' ? n : parseInt(String(n), 10) || null;
  const code = row.code;
  if (typeof code === 'string') {
    const m = code.match(/(\d+)\s*$/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function pickMes(row) {
  const m = firstDefined(row, ['mes', 'rhe_mes']);
  if (m == null) return null;
  const n = typeof m === 'number' ? m : parseInt(String(m), 10);
  return Number.isFinite(n) ? n : null;
}

function pickAno(row) {
  const a = firstDefined(row, ['ano', 'rhe_ano']);
  if (a == null) return null;
  let n = typeof a === 'number' ? a : parseInt(String(a), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 100) n += 2000;
  return n;
}

function pickWorkflowFields(row) {
  return {
    id: row.id,
    phase: row.phase,
    status: row.status,
    supplier_id: row.supplier_id,
    packaging_id: row.packaging_id,
    production_line: row.production_line,
    object_type: row.object_type,
    related_initial_rhe_id: row.related_initial_rhe_id,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    gate_executed_by: row.gate_executed_by,
    gate_executed_at: row.gate_executed_at,
    supplier_name: row.supplier_name,
    creator_name: row.creator_name,
    gate_executor_name: row.gate_executor_name
  };
}

function buildRheViewDto(row, photoRows = []) {
  const identificacao = {
    codigo_formulario: firstDefined(row, ['codigo_formulario', 'formulario_codigo']) ?? null,
    versao: firstDefined(row, ['versao', 'formulario_versao']) ?? null,
    data_emissao: toDateString(firstDefined(row, ['data_emissao', 'formulario_data_emissao'])),
    unidade: firstDefined(row, ['unidade', 'rhe_unidade']) ?? null,
    mes: pickMes(row),
    ano: pickAno(row),
    numero_rhe: pickNumeroRhe(row),
    titulo: firstDefined(row, ['titulo', 'titulo_rhe', 'rhe_titulo']) ?? null,
    tipo_homologacao: firstDefined(row, ['tipo_homologacao', 'homologacao_tipo']) ?? null,
    linha_envase: firstDefined(row, ['linha_envase', 'linha_de_envase']) ?? row.production_line ?? null
  };

  const fornecedor_produto = {
    embalagem: firstDefined(row, ['embalagem']) ?? null,
    produto: firstDefined(row, ['produto', 'tipo_produto', 'produto_tipo']) ?? null,
    fornecedor: firstDefined(row, ['fornecedor']) ?? null,
    data_fabricacao: toDateString(firstDefined(row, ['data_fabricacao'])),
    validade: toDateString(firstDefined(row, ['validade', 'data_validade'])),
    lote: firstDefined(row, ['lote']) ?? null,
    quantidade_recebida_kg: (() => {
      const q = firstDefined(row, ['quantidade_recebida_kg', 'quantidade_recebida']);
      if (q == null) return null;
      const n = typeof q === 'number' ? q : parseFloat(String(q).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    })(),
    nota_fiscal: firstDefined(row, ['nota_fiscal', 'nf', 'numero_nota_fiscal']) ?? null
  };

  const resultados = {
    descricao: firstDefined(row, ['resultados_descricao', 'descricao_resultados', 'avaliacao_resultados', 'descricao']) ?? null,
    data_recebimento: toDateString(firstDefined(row, ['data_recebimento'])),
    data_teste: toDateString(firstDefined(row, ['data_teste'])),
    linha_teste: firstDefined(row, ['linha_teste']) ?? null,
    observacoes_tecnicas: normalizeObservacoesTecnicas(row),
    fotos: (photoRows || []).map(mapPhotoRow)
  };

  const resumo = firstDefined(row, ['conclusao_resumo', 'resumo_conclusao', 'conclusoes_finais', 'conclusao_texto']);
  const proximaFase = firstDefined(row, ['proxima_fase']);
  const qtdReq = firstDefined(row, ['quantidade_requerida_kg', 'quantidade_requerida']);
  const conclusao =
    resumo != null || proximaFase != null || qtdReq != null
      ? {
          resumo: resumo ?? null,
          proxima_fase: proximaFase ?? null,
          quantidade_requerida_kg:
            qtdReq != null
              ? (typeof qtdReq === 'number' ? qtdReq : parseFloat(String(qtdReq).replace(',', '.')) || null)
              : null
        }
      : null;

  const parecerData = toDateString(
    firstDefined(row, ['parecer_final_data', 'parecer_data']) ??
      (['INITIAL_APPROVED', 'FINAL_APPROVED', 'REPROVED'].includes(row.status) ? row.gate_executed_at : null)
  );
  const internalStatus = row.status;
  const mapped = mapParecerFinalStatus(internalStatus);
  const parecer_final = mapped !== 'PENDING' ? { status: mapped, data: parecerData } : null;

  return {
    identificacao,
    fornecedor_produto,
    resultados,
    conclusao,
    parecer_final
  };
}

function flattenRheBodyToColumns(body) {
  const u = {};
  if (body.identificacao) {
    const i = body.identificacao;
    const keys = [
      'codigo_formulario',
      'versao',
      'data_emissao',
      'unidade',
      'mes',
      'ano',
      'numero_rhe',
      'titulo',
      'tipo_homologacao',
      'linha_envase'
    ];
    for (const k of keys) {
      if (i[k] !== undefined) u[k] = i[k];
    }
    if (i.linha_envase !== undefined) u.production_line = i.linha_envase;
  }
  if (body.fornecedor_produto) {
    const f = body.fornecedor_produto;
    for (const k of [
      'embalagem',
      'produto',
      'fornecedor',
      'data_fabricacao',
      'validade',
      'lote',
      'quantidade_recebida_kg',
      'nota_fiscal'
    ]) {
      if (f[k] !== undefined) u[k] = f[k];
    }
  }
  if (body.resultados) {
    const r = body.resultados;
    if (r.descricao !== undefined) u.resultados_descricao = r.descricao;
    if (r.data_recebimento !== undefined) u.data_recebimento = r.data_recebimento;
    if (r.data_teste !== undefined) u.data_teste = r.data_teste;
    if (r.linha_teste !== undefined) u.linha_teste = r.linha_teste;
    if (r.observacoes_tecnicas !== undefined) {
      u.observacoes_tecnicas = Array.isArray(r.observacoes_tecnicas)
        ? JSON.stringify(r.observacoes_tecnicas)
        : r.observacoes_tecnicas;
    }
  }
  if (body.conclusao) {
    const c = body.conclusao;
    if (c.resumo !== undefined) u.conclusao_resumo = c.resumo;
    if (c.proxima_fase !== undefined) u.proxima_fase = c.proxima_fase;
    if (c.quantidade_requerida_kg !== undefined) u.quantidade_requerida_kg = c.quantidade_requerida_kg;
  }
  return u;
}

function assertContentEditable(rhe) {
  if (!rhe) throw new Error('RHE não encontrado.');
  if (rhe.status !== 'DRAFT') {
    throw new Error('Só é permitido editar conteúdo enquanto o status for DRAFT.');
  }
}

function calculateRheSignHash(rheId, role, userId) {
  const source = `RHE-${rheId}-${role}-${userId}-${new Date().toISOString()}`;
  return crypto.createHash('sha256').update(source).digest('hex');
}

class RheService {
  /**
   * BR-01: Criação de RHE (Fase Inicial ou Final)
   */
  async createRhe(data, userId) {
    if (data.phase === 'FINAL') {
      if (!data.related_initial_rhe_id) {
        throw new Error('Invariante BR-02: RHE_FINAL exige um RHE_INICIAL aprovado.');
      }

      const initialRhe = await RheRepository.getById(data.related_initial_rhe_id);
      if (!initialRhe || initialRhe.status !== 'INITIAL_APPROVED') {
        throw new Error('Fail Condition: RHE_INICIAL deve estar aprovado para iniciar a fase final.');
      }

      if (initialRhe.supplier_id !== data.supplier_id || initialRhe.object_type !== data.object_type) {
        throw new Error('Fail Condition: O objeto homologado deve ser imutável entre fases.');
      }

      // Herança de Dados (BR-03): Copia campos da fase inicial
      data.unidade = initialRhe.unidade;
      data.linha_envase = initialRhe.linha_envase;
      data.production_line = initialRhe.production_line;
      data.embalagem = initialRhe.embalagem;
      data.produto = initialRhe.produto;
      data.fornecedor = initialRhe.fornecedor;
      data.data_fabricacao = initialRhe.data_fabricacao;
      data.validade = initialRhe.validade;
      data.lote = initialRhe.lote;
      data.quantidade_recebida_kg = initialRhe.quantidade_recebida_kg;
      data.nota_fiscal = initialRhe.nota_fiscal;
      data.versao = initialRhe.versao;
    }

    // Automação: Título e Tipo baseados na fase
    const isInitial = data.phase === 'INITIAL';
    const autoTitle = isInitial ? 'Homologação Inicial' : 'Homologação Final';
    const autoType = autoTitle;

    // Gerar número automático global (sempre +1 da última)
    const lastNumQuery = `SELECT MAX(numero_rhe) as last_num FROM audit_quality.rhes`;
    const lastNumRes = await pool.query(lastNumQuery);
    const nextNum = (lastNumRes.rows[0].last_num || 0) + 1;

    // Mes/Ano iniciais baseados em "agora" (serão sobrescritos se data_emissao mudar no front)
    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = Number(String(now.getFullYear()).slice(-2));

    const rhe = await RheRepository.create({
      ...data,
      titulo: autoTitle,
      tipo_homologacao: autoType,
      mes,
      ano,
      numero_rhe: nextNum,
      created_by: userId
    });

    // Código formulário baseado no ID (como solicitado)
    await RheRepository.patchRhe(rhe.id, {
      codigo_formulario: String(rhe.id).slice(0, 8).toUpperCase(), // Usando parte do UUID para o código
      titulo: autoTitle,
      tipo_homologacao: autoType,
      mes,
      ano,
      numero_rhe: nextNum
    });

    return rhe;
  }

  /**
   * Atualiza campos do formulário RHE (DTO aninhado → colunas em rhes).
   */
  async updateRheContent(rheId, body) {
    console.log(`[RheService] updateRheContent for ${rheId}:`, JSON.stringify(body, null, 2));
    const rhe = await RheRepository.getById(rheId);
    assertContentEditable(rhe);
    const flat = flattenRheBodyToColumns(body);
    console.log(`[RheService] Flattened for patch:`, JSON.stringify(flat, null, 2));
    const row = await RheRepository.patchRhe(rheId, flat);
    return this.composeDetailFromRow(row);
  }

  /**
   * Inclui foto: `url` direto ou upload via `file_base64` + `filename` (grava em /uploads/rhe).
   */
  async addRhePhoto(rheId, body) {
    const rhe = await RheRepository.getById(rheId);
    assertContentEditable(rhe);

    const { nome, descricao, url: bodyUrl, file_base64, filename } = body || {};
    let url = bodyUrl;

    if (file_base64 && filename) {
      const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const dir = path.join(UPLOADS_RHE_ROOT, String(rheId));
      fs.mkdirSync(dir, { recursive: true });
      const abs = path.join(dir, safe);
      fs.writeFileSync(abs, Buffer.from(String(file_base64), 'base64'));
      const base = process.env.PUBLIC_API_BASE || 'http://localhost:3000';
      url = `${base.replace(/\/$/, '')}/api/files/rhe/${rheId}/${safe}`;
    }

    if (!url) {
      throw new Error('Informe url ou o par file_base64 + filename.');
    }

    await RheRepository.insertPhoto({
      rhe_id: rheId,
      nome: nome || null,
      url,
      descricao: descricao || null
    });

    const row = await RheRepository.getById(rheId);
    return this.composeDetailFromRow(row);
  }

  async updateRhePhotoDescription(photoId, descricao) {
    return RheRepository.updatePhotoDescription(photoId, descricao);
  }

  async deleteRhePhoto(photoId) {
    return RheRepository.deletePhoto(photoId);
  }

  async uploadParametrosRecebimento(rheId, body) {
    const rhe = await RheRepository.getById(rheId);
    assertContentEditable(rhe);

    const { file_base64, filename } = body || {};
    if (!file_base64 || !filename) throw new Error('File data required.');

    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = path.join(UPLOADS_RHE_ROOT, String(rheId));
    fs.mkdirSync(dir, { recursive: true });
    const abs = path.join(dir, `params_${safe}`);
    fs.writeFileSync(abs, Buffer.from(String(file_base64), 'base64'));
    const base = process.env.PUBLIC_API_BASE || 'http://localhost:3000';
    const url = `${base.replace(/\/$/, '')}/api/files/rhe/${rheId}/params_${safe}`;

    const row = await RheRepository.patchRhe(rheId, { parametros_recebimento_url: url });
    return this.composeDetailFromRow(row);
  }

  async getRheSignatureState(rheId) {
    const rhe = await RheRepository.getById(rheId);
    if (!rhe) throw new Error('RHE não encontrado.');
    const rows = await RheRepository.listRheSignatures(rheId);
    const canSign = rhe.phase === 'FINAL' && rhe.status === 'UNDER_REVIEW';
    const allSigned =
      RHE_SIGNATURE_ROLES.length > 0 &&
      RHE_SIGNATURE_ROLES.every((role) => rows.some((r) => r.role === role && r.status === 'SIGNED'));

    return {
      rheId,
      phase: rhe.phase,
      status: rhe.status,
      required_roles: [...RHE_SIGNATURE_ROLES],
      current_signatures: rows,
      can_sign: canSign,
      all_signed: allSigned,
      is_complete: allSigned
    };
  }

  async signRheSignature(rheId, role, userId, userRole) {
    if (!role) throw new Error('Papel (role) obrigatório.');
    if (userRole !== 'admin' && userRole !== role) {
      throw new Error('Você não pode assinar por este papel.');
    }

    const rhe = await RheRepository.getById(rheId);
    if (!rhe) throw new Error('RHE não encontrado.');
    if (rhe.phase !== 'FINAL' || rhe.status !== 'UNDER_REVIEW') {
      throw new Error('Assinaturas só são permitidas na fase final após aprovação do checklist (aguardando assinaturas).');
    }

    const rows = await RheRepository.listRheSignatures(rheId);
    const sig = rows.find((s) => s.role === role);
    if (!sig) throw new Error('Papel de assinatura não solicitado para este RHE.');
    if (sig.status === 'SIGNED') throw new Error('Assinatura já realizada.');

    const hash = calculateRheSignHash(rheId, role, userId);
    const updated = await RheRepository.markRheSignatureSigned(rheId, role, userId, hash);
    if (!updated) throw new Error('Não foi possível registrar a assinatura.');

    const after = await RheRepository.listRheSignatures(rheId);
    const allSigned = RHE_SIGNATURE_ROLES.every((r) =>
      after.some((s) => s.role === r && s.status === 'SIGNED')
    );
    if (allSigned) {
      await RheRepository.updateStatus(rheId, 'FINAL_APPROVED', userId);
    }

    const row = await RheRepository.getById(rheId);
    return this.composeDetailFromRow(row);
  }

  /**
   * BR-05: Validação de Checklist e Execução de Gate
   */
  async executeGate(rheId, userId, decision) {
    const rhe = await RheRepository.getById(rheId);
    if (!rhe) throw new Error('RHE não encontrado.');

    if (['INITIAL_APPROVED', 'FINAL_APPROVED', 'REPROVED', 'UNDER_REVIEW'].includes(rhe.status)) {
      throw new Error('Fail Condition: Gate já executado ou fluxo em assinaturas.');
    }

    const checklist = await RheRepository.getChecklist(rheId);
    const requiredItems = CHECKLIST_TEMPLATES[rhe.phase];

    const isComplete = requiredItems.every((reqId) =>
      checklist.some((item) => item.item_id === reqId && item.approved !== null)
    );

    if (!isComplete || checklist.length < requiredItems.length) {
      throw new Error('Fail Condition: Checklist incompleto bloqueia o gate.');
    }

    let nextStatus = '';
    if (decision === 'APPROVE') {
      if (rhe.phase === 'INITIAL') {
        nextStatus = 'INITIAL_APPROVED';
      } else {
        nextStatus = 'UNDER_REVIEW';
      }
    } else {
      nextStatus = 'REPROVED';
    }

    await RheRepository.updateStatus(rheId, nextStatus, userId);

    if (decision === 'APPROVE' && rhe.phase === 'FINAL') {
      try {
        await RheRepository.dispatchRheSignatures(rheId, RHE_SIGNATURE_ROLES);
      } catch (err) {
        console.error('[RHE] dispatch assinaturas:', err.message);
        throw err;
      }
    }

    const row = await RheRepository.getById(rheId);
    return this.composeDetailFromRow(row);
  }

  async saveChecklist(rheId, items) {
    const rhe = await RheRepository.getById(rheId);
    if (['INITIAL_APPROVED', 'FINAL_APPROVED', 'UNDER_REVIEW', 'REPROVED'].includes(rhe.status)) {
      throw new Error('Invariante BR-09: Checklist bloqueado para este status.');
    }

    const allowedItems = CHECKLIST_TEMPLATES[rhe.phase];
    const filteredItems = items.filter((i) => allowedItems.includes(i.item_id));

    return await RheRepository.saveChecklist(rheId, filteredItems);
  }

  async composeDetailFromRow(row) {
    if (!row) return null;
    const photos = await RheRepository.getPhotosByRheId(row.id);
    const checklist = await RheRepository.getChecklist(row.id);
    const signatures = await RheRepository.listRheSignatures(row.id);
    return {
      ...pickWorkflowFields(row),
      rhe: buildRheViewDto(row, photos),
      checklist,
      signatures
    };
  }

  async getRheDetail(rheId) {
    const row = await RheRepository.getById(rheId);
    if (!row) return null;
    return this.composeDetailFromRow(row);
  }

  async listRhes(filters = {}) {
    return await RheRepository.list(filters);
  }

  async getPendingByUser(userId, role) {
    return await RheRepository.getPendingByRole(role);
  }
}

export default new RheService();
