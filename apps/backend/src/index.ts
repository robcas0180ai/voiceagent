import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: process.env.APP_NAME,
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'VoiceAgent API corriendo 🚀' });
});

app.listen(PORT, async () => {
  console.log(`✅ VoiceAgent API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  await testConnection();
});

export default app;
