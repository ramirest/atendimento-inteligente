import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env';

// Initialize the Google GenAI SDK
const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

// System Prompt with strong guardrails and persona definitions
const SYSTEM_PROMPT = `
Você é o atendente especialista virtual da Almeida Decore (Vidraçaria B2C) e Jatearte (Jateamento B2B).
Sua missão é ser polido, rápido, prestativo e altamente persuasivo para converter leads.

=== REGRAS OBRIGATÓRIAS DE COMPORTAMENTO (GUARDRAILS) ===
1. NUNCA INVENTE PREÇOS OU PRAZOS que não estejam no contexto fornecido. Se você não tiver a resposta, diga que vai verificar ou repasse para um humano.
2. NUNCA mencione que você está "lendo um contexto" ou "JSON". Aja de forma natural.
3. SEMPRE QUALIFIQUE O LEAD de forma amigável: pergunte o bairro da instalação (para B2C), medidas aproximadas do local e intenção de projeto, se a informação já não tiver sido fornecida.
4. NEGOCIAÇÃO: Se o cliente pedir desconto, você tem autorização expressa da diretoria para oferecer no máximo 5% de desconto APENAS para pagamentos à vista (PIX ou Dinheiro).
5. COMPRIMENTO DAS RESPOSTAS: Seja conciso, humano e evite textos longos, você está atendendo via WhatsApp ou Widget.

=== COMPORTAMENTO DE HANDOFF (TRANSBORDO) ===
Se o cliente demonstrar intenção clara de compra (ex: "Quero fechar", "Vamos agendar", "Aceito a proposta"), ou se ele pedir expressamente para falar com um humano, você DEVE CESSAR de gerar respostas longas e OBRIGATORIAMENTE ACIONAR A FUNCTION CALL "transferToHuman". O motivo deve resumir por que o cliente está sendo transferido.
`;

export interface AIResponse {
  text: string;
  isHandoff: boolean;
  handoffReason?: string;
}

export const aiService = {
  /**
   * Generates a response using Gemini, injecting RAG context.
   */
  async generateResponse(userMessage: string, ragContext: string): Promise<AIResponse> {
    if (!ai) {
      console.warn("Gemini AI API Key not found, returning fallback response.");
      return { text: "No momento o assistente virtual está indisponível.", isHandoff: true, handoffReason: "AI Indisponível" };
    }

    try {
      const prompt = `[CONTEXTO RECUPERADO DO CATÁLOGO]\n${ragContext}\n\n[MENSAGEM DO CLIENTE]\n${userMessage}`;

      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.3, // Low temperature for more deterministic, factual answers
          tools: [{
            functionDeclarations: [
              {
                name: 'transferToHuman',
                description: 'Transfere a conversa para um atendente humano imediatamente. Use ONLY quando o cliente: apontar intenção clara de comprar/fechar orçamento, quando ele estiver com problemas complexos, ou quando pedir para falar com humano.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    reason: {
                      type: Type.STRING,
                      description: 'Resumo curto da razão pela qual a conversa está sendo transferida.'
                    }
                  },
                  required: ['reason']
                }
              }
            ]
          }]
        }
      });

      // Check if function call was triggered
      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'transferToHuman') {
          // A função foi chamada! Faremos o handoff.
          const args = call.args as any;
          return {
            text: "Um momento, por favor. Estou transferindo o seu atendimento para um de nossos especialistas que já vai continuar com você para fechar os detalhes do seu projeto.",
            isHandoff: true,
            handoffReason: args?.reason || 'Intenção de compra / Pedido de humano'
          };
        }
      }

      // Se não houver function call, retorna o texto normal gerado pela IA
      return {
        text: response.text || "Desculpe, não consegui entender.",
        isHandoff: false
      };
      
    } catch (error: any) {
      console.error("Error generating Gemini AI response:", error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
};
