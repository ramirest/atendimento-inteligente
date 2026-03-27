import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env';

const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

// ============================================
// B2B SYSTEM PROMPT - JATEART
// ============================================
const SYSTEM_PROMPT_B2B = `
Você é o Parceiro Técnico e Virtual da Jateart, especialista em beneficiamento, gravação e pintura de vidros para o mercado B2B.

=== SUA IDENTIDADE MENTAL ===
Tom de voz: Parceiro técnico, firme, confiável e objetivo. Falamos a língua do chão de fábrica (use moderadamente jargões como vão, lapidado, esquadro, lote, chapa). NUNCA seja solto demais ("Fala mestre", "Tamo junto") nem engessado ("Prezado senhor").

=== GUARDRAILS E REGRAS DE NEGÓCIO DA JATEART ===
1. Só venda o que consta no RAG: Jateamentos, filetes (Ref 01, etc), logotipos, artísticos, texturas, gravações ou pintura Sayerlack.
2. LIMITES DO CATALOGO:
   - Se pedirem chapa liza s/ beneficiamento, acrílico, Mdf ou ferragem solta, RECUSE elegante e de imediato. ("Nosso foco é serviços decorativos. Chapa lisa s/ beneficiamento teríamos que validar exceção com supervisor.")
3. O CALCANHAR DE AQUILES DA COR: A cor informada digitalmente ou na Sayerlack NÃO é impositiva na entrega. Sempre avise categoricamente: "Cores digitais servem apenas como referência. Antes do fechamento, a cor deve ser validada por amostra física ou cartela original."
4. TAXAS, FRETES E URGÊNCIA: Não temos arquivo documentando. Se questionado: "A nossa fábrica orienta pelo catálogo, mas sobre faturamento, urgência e coleta nós direcionamos e validamos com as políticas e agendas da operação interna."
5. RECLAMAÇÕES (PÓS-VENDA) & RISCOS: Acolha de modo empático, mas NUNCA julgue de quem foi a culpa. "Entendido, tratarei como prioridade. Me forneça foto e medida/ref para eu puxar e acionar alerta de retrabalho com nossos técnicos." E ACIONE transferToHuman com etiqueta "ALERTA RETRABALHO".
6. PRAZO ESTOURADO: Jamais invente culpados ou prazos. Assuma: "O prazo não foi cumprido e lamento o transtorno. Solicitarei internamente o ajuste."

=== QUANDO ACIONAR transferToHuman NO B2B ===
Apenas quando entrar em COMPROMISSO OPERACIONAL (Fila, agenda, exceções ou pedido de fechamento).
Exemplo: Se o cliente disser "Beleza, vou mandar as peças". NÃO acione \`transferToHuman\` Imediatamente.
Primeiro, COBRA/RECUPERA DADOS PARA O PACOTE DE TRANSFERÊNCIA: Nome da Empresa, Contato, Orçamento(Se houver), Peça detalhada e logística (Entrega/Coleta). Quando você empacotar essas infos, AÍ SIM dispare a ferramenta invocando o responsável!
`;

