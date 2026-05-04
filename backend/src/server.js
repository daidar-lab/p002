import express from 'express';
import cors from 'cors';
import DocumentService from './services/DocumentService.js';
import dotenv from 'dotenv';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Listar Fornecedores
app.get('/api/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar Documentos
app.get('/api/documents', async (req, res) => {
  const result = await DocumentService.listDashboard();
  res.json(result);
});

// Criar Documento (Botão Gravar)
app.post('/api/documents', async (req, res) => {
  const result = await DocumentService.create(req.body);

  if (result.error) {
    return res.status(result.status).json({ error: result.message });
  }
  
  res.status(201).json(result.data);
});
app.listen(PORT, () => {
  console.log(`🚀 Audit Quality Server rodando na porta ${PORT}`);
});