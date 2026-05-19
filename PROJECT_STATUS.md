# VoiceAgent — Estado del proyecto

## Última actualización: Conversación completa funcionando - métricas pendientes

## ✅ Completado
- Backend + Frontend en producción (Railway)
- Twilio de pago — llama a cualquier número mexicano
- ElevenLabs turbo — Lupita habla en español con baja latencia
- Deepgram nova-2 — speech recognition en tiempo real
- Claude sonnet-4-5 — conversación IA completa
- Grabaciones funcionando — proxy autenticado, se escuchan en el frontend
- Pipeline automático — mueve contactos por stage
- AMD — detección de buzón de voz
- Dashboard, métricas, campañas, pipeline CRM, llamadas
- Navbar compartido en todas las páginas
- Precios en pesos mexicanos
- Datos confirmados antes de marcar interesado

## ❌ Pendiente
- Métricas: todas las llamadas quedan en status 'initiated' y duration 0
  - El webhook de Twilio statusCallback no actualiza correctamente
  - Busca status='initiated' pero ya cambió antes de que llegue el webhook
  - Siguiente paso: cambiar la lógica de actualización en callStatus

## 🔧 Stack activo
- Backend: Node.js + Express + TypeScript — Railway
- Frontend: Next.js 16 + Tailwind — Railway
- Base de datos: Supabase (PostgreSQL)
- Telefonía: Twilio Voice (pago) — +19366550212
- Voz IA: ElevenLabs Starter — eleven_turbo_v2_5
- LLM: Claude claude-sonnet-4-5
- Speech Recognition: Deepgram nova-2
- WhatsApp: Twilio Sandbox

## 🔑 URLs de producción
- Frontend: https://merry-tenderness-production-806f.up.railway.app
- Backend: https://voiceagent-production-081f.up.railway.app
- GitHub: https://github.com/robcas0180ai/voiceagent
- Supabase: ivxyqpxcudklkvksbqyd

## 🔑 Credenciales
- admin@acme.com / Password123!
- Número Twilio: +19366550212
- Número verificado: +528120746187

## ⏭️ Siguiente sesión
1. Corregir callStatus webhook — actualizar por call_sid en lugar de status='initiated'
2. Verificar minutos en métricas
3. Fase C — dominio personalizado, registro multi-tenant, Stripe
