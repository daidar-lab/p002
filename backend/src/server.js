import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import DocumentRepository from './repositories/DocumentRepository.js';
// import transporter from '../config/mailer.js'; // Ative quando for usar e-mail
// import './services/CronService.js'; // Ative quando o cron estiver pronto

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rota de Teste de conexão
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW(), current_schema()');
    res.json({ 
      status: 'Conectado!', 
      timestamp: result.rows[0].now,
      schema: result.rows[0].current_schema 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao conectar no banco' });
  }
});

// Rota Principal para o Dashboard (React)
app.get('/api/documents', async (req, res) => {
  try {
    // Chama o repositório que você criou no DocumentRepository.js
    const docs = await DocumentRepository.getAllWithSuppliers(); 
    res.json(docs);
  } catch (error) {
    console.error("Erro na rota /api/documents:", error);
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

// O listen deve ser sempre a ÚLTIMA coisa
app.listen(PORT, () => {
  console.log(`🚀 Audit Quality Server rodando na porta ${PORT}`);
});