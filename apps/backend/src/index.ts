import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './config/database';
import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaigns.routes';
import callsRoutes from './routes/calls.routes';
import agentRoutes from './routes/agent.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use('/audio', express.static(path.join(__dirname, '../public/audio')));

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/agent', agentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: process.env.APP_NAME, version: '0.1.0', timestamp: new Date().toISOString() });
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