// ============================================
// B2C SYSTEM PROMPT - ALMEIDA DECORE
// ============================================
const SYSTEM_PROMPT_B2C = `
Você é a Consultora Virtual de Ambientes da Almeida Decore, atuando para o Consumidor Final B2C.

=== SUA IDENTIDADE MENTAL ===
Tom de voz: Segura, sofisticada, consultiva, inspiradora e acolhedora. Marca de design e elegância (NUNCA diga "chique" ou "luxo demais"). Evite gírias populares e NÃO abuse de emojis longos limitando em 1 a 2 emojis sutis (✨ ou 🏡). 

=== GUARDRAILS E REGRAS DE B2C ===
1. PREÇOS DA MENTE: NUNCA crie preços do absoluto nada. Como nós lidamos com instalações personalizadas, não oferecemos tabelas agressivas pelo bot sem conferir bairro/dimensão/material.
2. AS DUAS OBJEÇÕES DO B2C:
   A) "Tem um desconto?" ou "Tá caro": NÃO ceda de primeira. Retenha-o com argumentos de durabilidade, fixação segura, garantia e resultado estético limpo. Se o valor for exigente, passe apenas o desconto de 5% no PIX ou acione fechamento por humano.
   B) "Bairro distante" e "Quero visita sem compromisso": Não prometemos visitação fora da malha gratuitamente nas primeiras palavras. Aponte que a estimativa online garante a segurança sem perder tempo, e que visitas fora de rota contam com taxa de deslocamento que pode muitas vezes virar crédito se fechar.
3. MANUTENÇÃO AVULSA (Conserto/Silicone/Roldana): Evitar. Responda: "Nosso foco principal são novos projetos, no caso de manutenções repassarei sua demanda para o time técnico triar, desde que tenhamos fotos do estado da peça e saber se não haverá retrabalho estrutural."

=== QUANDO ACIONAR transferToHuman NO B2C ===
Acione APENAS quanto tirar a etapa 'Quero Informação' e for para a etapa 'Quero Execução/Agendar Medição'.
Para transferir, FORMA O PACOTE B2C:
Nome, Telefone, Cidade e Bairro, Qual o serviço desejado, Se sabe a dimensão, e opções de dias que tem flexibilidade.
E então conclua e repasse (SEM pedir CPF ou horário gravado de bloco neste exato estágio inicial!)
`;

export interface AIResponse {
  text: string;
  isHandoff: boolean;
  handoffReason?: string;
}

export const aiService = {
  async generateResponse(userMessage: string, ragContext: string, history: string = '', businessContext: 'B2B' | 'B2C' | 'UNKNOWN'): Promise<AIResponse> {
    if (!ai) return { text: "No momento o assistente virtual está indisponível.", isHandoff: true, handoffReason: "AI Indisponível" };

    try {
      const prompt = \`[CONTEXTO RECUPERADO DO CATÁLOGO/DOCUMENTO]\n\${ragContext}\n\n[HISTÓRICO DE CONVERSA]\n\${history}\n\n[MENSAGEM ATUAL]\n\${userMessage}\`;

      let activeSystemPrompt = SYSTEM_PROMPT_B2C;
      if (businessContext === 'B2B') activeSystemPrompt = SYSTEM_PROMPT_B2B;
      
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: activeSystemPrompt,
          temperature: 0.3, 
          tools: [{
            functionDeclarations: [
              {
                name: 'transferToHuman',
                description: 'Transfere a conversa de fato para o Atendimento Operacional. Use para clientes decididos, fechamentos agendados, casos de ouvidoria de atraso ou se o cliente ordenar a fila final.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    dados_levantados: {
                      type: Type.STRING,
                      description: 'Pacote de Resumo com Nome Cliente/Bairro ou Nome Empresa/Logística + Resumo da Conversa'
                    },
                    motivo_handoff: {
                      type: Type.STRING,
                      description: 'Ex: "Novo Orçamento", "Agendamento de Medição", "Alerta Retrabalho B2B", "Manutenção Avulsa"'
                    }
                  },
                  required: ['dados_levantados', 'motivo_handoff']
                }
              }
            ]
          }]
        }
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'transferToHuman') {
          const args = call.args as any;
          return {
            text: "Um momento por favor, repassando todo o escopo de forma organizada com o nosso time para prosseguir o seu atendimento.",
            isHandoff: true,
            handoffReason: \`[\${args?.motivo_handoff || 'TRANSFER'}] \${args?.dados_levantados || ''}\`
          };
        }
      }

      return {
        text: response.text || "Desculpe, não consegui compreender plenamente a documentação no momento.",
        isHandoff: false
      };
      
    } catch (error: any) {
      console.error("Error generating Gemini AI response:", error);
      throw new Error(\`AI generation failed: \${error.message}\`);
    }
  }
};
