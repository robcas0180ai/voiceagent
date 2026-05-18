import { DeepgramClient } from '@deepgram/sdk';
import WebSocket from 'ws';
import { generateResponse } from './claude';
import { supabase } from './database';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const deepgramClient = new DeepgramClient(process.env.DEEPGRAM_API_KEY || '', {});

const generateAudio = async (text: string): Promise<Buffer> => {
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  const voiceId = 'FGY2WhTYpPnrIDTdsKH5';

  const body = JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`ElevenLabs HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

export const handleMediaStream = async (ws: WebSocket, callId: string) => {
  console.log(`🎙️ Media Stream conectado para llamada: ${callId}`);

  let streamSid = '';
  let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  let isProcessing = false;
  let agentConfig: any = null;
  let transcript = '';

  const { data: callRecord } = await supabase
    .from('calls')
    .select('*, contacts(*, campaigns(*))')
    .eq('id', callId)
    .single();

  if (callRecord) {
    conversationHistory = JSON.parse(callRecord.summary || '[]');

    const { data: config } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', callRecord.contacts.tenant_id)
      .single();

    agentConfig = config || {
      agent_name: 'Sofía',
      company_name: 'nuestra empresa',
      product_description: 'un producto especial',
      objections: '',
      tone: 'profesional y amable'
    };
  }

  const deepgramLive = deepgramClient.listen.live({
    model: 'nova-2',
    language: 'es',
    smart_format: true,
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    interim_results: true,
    utterance_end_ms: 1500,
    vad_events: true,
  });

  deepgramLive.on('open', () => {
    console.log('✅ Deepgram conectado');
  });

  deepgramLive.on('transcript', async (data: any) => {
    const text = data.channel?.alternatives?.[0]?.transcript || '';
    const speechFinal = data.speech_final;

    if (text) {
      transcript += ' ' + text;
      console.log(`🎤 Deepgram: ${text}`);
    }

    if (speechFinal && transcript.trim() && !isProcessing) {
      const userText = transcript.trim();
      transcript = '';
      isProcessing = true;

      console.log(`👤 Cliente dijo: ${userText}`);

      try {
        const { text: respuesta, result } = await generateResponse(
          userText,
          {
            agentName: agentConfig.agent_name,
            companyName: agentConfig.company_name,
            productDescription: agentConfig.product_description,
            objections: agentConfig.objections || '',
            tone: agentConfig.tone
          },
          conversationHistory
        );

        console.log(`🤖 Claude: ${respuesta} | Resultado: ${result}`);

        conversationHistory.push({ role: 'user', content: userText });
        conversationHistory.push({ role: 'assistant', content: respuesta });

        await supabase
          .from('calls')
          .update({
            summary: JSON.stringify(conversationHistory),
            result: result !== 'continuar' ? result : undefined
          })
          .eq('id', callId);

        if (result && result !== 'continuar' && callRecord) {
          const stageMap: any = {
            interesado: 'interested',
            no_interesado: 'not_interested',
            callback: 'callback'
          };
          if (stageMap[result]) {
            await supabase
              .from('contacts')
              .update({ pipeline_stage: stageMap[result] })
              .eq('id', callRecord.contact_id);
          }
        }

        const audioBuffer = await generateAudio(respuesta);
        const audioBase64 = audioBuffer.toString('base64');

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            event: 'media',
            streamSid,
            media: { payload: audioBase64 }
          }));

          if (result === 'interesado' || result === 'no_interesado' || result === 'callback') {
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: 'stop', streamSid }));
              }
            }, 3000);
          }
        }

      } catch (err: any) {
        console.error('Error procesando respuesta:', err);
      } finally {
        isProcessing = false;
      }
    }
  });

  deepgramLive.on('error', (err: any) => {
    console.error('Deepgram error:', err);
  });

  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.event) {
        case 'start':
          streamSid = data.start.streamSid;
          console.log(`📞 Stream iniciado: ${streamSid}`);
          break;

        case 'media':
          if (deepgramLive.getReadyState() === 1) {
            const audioBuffer = Buffer.from(data.media.payload, 'base64');
            deepgramLive.send(audioBuffer.buffer as ArrayBuffer);
          }
          break;

        case 'stop':
          console.log('🔴 Stream detenido');
          deepgramLive.finish();
          break;
      }
    } catch (err) {
      console.error('Error procesando mensaje WebSocket:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket cerrado');
    deepgramLive.finish();
  });
};
