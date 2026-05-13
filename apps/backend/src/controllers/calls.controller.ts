import { Request, Response } from 'express';
import twilio from 'twilio';
import { supabase } from '../config/database';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Iniciar una llamada saliente
export const makeCall = async (req: any, res: Response) => {
  const { contactId } = req.params;

  try {
    // Obtener contacto
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*, campaigns(*)')
      .eq('id', contactId)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error || !contact) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    // Iniciar llamada con Twilio
    const call = await twilioClient.calls.create({
      to: contact.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml: `<Response>
        <Say language="es-MX" voice="Polly.Mia">
          Hola ${contact.name || 'buen día'}, mi nombre es Sofía y le llamo de parte de nuestra empresa.
          ¿Tiene un momento para hablar?
        </Say>
        <Pause length="3"/>
        <Say language="es-MX" voice="Polly.Mia">
          Gracias por su tiempo. Le llamaremos nuevamente pronto. Que tenga un excelente día.
        </Say>
      </Response>`,
      statusCallback: `${process.env.API_URL}/api/calls/status`,
      statusCallbackMethod: 'POST'
    });

    // Guardar registro de llamada
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

    // Actualizar stage del contacto
    await supabase
      .from('contacts')
      .update({ status: 'called', pipeline_stage: 'called' })
      .eq('id', contactId);

    return res.json({
      message: 'Llamada iniciada',
      callSid: call.sid,
      callId: callRecord?.id,
      contact: { name: contact.name, phone: contact.phone }
    });

  } catch (err: any) {
    console.error('Error Twilio:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Webhook de status de Twilio
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
    console.error(err);
    res.status(500).send('Error');
  }
};

// Listar llamadas del tenant
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
