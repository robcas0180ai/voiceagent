import { Request, Response } from 'express';
import twilio from 'twilio';
import { supabase } from '../config/database';
import { generateResponse, generateSummary } from '../config/claude';
import { sendCallSummary } from '../config/whatsapp';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const generateAudio = async (text: string): Promise<string> => {
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
  <Gather input="speech" language="es-US" speechModel="phone_call" timeout="5" speechTimeout="2"
    action="${process.env.API_URL}/api/calls/respond/${callRecord?.id}"
    method="POST">
    <Pause length="2"/>
  </Gather>
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
      statusCallbackMethod: 'POST'
    });

    console.log(`📞 Llamada iniciada: ${call.sid}`);

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

    await supabase
      .from('calls')
      .update({
        summary: JSON.stringify(newHistory),
        result: result !== 'continuar' ? result : callRecord.result
      })
      .eq('id', callId);

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
  <Pause length="2"/>
  <Hangup/>
</Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" language="es-US" speechModel="phone_call" timeout="5" speechTimeout="2"
    action="${process.env.API_URL}/api/calls/respond/${callId}"
    method="POST">
    <Pause length="2"/>
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

export const recordingCallback = async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { RecordingUrl, RecordingDuration, RecordingStatus } = req.body;

  console.log(`🎙️ Recording callback — callId: ${callId}, status: ${RecordingStatus}, url: ${RecordingUrl}`);

  try {
    if (RecordingUrl && RecordingStatus === 'completed') {
      const recordingUrl = `${RecordingUrl}.mp3`;
      const { error } = await supabase
        .from('calls')
        .update({ recording_url: recordingUrl })
        .eq('id', callId);

      if (error) {
        console.error('Error guardando grabación:', error);
      } else {
        console.log(`✅ Grabación guardada: ${recordingUrl} (${RecordingDuration}s)`);
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
      if (parseInt(CallDuration || '0') < 5) {
        await supabase
          .from('contacts')
          .update({ pipeline_stage: 'to_call' })
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
