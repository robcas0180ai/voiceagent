# VoiceAgent — Estado del proyecto

## Última actualización: Media Streams - audio llega pero Deepgram no transcribe

## ✅ Completado
- Backend + Frontend en producción (Railway)
- Twilio de pago — llama a cualquier número mexicano
- ElevenLabs Starter — Lupita habla en español en producción
- Grabaciones funcionando — recording_url guardado en Supabase
- Pipeline automático — mueve contactos por stage
- Dashboard, métricas, campañas, pipeline CRM, llamadas
- Navbar completo en todas las páginas
- Media Streams conectado — eventos media llegan al WebSocket
- Deepgram conectado

## ❌ Pendiente crítico
- Deepgram no transcribe el audio del cliente
- Los eventos 'media' llegan al WebSocket correctamente
- El audio es mulaw 8000Hz de Twilio pero Deepgram no genera transcript
- Posible causa: el audio del cliente se mezcla con el audio de Lupita en el mismo track
- Siguiente paso: usar track="both_tracks" o separar inbound/outbound

## 🔧 Stack activo
- Backend: Node.js + Express + TypeScript — Railway
- Frontend: Next.js 16 + Tailwind — Railway
- Base de datos: Supabase (PostgreSQL)
- Telefonía: Twilio Voice (pago) — +19366550212
- Voz IA: ElevenLabs Starter (FGY2WhTYpPnrIDTdsKH5)
- LLM: Claude claude-sonnet-4-5
- Speech Recognition: Deepgram nova-2 (conectado, pendiente transcripción)
- WhatsApp: Twilio Sandbox

## 🔑 URLs de producción
- Frontend: https://merry-tenderness-production-806f.up.railway.app
- Backend: https://voiceagent-production-081f.up.railway.app
- GitHub: https://github.com/robcas0180ai/voiceagent
- Supabase: ivxyqpxcudklkvksbqyd

## 🔑 Credenciales
- admin@acme.com / Password123!
- Tenant: Acme Corp (a4dfd65a-c823-4197-91e0-57ea46bf336b)
- Número verificado: +528120746187

## ⏭️ Siguiente sesión
1. Cambiar track a "inbound_track" explícito o "both_tracks"
2. Verificar que Deepgram recibe los chunks de audio correctamente
3. Agregar log del tamaño de chunks enviados a Deepgram
4. Probar conversación completa Roberto ↔ Lupita
