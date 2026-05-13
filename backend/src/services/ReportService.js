import PDFDocument from 'pdfkit';
import fs from 'fs';
import pool from '../config/db.js';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import DocumentRepository from '../repositories/DocumentRepository.js';
import RootCauseRepository from '../repositories/RootCauseRepository.js';
import CapaRepository from '../repositories/CapaRepository.js';
import EfficacyRepository from '../repositories/EfficacyRepository.js';
import SignatureService from './SignatureService.js';
import ReportRepository from '../repositories/ReportRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import S3Service from './S3Service.js';

class ReportService {
  /**
   * Consolida D1-D7 e gera Snapshot imutável (BR-PDF-01/02)
   * Agora integrado ao S3 (BR-S3-01/02/03)
   */
  /**
   * Coleta dados para visualização dinâmica (BR-XX-UI)
   */
  async get8DData(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    if (!doc) throw new Error('Documento não encontrado');

    const acr = await RootCauseRepository.findByDocumentId(documentId);
    const capas = await CapaRepository.findActiveByDocumentId(documentId);
    const sigStatus = await SignatureService.getHardenedState(documentId);
    let lastDecision = await EfficacyRepository.getLastDecision(documentId);

    // Busca Evidências vinculadas às CAPAs
    const capaIds = capas.map(c => c.id);
    let evidences = [];
    if (capaIds.length > 0) {
      const evRes = await pool.query(
        `SELECT * FROM audit_quality.capa_evidences WHERE capa_id = ANY($1)`,
        [capaIds]
      );
      evidences = evRes.rows;
    }

    // Fallback: Se não houver decisão mas o doc está concluído, persistimos uma decisão de migração
    if (!lastDecision && doc.status === 'CONCLUIDO') {
      lastDecision = await EfficacyRepository.saveDecision({
        document_id: documentId,
        decision: 'ENCERRAMENTO_DEFINITIVO',
        rules_applied: ['MIGRACAO_SISTEMA'],
        evidence_summary: 'Encerramento retroativo (Legado) para geração de relatório 8D.'
      });
    }

    return {
      document: doc,
      acr,
      capas: capas.map(c => ({
        ...c,
        evidences: evidences.filter(e => e.capa_id === c.id)
      })),
      signatures: sigStatus.current_signatures,
      decision: lastDecision,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Gera PDF On-the-fly sem persistência (BR-XX-PDF)
   */
  async generate8DStream(documentId, res) {
    const data = await this.get8DData(documentId);
    const { document: doc, acr, capas, signatures, decision } = data;

    const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Pipe imediato para evitar quebra de conexão (BR-XX-STREAM)
    pdfDoc.pipe(res);

    // Tratamento de Erro no Stream do PDFKit
    pdfDoc.on('error', (err) => {
      console.error('[PDF_GENERATION_ERROR]', err.message);
      if (!res.headersSent) {
        res.status(500).send('Erro na geração do PDF');
      }
      res.end();
    });

    try {
      // --- Estilos e Cabeçalho ---
      pdfDoc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text('RELATÓRIO DE INVESTIGAÇÃO 8D', { align: 'center' });
      pdfDoc.fontSize(10).font('Helvetica').text(`Documento de Qualidade: ${doc.code}`, { align: 'center' });
      pdfDoc.moveDown();
      pdfDoc.rect(50, pdfDoc.y, 500, 1.5).fill('#334155');
      pdfDoc.moveDown();

      // D1 - Identificação
      this._drawSection(pdfDoc, 'D1 – IDENTIFICAÇÃO DO PROBLEMA');
      pdfDoc.fontSize(10).fillColor('#000');
      pdfDoc.text(`Fornecedor: `, { continued: true }).font('Helvetica-Bold').text(doc.supplier_name || 'N/A').font('Helvetica');
      pdfDoc.text(`Categoria: `, { continued: true }).font('Helvetica-Bold').text(doc.defect_category).font('Helvetica');
      pdfDoc.text(`Data de Abertura: `, { continued: true }).font('Helvetica-Bold').text(new Date(doc.created_at).toLocaleDateString()).font('Helvetica');
      pdfDoc.moveDown(0.5);
      pdfDoc.text('Descrição da Ocorrência:', { font: 'Helvetica-Bold' });
      pdfDoc.fontSize(9).text(doc.item_description || 'Sem descrição detalhada.', { align: 'justify' });
      pdfDoc.moveDown();

      // D2 - ACR (Análise Estruturada)
      this._drawSection(pdfDoc, 'D2 – ANÁLISE DE CAUSA RAIZ (MÉTODO)');
      const acrMethod = acr?.type === '5_WHYS' ? '5 Porquês' : 'Ishikawa (6Ms)';
      pdfDoc.fontSize(10).text(`Método Aplicado: `, { continued: true }).font('Helvetica-Bold').text(acrMethod).font('Helvetica');
      pdfDoc.moveDown(0.5);

      if (acr?.type === '5_WHYS' && acr.data?.levels) {
        acr.data.levels.forEach((why, i) => {
          if (why) {
            pdfDoc.fontSize(9).fillColor('#475569').text(`${i + 1}º Por quê: `, { continued: true })
                  .fillColor('#000').text(why);
          }
        });
      } else if (acr?.type === 'ISHIKAWA' && acr.data?.categories) {
        const cats = acr.data.categories;
        const labels = { metodo: 'Método', maquina: 'Máquina', material: 'Material', mao_de_obra: 'Mão de Obra', medida: 'Medida', ambiente: 'Ambiente' };
        
        pdfDoc.fontSize(9);
        Object.entries(cats).forEach(([key, val]) => {
          if (val) {
            pdfDoc.fillColor('#475569').text(`${labels[key] || key}: `, { continued: true })
                  .fillColor('#000').text(val);
          }
        });
      }

      pdfDoc.moveDown(0.5);
      pdfDoc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text('Causa Raiz Fundamental:');
      pdfDoc.font('Helvetica').fontSize(9).fillColor('#000').text(acr?.root_cause || 'Causa raiz não descrita.');
      pdfDoc.moveDown();

      // D3/D4 - CAPA & Evidências
      this._drawSection(pdfDoc, 'D3/D4 – AÇÕES CORRETIVAS E EVIDÊNCIAS');
      for (const capa of capas) {
        pdfDoc.rect(50, pdfDoc.y, 500, 45).fill('#f8fafc');
        pdfDoc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text(`[${capa.type}] ${capa.description}`, 55);
        pdfDoc.font('Helvetica').fontSize(9).text(`Responsável: ${capa.responsible} | Prazo: ${new Date(capa.due_date).toLocaleDateString()}`);
        pdfDoc.fontSize(8).fillColor('#64748b').text(`Critério de Eficácia: ${capa.efficacy_criteria}`);
        
        // Detalhamento de Evidências Submetidas
        if (capa.evidences && capa.evidences.length > 0) {
          pdfDoc.moveDown(0.2);
          pdfDoc.fontSize(8).fillColor('#0369a1').font('Helvetica-Bold').text('Evidências da Implementação:');
          capa.evidences.forEach(ev => {
            pdfDoc.font('Helvetica').fillColor('#334155').text(`• ${ev.description}`);
            if (ev.is_objective) pdfDoc.fillColor('#10b981').text('  [VERIFICADO: EVIDÊNCIA OBJETIVA]', { indent: 10 });
          });
        }

        pdfDoc.moveDown(0.8);
      }
      pdfDoc.moveDown();

      // D5 - Eficácia
      this._drawSection(pdfDoc, 'D5 – VERIFICAÇÃO DE EFETIVIDADE');
      pdfDoc.text(`Decisão: ${decision?.decision || 'EM AVALIAÇÃO'}`);
      pdfDoc.text(`Data da Decisão: ${decision?.created_at ? new Date(decision.created_at).toLocaleString() : 'Pendente'}`);
      if (decision?.id) pdfDoc.text(`UUID Soberano: ${decision.id}`, { color: '#64748b' });
      pdfDoc.moveDown();

      // D6 - Assinaturas
      this._drawSection(pdfDoc, 'D6 – RESPONSABILIZAÇÃO FORMAL');
      for (const sig of signatures) {
        if (sig.status === 'SIGNED') {
          const signerName = sig.user_name || 'Assinante Identificado';
          pdfDoc.text(`${sig.role.toUpperCase()}: ${signerName} em ${new Date(sig.signed_at).toLocaleString()}`);
          pdfDoc.fontSize(8).text(`Hash: ${sig.state_hash || 'N/A'}`, { color: '#94a3b8' });
          pdfDoc.fontSize(10).fillColor('#000');
          pdfDoc.moveDown(0.5);
        }
      }

      pdfDoc.fontSize(8).fillColor('#94a3b8').text(`Projeção dinâmica gerada em ${data.generated_at} | ID: ${doc.id} | Origem: SGNC`, 50, 760, { align: 'center' });

      pdfDoc.end();
    } catch (drawErr) {
      console.error('[PDF_DRAW_ERROR]', drawErr.message);
      pdfDoc.emit('error', drawErr);
    }
  }

  _drawSection(doc, title) {
    doc.moveDown();
    doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text(title);
    doc.font('Helvetica').fontSize(10).fillColor('#000');
    doc.moveDown(0.5);
  }

  async listReports(documentId) {
    return await ReportRepository.findByDocumentId(documentId);
  }

  getReportPath(fileName) {
    // Nota: Como o fileName agora é uma URL S3, este método retorna a própria URI.
    return fileName;
  }
}

export default new ReportService();
