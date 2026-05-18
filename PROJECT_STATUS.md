# VoiceAgent — Estado del proyecto

## Última actualización: Fase B completada - Speech Recognition pendiente

## ✅ Completado
- Backend + Frontend en producción (Railway)
- Autenticación JWT
- CRUD campañas y contactos
- Importación CSV con normalización México
- Twilio de pago — llama a cualquier número mexicano
- ElevenLabs Starter — Lupita habla en español en producción ✅
- Pipeline automático — mueve contactos por etapa
- Botón iniciar campaña completa
- Resumen y resultado visible en dashboard
- Página de llamadas con filtros
- Configuración del agente (Lupita/CECOSUR)
- Navbar compartido en todas las páginas
- Métricas de uso
- Grabaciones (webhook configurado, pendiente verificar guardado)

## ❌ Pendiente crítico
- Speech Recognition — SpeechResult llega undefined
  - Gather envuelve Play pero sigue sin transcribir
  - Siguiente paso: Twilio Media Streams + Deepgram

## 🔧 Stack activo
- Backend: Node.js + Express + TypeScript — Railway
- Frontend: Next.js 16 + Tailwind — Railway
- Base de datos: Supabase (PostgreSQL)
- Telefonía: Twilio Voice (pago) — +19366550212
- Voz IA: ElevenLabs Starter (FGY2WhTYpPnrIDTdsKH5)
- LLM: Claude claude-sonnet-4-5
- WhatsApp: Twilio Sandbox

## 🔑 URLs de producción
- Frontend: https://merry-tenderness-production-806f.up.railway.app
- Backend: https://voiceagent-production-081f.up.railway.app
- GitHub: https://github.com/robcas0180ai/voiceagent
- Supabase: ivxyqpxcudklkvksbqyd

## 🔑 Credenciales de prueba
- Email: admin@acme.com / Password123!
- Tenant: Acme Corp
- Número verificado: +528120746187

## ⏭️ Siguiente sesión
1. Implementar Twilio Media Streams + Deepgram para speech recognition real
2. Verificar grabaciones en Supabase
3. Dominio personalizado
4. Registro multi-tenant
