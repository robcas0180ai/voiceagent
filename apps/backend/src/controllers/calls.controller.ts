import { Request, Response } from 'express';
import twilio from 'twilio';
import { ElevenLabsClient } from 'elevenlabs';
import { supabase } from '../config/database';
import { generateResponse, generateSummary } from '../config/claude';
import { sendCallSummary } from '../config/whatsapp';
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

// Mapear resultado de Claude a pipeline stage
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

    const audioFileName = await generateAudio(saludoTexto);
    const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;

    const { data: callRecord } = await supabase
      .from('calls')
      .insert({
        tenant_id: req.user.tenantId,
        contact_id: contactId,
        campaign_id: contact.campaign_id,
        status: 'initiated',
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

export const respondToCall = async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { SpeechResult } = req.body;

  console.log('🎤 Cliente dijo:', SpeechResult);

  try {
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

    const userMessage = SpeechResult || 'El cliente no respondió';

    const { text: respuesta, result } = await generateResponse(
      userMessage,
      {
        agentName: agent.agent_name,
        companyName: agent.company_name,
        productDescription: agent.product_description,
        objections: agent.objections || '',
        tone: agent.tone
      },
      history
    );

    console.log('🤖 Claude responde:', respuesta, '| Resultado:', result);

    const newHistory = [
      ...history,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: respuesta }
    ];

    // Actualizar historial y resultado en la llamada
    await supabase
      .from('calls')
      .update({
        summary: JSON.stringify(newHistory),
        result: result !== 'continuar' ? result : callRecord.result
      })
      .eq('id', callId);

    // Si hay resultado definitivo, actualizar el pipeline del contacto
    if (result && result !== 'continuar') {
      const newStage = resultToStage(result);
      await supabase
        .from('contacts')
        .update({ pipeline_stage: newStage })
        .eq('id', callRecord.contact_id);
      console.log(`📊 Pipeline actualizado: ${newStage}`);
    }

    const audioFileName = await generateAudio(respuesta);
    const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;

    const esFin = result === 'interesado' || result === 'no_interesado' || result === 'callback';

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
      // Si no contestó o llamada muy corta, marcar como to_call para reintentar
      if (parseInt(CallDuration || '0') < 5) {
        await supabase
          .from('contacts')
          .update({ pipeline_stage: 'to_call' })
          .eq('id', callRecord.contacts?.id);
        console.log('📵 No contestó — regresando a Por llamar');
      }

      // Generar resumen con IA
      const history = JSON.parse(callRecord.summary || '[]');
      if (history.length > 1) {
        const resumenIA = await generateSummary(history, callRecord.contacts?.name || 'el cliente');
        await supabase
          .from('calls')
          .update({ summary: resumenIA })
          .eq('id', callRecord.id);

        // Enviar WhatsApp
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
