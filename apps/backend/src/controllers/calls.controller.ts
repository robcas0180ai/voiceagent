import { Request, Response } from 'express';
import twilio from 'twilio';
import { supabase } from '../config/database';
import { generateResponse, generateSummary } from '../config/claude';
import { sendCallSummary } from '../config/whatsapp';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const generateAudio = async (text: string): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY || '';
  const voiceId = 'FGY2WhTYpPnrIDTdsKH5';

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const fileName = `call_${Date.now()}.mp3`;
  const filePath = path.join(audioDir, fileName);

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
      res.on('end', () => {
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        resolve(fileName);
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const resultToStage = (result: string): string => {
  const map: any = {
    interesado: 'interested',
    no_interesado: 'not_interested',
    callback: 'callback',
    continuar: 'called'
  };
  return map[result] || 'called';
};

export const makeCall = async (req: any, res: Response) => {
  const { contactId } = req.params;

  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*, campaigns(*)')
      .eq('id', contactId)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error || !contact) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    const { data: agentConfig } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .single();

    const agent = agentConfig || {
      agent_name: 'Sofía',
      company_name: 'nuestra empresa',
      product_description: 'un producto especial',
      objections: '',
      tone: 'profesional y amable'
    };

    // Generar saludo inicial
    const { text: saludoTexto } = await generateResponse(
      `Inicia la llamada saludando a ${contact.name || 'el cliente'} y presentándote brevemente.`,
      {
        agentName: agent.agent_name,
        companyName: agent.company_name,
        productDescription: agent.product_description,
        objections: agent.objections || '',
        tone: agent.tone
      },
      []
    );

    console.log('🤖 Claude generó saludo:', saludoTexto);

    // Generar audio del saludo
    const audioFileName = await generateAudio(saludoTexto);
    const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;

    // Crear registro de llamada
    const { data: callRecord } = await supabase
      .from('calls')
      .insert({
        tenant_id: req.user.tenantId,
        contact_id: contactId,
        campaign_id: contact.campaign_id,
        status: 'initiated',
        call_sid: '',
        
        result: 'en_curso',
        summary: JSON.stringify([{ role: 'assistant', content: saludoTexto }]),
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    await supabase
      .from('contacts')
      .update({ status: 'called', pipeline_stage: 'called' })
      .eq('id', contactId);

    // TwiML con Media Stream + saludo inicial
    // wsUrl
const wsUrl = process.env.API_URL!.replace('https://', 'wss://').replace('http://', 'ws://');
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${wsUrl}/api/calls/stream/${callRecord?.id}" track="inbound_track" />
  </Start>
  <Play>${audioUrl}</Play>
  <Pause length="30"/>
</Response>`;

    const call = await twilioClient.calls.create({
      to: contact.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml,
      record: true,
      recordingStatusCallback: `${process.env.API_URL}/api/calls/recording/${callRecord?.id}`,
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
      statusCallback: `${process.env.API_URL}/api/calls/status`,
      statusCallbackMethod: 'POST',
      machineDetection: 'DetectMessageEnd',
      asyncAmd: 'true',
      asyncAmdStatusCallback: `${process.env.API_URL}/api/calls/amd`,
      asyncAmdStatusCallbackMethod: 'POST'
    });

    // Guardar call_sid en DB
    await supabase.from('calls').update({ call_sid: call.sid }).eq('id', callRecord?.id);
    console.log(`📞 Llamada iniciada con Media Stream: ${call.sid}`);

    return res.json({
      message: 'Llamada iniciada',
      callSid: call.sid,
      callId: callRecord?.id,
      saludoTexto,
      contact: { name: contact.name, phone: contact.phone }
    });

  } catch (err: any) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const recordingCallback = async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { RecordingUrl, RecordingDuration, RecordingStatus } = req.body;

  console.log(`🎙️ Recording callback — callId: ${callId}, status: ${RecordingStatus}, url: ${RecordingUrl}`);

  try {
    if (RecordingUrl && RecordingStatus === 'completed') {
      // Descargar MP3 desde Twilio y servirlo localmente
      const twilioMp3Url = `${RecordingUrl}.mp3`;
      const audioDir = require('path').join(__dirname, '../../public/audio');
      if (!require('fs').existsSync(audioDir)) require('fs').mkdirSync(audioDir, { recursive: true });
      const fileName = `recording_${callId}.mp3`;
      const filePath = require('path').join(audioDir, fileName);

      // Guardar URL de proxy que autenticará con Twilio
      const proxyUrl = `${process.env.API_URL}/api/calls/recording-proxy/${callId}`;
      const { error } = await supabase
        .from('calls')
        .update({ recording_url: proxyUrl })
        .eq('id', callId);

      if (error) {
        console.error('Error guardando grabación:', error);
      } else {
        console.log(`✅ Grabación guardada via proxy: ${proxyUrl} (${RecordingDuration}s)`);
        // Guardar también la URL original de Twilio
        await supabase.from('calls').update({ recording_sid: RecordingUrl }).eq('id', callId);
      }
    }
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Error grabación:', err);
    res.status(500).send('Error');
  }
};

export const callStatus = async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  try {
    const { data: callRecord } = await supabase
      .from('calls')
      .update({
        status: CallStatus,
        duration_seconds: parseInt(CallDuration || '0'),
        ended_at: new Date().toISOString()
      })
      .eq('status', 'initiated')
      .select('*, contacts(name, phone, id), campaigns(name)')
      .single();

    console.log(`📞 Llamada ${CallSid} — Status: ${CallStatus} — Duración: ${CallDuration}s`);

    if (CallStatus === 'completed' && callRecord) {
      if (parseInt(CallDuration || '0') < 5 || CallStatus === 'no-answer' || CallStatus === 'busy' || CallStatus === 'failed') {
        await supabase
          .from('contacts')
          .update({ pipeline_stage: 'to_call', status: 'pending' })
          .eq('id', callRecord.contacts?.id);
        console.log('📵 No contestó — regresando a Por llamar');
      }

      const history = JSON.parse(callRecord.summary || '[]');
      if (history.length > 1) {
        const resumenIA = await generateSummary(history, callRecord.contacts?.name || 'el cliente');
        await supabase
          .from('calls')
          .update({ summary: resumenIA })
          .eq('id', callRecord.id);

        await sendCallSummary(
          callRecord.contacts?.name || 'Sin nombre',
          callRecord.contacts?.phone || '',
          callRecord.campaigns?.name || '',
          parseInt(CallDuration || '0'),
          callRecord.result || CallStatus,
          resumenIA
        );
      }
    }

    res.status(200).send('OK');
  } catch (err: any) {
    console.error(err);
    res.status(500).send('Error');
  }
};

export const getCalls = async (req: any, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('*, contacts(name, phone), campaigns(name)')
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return res.json({ calls: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const respondToCall = async (req: Request, res: Response) => {
  res.status(200).send('OK');
};

export const amdCallback = async (req: Request, res: Response) => {
  const { CallSid, AnsweredBy } = req.body;
  console.log(`🤖 AMD: CallSid=${CallSid}, AnsweredBy=${AnsweredBy}`);

  if (AnsweredBy === 'machine_end_beep' || AnsweredBy === 'machine_end_silence' || AnsweredBy === 'machine_end_other') {
    console.log('📵 Buzón de voz detectado — colgando');
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.calls(CallSid).update({ status: 'completed' });
    } catch(e: any) {
      console.error('Error colgando:', e.message);
    }
  }

  res.status(200).send('OK');
};

export const recordingProxy = async (req: Request, res: Response) => {
  const { callId } = req.params;
  try {
    const { data: callRecord } = await supabase
      .from('calls')
      .select('recording_sid')
      .eq('id', callId)
      .single();

    if (!callRecord?.recording_sid) {
      return res.status(404).json({ error: 'Grabación no encontrada' });
    }

    const https = require('https');
    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioUrl = `${callRecord.recording_sid}.mp3`;
    const url = new URL(twilioUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      headers: { 'Authorization': `Basic ${auth}` }
    };

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    const request = https.request(options, (response: any) => {
      response.pipe(res);
    });
    request.on('error', (e: any) => res.status(500).json({ error: e.message }));
    request.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
