import { Request, Response } from 'express';
import twilio from 'twilio';
import { ElevenLabsClient } from 'elevenlabs';
import { supabase } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

const generateAudio = async (text: string): Promise<string> => {
  const audioStream = await elevenlabs.textToSpeech.convert('FGY2WhTYpPnrIDTdsKH5', {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const fileName = `call_${Date.now()}.mp3`;
  const filePath = path.join(audioDir, fileName);

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  fs.writeFileSync(filePath, Buffer.concat(chunks));
  return fileName;
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

    const texto = `Hola ${contact.name || ''}. Mi nombre es Sofía y le llamo de parte de nuestra empresa. Tenemos una propuesta especial que puede interesarle. Gracias por su tiempo. Que tenga un excelente día.`;

    console.log('🎙️ Generando audio con ElevenLabs...');
    const audioFileName = await generateAudio(texto);
    const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;
    console.log('✅ Audio generado:', audioUrl);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${audioUrl}</Play></Response>`;

    const call = await twilioClient.calls.create({
      to: contact.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml,
      statusCallback: `${process.env.API_URL}/api/calls/status`,
      statusCallbackMethod: 'POST'
    });

    const { data: callRecord } = await supabase
      .from('calls')
      .insert({
        tenant_id: req.user.tenantId,
        contact_id: contactId,
        campaign_id: contact.campaign_id,
        status: 'initiated',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    await supabase
      .from('contacts')
      .update({ status: 'called', pipeline_stage: 'called' })
      .eq('id', contactId);

    return res.json({
      message: 'Llamada iniciada',
      callSid: call.sid,
      callId: callRecord?.id,
      audioUrl,
      contact: { name: contact.name, phone: contact.phone }
    });

  } catch (err: any) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const callStatus = async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  try {
    await supabase
      .from('calls')
      .update({
        status: CallStatus,
        duration_seconds: parseInt(CallDuration || '0'),
        ended_at: new Date().toISOString()
      })
      .eq('status', 'initiated');
    console.log(`📞 Llamada ${CallSid} — Status: ${CallStatus} — Duración: ${CallDuration}s`);
    res.status(200).send('OK');
  } catch (err: any) {
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
