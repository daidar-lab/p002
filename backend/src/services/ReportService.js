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

class ReportService {
  /**
   * Consolida D1-D7 e gera Snapshot imutável (BR-PDF-01/02)
   */
  async generate8DReport(documentId, userId) {
    // 1. Validações Normativas
    const lastDecision = await EfficacyRepository.getLastDecision(documentId);
    if (!lastDecision || lastDecision.decision !== 'ENCERRAMENTO_DEFINITIVO') {
      throw new Error('Bloqueio: Relatório 8D exige decisão de ENCERRAMENTO_DEFINITIVO.');
    }

    const signaturesComplete = await SignatureService.isSignOffComplete(documentId);
    if (!signaturesComplete) {
      throw new Error('Bloqueio: Relatório 8D exige 100% das assinaturas obrigatórias.');
    }

    // 2. Agregação de Dados
    const doc = await DocumentRepository.getById(documentId);
    const acr = await RootCauseRepository.findByDocumentId(documentId);
    const capas = await CapaRepository.findActiveByDocumentId(documentId);
    const sigStatus = await SignatureService.getSignatureStatus(documentId);

    // 3. Preparação do PDF
    const fileName = `8D_${doc.code}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../../uploads/reports', fileName);
    const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    pdfDoc.pipe(writeStream);

    // --- Estilos e Cabeçalho ---
    pdfDoc.fontSize(20).text('RELATÓRIO DE INVESTIGAÇÃO 8D', { align: 'center' });
    pdfDoc.fontSize(10).text(`Código: ${doc.code}`, { align: 'center' });
    pdfDoc.moveDown();
    pdfDoc.rect(50, pdfDoc.y, 500, 2).fill('#0f172a');
    pdfDoc.moveDown();

    // D1 - Identificação
    this._drawSection(pdfDoc, 'D1 – IDENTIFICAÇÃO DO PROBLEMA');
    pdfDoc.fontSize(10).fillColor('#000');
    pdfDoc.text(`Fornecedor: ${doc.supplier_name}`);
    pdfDoc.text(`Categoria: ${doc.defect_category}`);
    pdfDoc.text(`Data de Abertura: ${new Date(doc.created_at).toLocaleDateString()}`);
    pdfDoc.text(`Descrição: ${doc.description}`);
    pdfDoc.moveDown();

    // D2 - ACR
    this._drawSection(pdfDoc, 'D2 – ANÁLISE DE CAUSA RAIZ');
    pdfDoc.text(`Método: ${acr?.type || 'N/A'}`);
    pdfDoc.text(`Causa Raiz: ${acr?.root_cause || 'N/A'}`);
    pdfDoc.moveDown();

    // D3/D4 - CAPA & Evidências
    this._drawSection(pdfDoc, 'D3/D4 – AÇÕES E EVIDÊNCIAS');
    for (const capa of capas) {
      pdfDoc.text(`[${capa.type}] ${capa.description}`, { underline: true });
      pdfDoc.text(`Responsável: ${capa.responsible} | Prazo: ${new Date(capa.due_date).toLocaleDateString()}`);
      pdfDoc.text(`Critério de Eficácia: ${capa.efficacy_criteria}`);
      pdfDoc.moveDown(0.5);
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
      pdfDoc.text(`${sig.role.toUpperCase()}: ${sig.user_name} em ${new Date(sig.signed_at).toLocaleString()}`);
      pdfDoc.fontSize(8).text(`Hash: ${sig.signature_hash}`, { color: '#94a3b8' });
      pdfDoc.fontSize(10).fillColor('#000');
      pdfDoc.moveDown(0.5);
    }

    // D7 - Trilha de Auditoria
    pdfDoc.moveDown();
    pdfDoc.rect(50, 750, 500, 1).fill('#e2e8f0');
    pdfDoc.fontSize(8).fillColor('#94a3b8').text(`Artefato imutável gerado pelo sistema Audit Quality SGNC. UUID Decision: ${lastDecision.id}`, 50, 760, { align: 'center' });

    pdfDoc.end();

    // 4. Finalização e Hash
    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const record = await ReportRepository.save({
          document_id: documentId,
          decision_uuid: lastDecision.id,
          file_name: fileName,
          file_hash: hash,
          created_by: userId
        });

        resolve(record);
      });
      writeStream.on('error', reject);
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
    return path.join(__dirname, '../../uploads/reports', fileName);
  }
}

export default new ReportService();
