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
): Promise<{ text: string; result: string | null }> => {

  const systemPrompt = `Eres ${agentConfig.agentName}, un agente de ventas de ${agentConfig.companyName}.
Tu tono es: ${agentConfig.tone}.
Producto que ofreces: ${agentConfig.productDescription}.
Manejo de objeciones: ${agentConfig.objections}.

Reglas importantes:
- Habla SIEMPRE en español mexicano
- Sé conciso, máximo 3 oraciones por respuesta
- Si el cliente está interesado, agenda una cita o pide sus datos
- Si el cliente no está interesado, agradece su tiempo amablemente y despídete
- Si el cliente pide que llamen después, confirma y despídete

Al final de tu respuesta, en una línea separada escribe exactamente uno de estos códigos según la intención detectada:
RESULT:interesado
RESULT:no_interesado  
RESULT:callback
RESULT:continuar

Solo escribe RESULT: cuando la conversación llegue a una conclusión clara. Si la conversación sigue, escribe RESULT:continuar.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]
  });

  const fullText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extraer el resultado del texto
  const resultMatch = fullText.match(/RESULT:(interesado|no_interesado|callback|continuar)/);
  const result = resultMatch ? resultMatch[1] : 'continuar';

  // Limpiar el texto quitando la línea RESULT:
  const text = fullText.replace(/\nRESULT:(interesado|no_interesado|callback|continuar)/g, '').trim();

  return { text, result };
};

export const generateSummary = async (
  history: { role: string; content: string }[],
  contactName: string
): Promise<string> => {
  const conversation = history
    .map(h => `${h.role === 'assistant' ? 'Agente' : 'Cliente'}: ${h.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Resume en 2-3 oraciones esta conversación de ventas con ${contactName}. Indica el resultado final (interesado/no interesado/callback) y cualquier detalle importante mencionado:\n\n${conversation}`
    }]
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Sin resumen disponible';
};
