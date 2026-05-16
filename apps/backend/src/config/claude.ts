import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export const generateResponse = async (
  userMessage: string,
  agentConfig: {
    agentName: string;
    companyName: string;
    productDescription: string;
    objections: string;
    tone: string;
  },
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  const systemPrompt = `Eres ${agentConfig.agentName}, un agente de ventas de ${agentConfig.companyName}.
Tu tono es: ${agentConfig.tone}.
Producto que ofreces: ${agentConfig.productDescription}.
Manejo de objeciones: ${agentConfig.objections}.

Reglas importantes:
- Habla SIEMPRE en español mexicano
- Sé conciso, máximo 3 oraciones por respuesta
- Si el cliente está interesado, agenda una cita o pide sus datos
- Si el cliente no está interesado, agradece su tiempo amablemente
- Detecta el resultado: interesado, no_interesado, agendar_cita, llamar_despues`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
};
