import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendWhatsAppNotification = async (
  to: string,
  message: string
): Promise<void> => {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to,
      body: message
    });
    console.log(`✅ WhatsApp enviado a ${to}`);
  } catch (err: any) {
    console.error(`❌ Error WhatsApp:`, err.message);
  }
};

export const sendCallSummary = async (
  contactName: string,
  contactPhone: string,
  campaignName: string,
  duration: number,
  result: string,
  summary: string
): Promise<void> => {
  const notifyNumber = process.env.WHATSAPP_NOTIFY_NUMBER;
  if (!notifyNumber) return;

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  const message = `📞 *Resumen de llamada VoiceAgent*

👤 Contacto: ${contactName || 'Sin nombre'}
📱 Teléfono: ${contactPhone}
📋 Campaña: ${campaignName || '—'}
⏱️ Duración: ${mins}:${String(secs).padStart(2, '0')} min
📊 Resultado: ${result || 'completada'}

💬 *Resumen IA:*
${summary || 'Sin resumen disponible'}

_VoiceAgent — ${new Date().toLocaleString('es-MX')}_`;

  await sendWhatsAppNotification(notifyNumber, message);
};
