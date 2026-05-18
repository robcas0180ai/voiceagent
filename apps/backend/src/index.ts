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
import metricsRoutes from './routes/metrics.routes';

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
app.use('/api/metrics', metricsRoutes);

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

app.get('/debug-env', (req, res) => {
  res.json({
    elevenlabs_key_length: process.env.ELEVENLABS_API_KEY?.length || 0,
    elevenlabs_key_start: process.env.ELEVENLABS_API_KEY?.substring(0, 8) || 'empty',
    eleven_key_length: process.env.ELEVEN_API_KEY?.length || 0,
    eleven_key_start: process.env.ELEVEN_API_KEY?.substring(0, 8) || 'empty'
  });
});

app.get('/test-eleven', async (req, res) => {
  const https = require('https');
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  
  const options = {
    hostname: 'api.elevenlabs.io',
    path: '/v1/voices',
    method: 'GET',
    headers: { 'xi-api-key': apiKey }
  };

  const request = https.request(options, (response: any) => {
    let data = '';
    response.on('data', (chunk: any) => data += chunk);
    response.on('end', () => {
      res.json({ status: response.statusCode, body: data.substring(0, 200), key_start: apiKey.substring(0, 8) });
    });
  });
  request.on('error', (e: any) => res.json({ error: e.message }));
  request.end();
});

app.get('/test-tts', async (req, res) => {
  const https = require('https');
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  const body = JSON.stringify({ text: 'Hola', model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } });

  const options = {
    hostname: 'api.elevenlabs.io',
    path: '/v1/text-to-speech/FGY2WhTYpPnrIDTdsKH5',
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const request = https.request(options, (response: any) => {
    const chunks: any[] = [];
    response.on('data', (chunk: any) => chunks.push(chunk));
    response.on('end', () => {
      if (response.statusCode === 200) {
        res.json({ status: 200, message: 'TTS funciona', bytes: Buffer.concat(chunks).length });
      } else {
        res.json({ status: response.statusCode, body: Buffer.concat(chunks).toString().substring(0, 300) });
      }
    });
  });
  request.on('error', (e: any) => res.json({ error: e.message }));
  request.write(body);
  request.end();
});
