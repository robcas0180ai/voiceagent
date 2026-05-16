import { Request, Response } from 'express';
import twilio from 'twilio';
import { ElevenLabsClient } from 'elevenlabs';
import { supabase } from '../config/database';
import { generateResponse } from '../config/claude';
import * as fs from 'fs';
import * as path from 'path';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Generar audio con ElevenLabs
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

// Iniciar llamada saliente
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

    // Obtener config del agente
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

    // Saludo inicial con Claude
    const saludoTexto = await generateResponse(
      `Inicia la llamada saludando a ${contact.name || 'el cliente'} y presentándote.`,
      {
        agentName: agent.agent_name,
        companyName: agent.company_name,
        productDescription: agent.product_description,
        objections: agent.objections || '',
        tone: agent.tone
      },
      []
    );

    console.log('🤖 Claude generó:', saludoTexto);

    const audioFileName = await generateAudio(saludoTexto);
    const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;

    // Guardar historial de conversación en DB
    const { data: callRecord } = await supabase
      .from('calls')
      .insert({
        tenant_id: req.user.tenantId,
        contact_id: contactId,
        campaign_id: contact.campaign_id,
        status: 'initiated',
        summary: JSON.stringify([{ role: 'assistant', content: saludoTexto }]),
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    await supabase
      .from('contacts')
      .update({ status: 'called', pipeline_stage: 'called' })
      .eq('id', contactId);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" language="es-MX" timeout="5" speechTimeout="2"
    action="${process.env.API_URL}/api/calls/respond/${callRecord?.id}"
    method="POST">
    <Pause length="1"/>
  </Gather>
</Response>`;

    const call = await twilioClient.calls.create({
      to: contact.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml,
      statusCallback: `${process.env.API_URL}/api/calls/status`,
      statusCallbackMethod: 'POST'
    });

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

// Responder al cliente en tiempo real
export const respondToCall = async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { SpeechResult } = req.body;

  console.log('🎤 Cliente dijo:', SpeechResult);

  try {
    // Obtener historial de conversación
    const { data: callRecord } = await supabase
      .from('calls')
      .select('*, contacts(*, campaigns(*))')
      .eq('id', callId)
      .single();

    if (!callRecord) {
      res.type('text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
    }

    const history = JSON.parse(callRecord.summary || '[]');

    // Obtener config del agente
    const { data: agentConfig } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', callRecord.contacts.tenant_id)
      .single();

    const agent = agentConfig || {
      agent_name: 'Sofía',
      company_name: 'nuestra empresa',
      product_description: 'un producto especial',
      objections: '',
      tone: 'profesional y amable'
    };

    // Generar respuesta con Claude
    const respuesta = await generateResponse(
      SpeechResult || 'El cliente no dijo nada',
      {
        agentName: agent.agent_name,
        companyName: agent.company_name,
        productDescription: agent.product_description,
        objections: agent.objections || '',
        tone: agent.tone
      },
      history
    );

    console.log('🤖 Claude responde:', respuesta);

    // Actualizar historial
    const newHistory = [
      ...history,
      { role: 'user', content: SpeechResult || '' },
      { role: 'assistant', content: respuesta }
    ];

    await supabase
      .from('calls')
      .update({ summary: JSON.stringify(newHistory) })
      .eq('id', callId);

    // Generar audio de respuesta
    const audioFileName = await generateAudio(respuesta);
    const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;

    // Detectar fin de conversación
    const finKeywords = ['gracias', 'adios', 'no me interesa', 'no interesa', 'hasta luego'];
    const esFin = finKeywords.some(k => respuesta.toLowerCase().includes(k));

    const twiml = esFin
      ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Pause length="1"/>
  <Hangup/>
</Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" language="es-MX" timeout="5" speechTimeout="2"
    action="${process.env.API_URL}/api/calls/respond/${callId}"
    method="POST">
    <Pause length="1"/>
  </Gather>
</Response>`;

    res.type('text/xml');
    return res.send(twiml);

  } catch (err: any) {
    console.error('Error respondiendo:', err);
    res.type('text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
};

// Webhook status Twilio
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

// Listar llamadas
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
