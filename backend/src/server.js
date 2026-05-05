import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import DocumentService from './services/DocumentService.js';
import SupplierService from './services/SupplierService.js';
import DocumentRepository from './repositories/DocumentRepository.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

function respond(res, result) {
  if (result && result.error) {
    return res.status(result.status || 500).json({ error: result.message });
  }
  return res.json(result.data ?? result);
}

// ── Health ──────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ══════════════════════════════════════════════════════════
//  SUPPLIERS
// ══════════════════════════════════════════════════════════
app.get('/api/suppliers', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, cnpj, contact_name, email, active, created_at FROM audit_quality.suppliers ORDER BY name ASC'
    );
    res.json(result.rows);          // sempre array — frontend espera isso
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const result = await SupplierService.create(req.body);
  if (result.error) return respond(res, result);
  res.status(201).json(result.data);
});

app.put('/api/suppliers/:id', async (req, res) => {
  const result = await SupplierService.update(Number(req.params.id), req.body);
  respond(res, result);
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const result = await SupplierService.delete(Number(req.params.id));
  respond(res, result);
});

// ══════════════════════════════════════════════════════════
//  DOCUMENTS
// ══════════════════════════════════════════════════════════
app.get('/api/documents', async (_req, res) => {
  try {
    const data = await DocumentService.listDashboard();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const doc = await DocumentRepository.getById(Number(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', async (req, res) => {
  const result = await DocumentService.create(req.body);
  if (result.error) return respond(res, result);
  res.status(201).json(result.data);
});

app.put('/api/documents/:id', async (req, res) => {
  const result = await DocumentService.update(Number(req.params.id), req.body);
  respond(res, result);
});

app.delete('/api/documents/:id', async (req, res) => {
  const result = await DocumentService.delete(Number(req.params.id));
  respond(res, result);
});

app.patch('/api/documents/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Campo status é obrigatório.' });
  const result = await DocumentService.changeStatus(Number(req.params.id), status);
  respond(res, result);
});

app.get('/api/documents/:id/timeline', async (req, res) => {
  try {
    const result = await DocumentService.getTimeline(Number(req.params.id));
    respond(res, result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀  Audit Quality API → http://localhost:${PORT}`);
  console.log(`    Health            → http://localhost:${PORT}/health`);
});
