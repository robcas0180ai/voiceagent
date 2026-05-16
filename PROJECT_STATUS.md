# VoiceAgent — Estado del proyecto

## Última actualización: Fase 3 completada — Frontend listo

## ✅ Completado
- Node.js 24 + npm + Git + Homebrew instalados
- Repo GitHub: https://github.com/robcas0180ai/voiceagent
- Servidor Express + TypeScript corriendo en puerto 3001
- Supabase conectado correctamente
- 7 tablas creadas: tenants, users, agent_configs, campaigns, contacts, calls, whatsapp_notifications
- Autenticación JWT completa
- CRUD completo de campañas y contactos
- Twilio integrado — llamadas salientes funcionando
- ElevenLabs integrado — audio en español funcionando
- Claude (Anthropic) integrado — conversación IA funcionando
- ✅ Frontend Next.js completo:
  - Login
  - Dashboard con métricas
  - Campañas con CRUD
  - Detalle de campaña con contactos y botón llamar
  - Pipeline CRM con stages
  - Configuración del Agente IA
- ⚠️ Twilio trial limita Gather speech — se resuelve con upgrade

## 🔧 Stack activo
- Backend: Node.js + Express + TypeScript (puerto 3001)
- Frontend: Next.js 16 + Tailwind (puerto 3000)
- Base de datos: Supabase (PostgreSQL)
- Auth: JWT + bcrypt
- Telefonía: Twilio Voice
- Voz IA: ElevenLabs (voz Laura - FGY2WhTYpPnrIDTdsKH5)
- LLM: Claude claude-sonnet-4-20250514
- Túnel local: ngrok

## 📁 Estructura
voiceagent/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config/database.ts + claude.ts
│   │   │   ├── controllers/ (auth, campaigns, contacts, calls, agent)
│   │   │   └── routes/ (auth, campaigns, calls, agent)
│   │   ├── public/audio/
│   │   └── .env
│   └── frontend/
│       ├── app/
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── campaigns/ + [id]/
│       │   ├── pipeline/
│       │   └── agent/
│       └── lib/api.ts
└── PROJECT_STATUS.md

## 🔑 Datos de prueba activos
- Tenant: Acme Corp (a4dfd65a-c823-4197-91e0-57ea46bf336b)
- Campaña: Campaña Seguros Junio (9321f89b-54ed-4db9-8475-dfbb2da9b028)
- Contacto prueba: Roberto Castillo (fe3e70d3-c4f6-4825-b62f-7583ccc677e4)

## ⏭️ Siguiente sesión
Fase 4 Semana 12: Stripe billing + notificaciones WhatsApp + deploy Railway

## 🔑 Servicios activos
- Supabase: ivxyqpxcudklkvksbqyd
- GitHub: robcas0180ai/voiceagent
- Twilio: número USA activo (trial)
- ElevenLabs: voz Laura multilingual
- Claude: claude-sonnet-4-20250514
- ngrok: sphinx-useable-squad.ngrok-free.dev
