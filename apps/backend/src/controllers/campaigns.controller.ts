import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { generateResponse } from '../config/claude';
import { ElevenLabsClient } from 'elevenlabs';
import twilio from 'twilio';
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

// Listar campañas
export const getCampaigns = async (req: any, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ campaigns: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Crear campaña
export const createCampaign = async (req: any, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ name, tenant_id: req.user.tenantId, status: 'draft' })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ message: 'Campaña creada', campaign: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Obtener campaña por ID
export const getCampaign = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, contacts(*)')
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Campaña no encontrada' });
    return res.json({ campaign: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Actualizar campaña
export const updateCampaign = async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, status } = req.body;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ name, status })
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ message: 'Campaña actualizada', campaign: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Eliminar campaña
export const deleteCampaign = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId);

    if (error) throw error;
    return res.json({ message: 'Campaña eliminada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Iniciar campaña completa — llama a todos los contactos pendientes
export const startCampaign = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    // Obtener contactos pendientes
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', id)
      .eq('tenant_id', req.user.tenantId)
      .eq('pipeline_stage', 'to_call');

    if (error) throw error;
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ error: 'No hay contactos pendientes en esta campaña' });
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

    // Actualizar estado de campaña a activa
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', id);

    // Responder inmediatamente con el conteo
    res.json({
      message: `Campaña iniciada — llamando a ${contacts.length} contactos`,
      total: contacts.length
    });

    // Procesar llamadas en background con delay de 10 segundos entre cada una
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      try {
        // Esperar entre llamadas para no saturar
        if (i > 0) await new Promise(r => setTimeout(r, 10000));

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

        const audioFileName = await generateAudio(saludoTexto);
        const audioUrl = `${process.env.API_URL}/audio/${audioFileName}`;

        const { data: callRecord } = await supabase
          .from('calls')
          .insert({
            tenant_id: req.user.tenantId,
            contact_id: contact.id,
            campaign_id: id,
            status: 'initiated',
            result: 'en_curso',
            summary: JSON.stringify([{ role: 'assistant', content: saludoTexto }]),
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        await twilioClient.calls.create({
          to: contact.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" language="es-MX" timeout="5" speechTimeout="2"
    action="${process.env.API_URL}/api/calls/respond/${callRecord?.id}"
    method="POST">
    <Pause length="1"/>
  </Gather>
</Response>`,
          statusCallback: `${process.env.API_URL}/api/calls/status`,
          statusCallbackMethod: 'POST'
        });

        await supabase
          .from('contacts')
          .update({ status: 'called', pipeline_stage: 'called' })
          .eq('id', contact.id);

        console.log(`📞 Llamada iniciada a ${contact.name} (${contact.phone}) — ${i + 1}/${contacts.length}`);

      } catch (callErr: any) {
        console.error(`❌ Error llamando a ${contact.phone}:`, callErr.message);
      }
    }

    // Actualizar contador de llamadas en campaña
    await supabase
      .from('campaigns')
      .update({ called: contacts.length })
      .eq('id', id);

  } catch (err: any) {
    console.error('Error iniciando campaña:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
};
