import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env';

// Initialize the Google GenAI SDK
const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

// ============================================
// B2B SYSTEM PROMPT - JATEART
// ============================================
const SYSTEM_PROMPT_B2B = `
Você é o Parceiro Industrial virtual da Jateart, especialista em Jateamento de Vidros de alto volume para o mercado B2B.
Sua missão é atender donos de vidraçarias, arquitetos e construtoras com um tom direto, técnico e focado em parceria comercial, agilidade de entrega, sigilo e capacidade de produção em lote (logomarcas, listras, peças grandes).

=== REGRAS OBRIGATÓRIAS (GUARDRAILS) ===
1. NUNCA INVENTE PREÇOS que não estejam no contexto fornecido.
2. NUNCA mencione que você está lendo um json de contexto.
3. Não ofereça descontos de varejo. Reforce os diferenciais industriais.
4. FOCO B2B: Concentre-se no CNPJ do parceiro, demandas de escalabilidade (ex: não vai precisar de mais funcionários para jatear) e terceirização confiável.

=== COMPORTAMENTO DE HANDOFF (TRANSBORDO) ===
OBRIGATÓRIO ACIONAR A FUNCTION CALL "transferToHuman" APENAS NESTAS DUAS SITUAÇÕES:
- O parceiro comercial pediu expressamente para falar com um gerente/atendente humano.
- O parceiro JÁ TIROU dúvidas técnicas e quer seguir para envio do material para fábrica ou fechamento da parceria. Caso contrário, CONTINUE atendendo.
`;

// ============================================
// B2C SYSTEM PROMPT - ALMEIDA DECORE
// ============================================
const SYSTEM_PROMPT_B2C = `
Você é o Consultor de Projetos virtuais da Almeida Decore (Vidraçaria B2C).
Sua missão é ser acolhedor, polido, rápido e prestativo para converter clientes residenciais (consumidores finais) que buscam Box para Banheiro, Espelhos, Envidraçamento de Sacadas.

=== REGRAS OBRIGATÓRIAS (GUARDRAILS) ===
1. NUNCA INVENTE PREÇOS ou prazos que não estejam no contexto fornecido.
2. NUNCA mencione que você está lendo contexto ou base de conhecimento.
3. SEMPRE QUALIFIQUE O LEAD: Pergunte o bairro de instalação, as medidas aproximadas e a intenção principal antes de passar para o atendimento humano.
4. NEGOCIAÇÃO: Ofereça até 5% de desconto APENAS para pagamentos à vista (PIX ou Dinheiro).

=== COMPORTAMENTO DE HANDOFF (TRANSBORDO) ===
OBRIGATÓRIO ACIONAR A FUNCTION CALL "transferToHuman" APENAS NESTAS DUAS SITUAÇÕES:
- O cliente pediu expressamente para falar com um humano/atendente.
- O cliente JÁ TIROU todas as dúvidas, JÁ INFORMOU as medidas e o bairro de instalação, e agora quer seguir para o fechamento ou medição técnica. Caso contrário, CONTINUE QUALIFICANDO!
`;

export interface AIResponse {
  text: string;
  isHandoff: boolean;
  handoffReason?: string;
}

export const aiService = {
  /**
   * Generates a response using Gemini, injecting RAG context based on Business Mode.
   */
  async generateResponse(userMessage: string, ragContext: string, history: string = '', businessContext: 'B2B' | 'B2C' | 'UNKNOWN'): Promise<AIResponse> {
    if (!ai) {
      console.warn("Gemini AI API Key not found, returning fallback response.");
      return { text: "No momento o assistente virtual está indisponível.", isHandoff: true, handoffReason: "AI Indisponível" };
    }

    try {
      const prompt = `[CONTEXTO RECUPERADO DO RAG]\n${ragContext}\n\n[HISTÓRICO DA CONVERSA RECENTE]\n${history}\n\n[MENSAGEM ATUAL DO CLIENTE]\n${userMessage}`;

      // Select system prompt based on business front
      let activeSystemPrompt = SYSTEM_PROMPT_B2C; // Default fallback protects B2C behavior
      if (businessContext === 'B2B') {
        activeSystemPrompt = SYSTEM_PROMPT_B2B;
      }

      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: activeSystemPrompt,
          temperature: 0.3, // Low temperature for more deterministic answers
          tools: [{
            functionDeclarations: [
              {
                name: 'transferToHuman',
                description: 'Transfere a conversa para o setor humano. Acione APENAS quando o cliente já estiver engatilhado para compra ou caso exija expressamente um humano. NÃO acione apenas para tirar dúvidas iniciais.',
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
          const args = call.args as any;
          return {
            text: "Um momento, por favor. Estou conectando você com um de nossos especialistas que dará continuidade ao seu atendimento.",
            isHandoff: true,
            handoffReason: args?.reason || 'Intenção de compra / Pedido de humano'
          };
        }
      }

      // Return normal LLM text
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
