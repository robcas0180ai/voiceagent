# VoiceAgent — Estado del proyecto

## Última actualización: Fase 4 completada — En producción

## ✅ Completado
- Node.js 24 + npm + Git + Homebrew instalados
- Repo GitHub: https://github.com/robcas0180ai/voiceagent
- Servidor Express + TypeScript corriendo en puerto 3001
- Supabase conectado — 7 tablas creadas
- Autenticación JWT completa
- CRUD completo de campañas y contactos
- Twilio Voice — llamadas salientes funcionando
- ElevenLabs — audio en español funcionando
- Claude — conversación IA funcionando
- WhatsApp — configurado, número verificado
- Frontend Next.js completo: Login, Dashboard, Campañas, Pipeline, Agente IA
- Importación CSV con normalización automática de teléfonos México
- Borrar contacto con validación (no permite borrar si tiene llamadas)
- Formulario manual con prefijo 🇲🇽 +52 automático
- Deploy en producción Railway:
  - Backend: https://voiceagent-production-081f.up.railway.app
  - Frontend: https://merry-tenderness-production-806f.up.railway.app

## ⚠️ Pendiente para producción real
- Upgrade Twilio ($20 USD) — llamadas a cualquier número
- Dominio personalizado
- Página de registro multi-tenant
- Stripe billing

## 🔧 Stack activo
- Backend: Node.js + Express + TypeScript — Railway
- Frontend: Next.js 16 + Tailwind — Railway
- Base de datos: Supabase (PostgreSQL)
- Auth: JWT + bcrypt
- Telefonía: Twilio Voice (trial)
- Voz IA: ElevenLabs (voz Laura - FGY2WhTYpPnrIDTdsKH5)
- LLM: Claude claude-sonnet-4-20250514
- WhatsApp: Twilio Sandbox (+14155238886)

## 🔑 URLs de producción
- Frontend: https://merry-tenderness-production-806f.up.railway.app
- Backend: https://voiceagent-production-081f.up.railway.app
- GitHub: https://github.com/robcas0180ai/voiceagent
- Supabase: ivxyqpxcudklkvksbqyd
- WhatsApp From: whatsapp:+14155238886
- WhatsApp To: whatsapp:+5218123541634

## ⏭️ Siguiente sesión
- Upgrade Twilio
- Dominio personalizado
- Página de registro para nuevos clientes
- Stripe billing
- Grabaciones de llamadas
- Métricas de uso por tenant
