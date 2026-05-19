import WebSocket from 'ws';
import { generateResponse } from './claude';
import { supabase } from './database';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import twilio from 'twilio';

const Deepgram = require('@deepgram/sdk').Deepgram;
const deepgramClient = new Deepgram(process.env.DEEPGRAM_API_KEY || '');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateMp3 = async (text: string): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  const voiceId = 'FGY2WhTYpPnrIDTdsKH5';

  const body = JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  const fileName = `response_${Date.now()}.mp3`;
  const filePath = path.join(audioDir, fileName);

  const mp3Buffer = await new Promise<Buffer>((resolve, reject) => {
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
      if (res.statusCode !== 200) { reject(new Error(`ElevenLabs HTTP ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  fs.writeFileSync(filePath, mp3Buffer);
  console.log(`🎵 Audio guardado: ${fileName}`);
  return fileName;
};

export const handleMediaStream = async (ws: WebSocket, callId: string) => {
  console.log(`🎙️ Media Stream conectado para llamada: ${callId}`);

  let streamSid = '';
  let callSid = '';
  let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  let isProcessing = false;
  let agentConfig: any = null;

  const { data: callRecord } = await supabase
    .from('calls')
    .select('*, contacts(*, campaigns(*))')
    .eq('id', callId)
    .single();

  if (callRecord) {
    // Esperar hasta que call_sid esté disponible (max 3 segundos)
    let retries = 0;
    while (!callRecord.call_sid && retries < 6) {
      await new Promise(r => setTimeout(r, 500));
      const { data: refreshed } = await supabase.from('calls').select('*').eq('id', callId).single();
      if (refreshed?.call_sid) { callSid = refreshed.call_sid; break; }
      retries++;
    }
    if (!callSid) callSid = callRecord.call_sid || '';
    console.log(`📞 callSid cargado: ${callSid}`);
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

  const deepgramLive = deepgramClient.transcription.live({
    model: 'nova-2',
    language: 'es',
    smart_format: true,
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    interim_results: true,
    utterance_end_ms: '2500',
    vad_events: true,
  });

  let deepgramReady = false;
  const audioQueue: Buffer[] = [];

  deepgramLive.addListener('open', () => {
    console.log('✅ Deepgram conectado');
    deepgramReady = true;
    if (audioQueue.length > 0) {
      console.log(`📤 Enviando ${audioQueue.length} chunks en cola`);
      audioQueue.forEach(chunk => deepgramLive.send(chunk));
      audioQueue.length = 0;
    }
  });

  deepgramLive.addListener('transcriptReceived', async (transcription: string) => {
    try {
      const data = JSON.parse(transcription);
      const text = data.channel?.alternatives?.[0]?.transcript || '';
      const speechFinal = data.speech_final;
      const isFinal = data.is_final;

      if (text && isFinal) {
        console.log(`🎤 Deepgram: ${text} [speech_final: ${speechFinal}]`);
      }

      if (speechFinal && text && !isProcessing) {
        isProcessing = true;
        console.log(`👤 Cliente dijo: ${text}`);

        try {
          const { text: respuesta, result } = await generateResponse(
            text,
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

          conversationHistory.push({ role: 'user', content: text });
          conversationHistory.push({ role: 'assistant', content: respuesta });

          await supabase
            .from('calls')
            .update({
              summary: JSON.stringify(conversationHistory),
              result: result !== 'continuar' ? result : undefined
            })
            .eq('id', callId);

          if (result && result !== 'continuar' && callRecord) {
            const stageMap: any = { interesado: 'interested', no_interesado: 'not_interested', callback: 'callback' };
            if (stageMap[result]) {
              await supabase
                .from('contacts')
                .update({ pipeline_stage: stageMap[result] })
                .eq('id', callRecord.contact_id);
            }
          }

          // Generar MP3 y reproducir via Twilio REST API
          const fileName = await generateMp3(respuesta);
          const audioUrl = `${process.env.API_URL}/audio/${fileName}`;

          const esFin = result === 'interesado' || result === 'no_interesado' || result === 'callback';

          const twiml = esFin
            ? `<Response><Play>${audioUrl}</Play><Pause length="1"/><Hangup/></Response>`
            : `<Response><Play>${audioUrl}</Play><Pause length="30"/></Response>`;

          await twilioClient.calls(callSid).update({ twiml });
          console.log(`🔊 Audio reproducido via REST: ${audioUrl}`);

        } catch (err: any) {
          console.error('Error procesando respuesta:', err.message);
        } finally {
          isProcessing = false;
        }
      }
    } catch (err) {}
  });

  deepgramLive.addListener('error', (err: any) => {
    console.error('Deepgram error:', err);
  });

  deepgramLive.addListener('close', () => {
    console.log('Deepgram cerrado');
  });

  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.event) {
        case 'start':
          streamSid = data.start.streamSid;
          callSid = data.start.callSid;
          console.log('📞 Start data:', JSON.stringify(data.start));
          break;

        case 'media':
          const audioBuffer = Buffer.from(data.media.payload, 'base64');
          if (deepgramReady) {
            deepgramLive.send(audioBuffer);
          } else {
            audioQueue.push(audioBuffer);
          }
          break;

        case 'stop':
          console.log('🔴 Stream detenido');
          try { deepgramLive.finish(); } catch(e) {}
          break;
      }
    } catch (err) {
      console.error('Error procesando mensaje WebSocket:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket cerrado');
    try { deepgramLive.finish(); } catch(e) {}
  });
};
