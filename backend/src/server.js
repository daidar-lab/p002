import express from 'express';
import transporter from '../config/mailer.js';
import './services/CronService.js';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Teste de conexão com o Banco de Dados
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

app.listen(PORT, () => {
  console.log(`🚀 Audit Quality Server rodando na porta ${PORT}`);
});