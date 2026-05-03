import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de seguridad
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: process.env.APP_NAME,
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta base
app.get('/', (req, res) => {
  res.json({ message: 'VoiceAgent API corriendo 🚀' });
});

// Iniciar servidor y probar DB
app.listen(PORT, async () => {
  console.log(`✅ VoiceAgent API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  await testConnection();
});

export default app;
