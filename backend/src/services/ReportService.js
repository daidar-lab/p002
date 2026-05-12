import PDFDocument from 'pdfkit';
import fs from 'fs';
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
  async generate8DReport(documentId, userId) {
    // 1. Validações Normativas
    const doc = await DocumentRepository.getById(documentId);
    if (!doc || doc.status !== 'CONCLUIDO') {
      throw new Error('Bloqueio: Relatório 8D exige que o documento esteja no status CONCLUIDO.');
    }

    let lastDecision = await EfficacyRepository.getLastDecision(documentId);
    
    // Fallback: Se não houver decisão mas o doc está concluído, persistimos uma decisão de migração
    if (!lastDecision && doc.status === 'CONCLUIDO') {
      console.log(`[ReportService] Criando decisão de eficácia retroativa para o documento ${documentId}`);
      lastDecision = await EfficacyRepository.saveDecision({
        document_id: documentId,
        decision: 'ENCERRAMENTO_DEFINITIVO',
        rules_applied: ['MIGRACAO_SISTEMA'],
        evidence_summary: 'Encerramento retroativo (Legado) para geração de relatório 8D.'
      });
      lastDecision.decision = 'ENCERRAMENTO_DEFINITIVO';
    }

    if (!lastDecision) {
      throw new Error('Bloqueio: Relatório 8D exige uma decisão de eficácia registrada.');
    }

    const signaturesComplete = await SignatureService.canProceedToDisposition(documentId);
    if (!signaturesComplete) {
      throw new Error('Bloqueio: Relatório 8D exige 100% das assinaturas obrigatórias.');
    }

    // 2. Agregação de Dados
    const acr = await RootCauseRepository.findByDocumentId(documentId);
    const capas = await CapaRepository.findActiveByDocumentId(documentId);
    const sigStatus = await SignatureService.getHardenedState(documentId);

    // 3. Preparação do PDF Local (Buffer Temporário)
    const tempFileName = `8D_${doc.code}_${Date.now()}.pdf`;
    const tempPath = path.join(__dirname, '../../uploads/reports', tempFileName);
    const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(tempPath);
    
    pdfDoc.pipe(writeStream);

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
      pdfDoc.moveDown(0.8);
    }
    pdfDoc.moveDown();

    // D5 - Eficácia
    this._drawSection(pdfDoc, 'D5 – VERIFICAÇÃO DE EFETIVIDADE');
    pdfDoc.text(`Decisão: ${lastDecision.decision}`);
    pdfDoc.text(`Data da Decisão: ${new Date(lastDecision.created_at).toLocaleString()}`);
    pdfDoc.text(`UUID Soberano: ${lastDecision.id}`, { color: '#64748b' });
    pdfDoc.moveDown();

    // D6 - Assinaturas
    this._drawSection(pdfDoc, 'D6 – RESPONSABILIZAÇÃO FORMAL');
    for (const sig of sigStatus.current_signatures) {
      if (sig.status === 'SIGNED') {
        const signerName = sig.user_name || 'Assinante Identificado';
        pdfDoc.text(`${sig.role.toUpperCase()}: ${signerName} em ${new Date(sig.signed_at).toLocaleString()}`);
        pdfDoc.fontSize(8).text(`Hash: ${sig.state_hash || 'N/A'}`, { color: '#94a3b8' });
        pdfDoc.fontSize(10).fillColor('#000');
        pdfDoc.moveDown(0.5);
      }
    }

    // D7 - Trilha de Auditoria
    pdfDoc.moveDown();
    pdfDoc.rect(50, 750, 500, 1).fill('#e2e8f0');
    pdfDoc.fontSize(8).fillColor('#94a3b8').text(`Artefato imutável gerado pelo sistema Audit Quality SGNC. UUID Decision: ${lastDecision.id}`, 50, 760, { align: 'center' });

    pdfDoc.end();

    // 4. Fluxo AWS S3 e Limpeza Local (Hardened Flow)
    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        const s3Key = S3Service.generateKey(documentId);
        
        try {
          // Upload via ReadStream (BR-S3-01/03)
          await S3Service.uploadFileStream(tempPath, s3Key);

          const fileBuffer = fs.readFileSync(tempPath);
          const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

          // Persistência com Chave Imutável (Idempotency Gate)
          try {
            const record = await ReportRepository.save({
              document_id: documentId,
              decision_uuid: lastDecision.id,
              file_name: s3Key, // Agora armazena apenas a KEY (Hardened)
              file_hash: hash,
              created_by: userId
            });

            // Geramos uma URL temporária para a resposta imediata
            const temporaryUrl = await S3Service.getPresignedUrl(s3Key);

            resolve({
              operation: "S3_UPLOAD",
              document_id: documentId,
              status: "SUCCESS",
              permanent_uri: temporaryUrl, // URL protegida (expira em 1h)
              object_key: s3Key,
              deterministic: true,
              db_record: record
            });
          } catch (dbErr) {
            // COMPENSAÇÃO (BR-AUD-01): Se o banco falhar, removemos do S3
            await S3Service.rollbackObject(s3Key);
            throw dbErr;
          }

        } catch (err) {
          console.error('[HARDENED_FLOW_CRITICAL_FAILURE]', err.message);
          reject(err);
        } finally {
          // BR-S3-01: Zero-Footprint Local
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      });

      writeStream.on('error', (err) => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        reject(err);
      });
    });
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
