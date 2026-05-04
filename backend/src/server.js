import express from 'express';
import cors from 'cors';
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
  try {
    const result = await pool.query(`
      SELECT 
        d.*, 
        s.name as supplier_name 
      FROM documents d
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar Documento (Botão Gravar)
app.post('/api/documents', async (req, res) => {
  // 1. Pegue todos os campos do corpo da requisição
  const { code, type, status, supplier_id, item_description, defect_category } = req.body;

  // 2. Log para você ver no terminal o que o React está mandando de verdade
  console.log("Dados recebidos do Frontend:", req.body);

  // 3. Validação ajustada: Remova o bloqueio agressivo para testar
  if (!code || !item_description) {
    return res.status(400).json({ error: "Código e Descrição são obrigatórios!" });
  }

  try {
    const newDocument = await pool.query(
      `INSERT INTO documents (
        code, 
        type, 
        status, 
        supplier_id, 
        item_description, 
        defect_category, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [
        code, 
        type || 'RNC', 
        status || 'CRIADO', 
        supplier_id || null, // Garante que se não tiver ID, envie NULL e não dê erro
        item_description, 
        defect_category || 'QUALIDADE' // Valor padrão caso o React esqueça de mandar
      ]
    );
    
    res.status(201).json(newDocument.rows[0]);
  } catch (err) {
    console.error("ERRO NO BANCO:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Audit Quality Server rodando na porta ${PORT}`);
});