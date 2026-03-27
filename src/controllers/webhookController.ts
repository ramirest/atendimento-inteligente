import { FastifyRequest, FastifyReply } from 'fastify';
import { chatwootService } from '../services/chatwootService';
import { ragService } from '../services/ragService';
import { aiService } from '../services/aiService';

export const webhookController = {
  async handleChatwootEvent(request: FastifyRequest, reply: FastifyReply) {
    const event: any = request.body;

    // Verify it's a message created event
    if (event.event !== 'message_created') {
      return reply.code(200).send({ status: 'ignored', reason: 'Not a message_created event' });
    }

    // Extract message payload
    const messageType = event.message_type; // 'incoming' = from customer, 'outgoing' = from agent
    const isPrivate = event.private;
    const content = event.content;
    const conversationId = event.conversation.id;

    // RULE 1: Ignore private notes
    if (isPrivate) {
      return reply.code(200).send({ status: 'ignored', reason: 'Private note' });
    }

    // RULE 2: Prevent infinite loop. We only respond to 'incoming' messages (from human customers)
    if (messageType !== 'incoming') {
      return reply.code(200).send({ status: 'ignored', reason: 'Message is not from customer' });
    }

    console.log(`Received incoming message from conversation ${conversationId}: ${content}`);

    try {
      // Handoff Detection Logic
      // For instance, if user types "falar com atendente" or "humano"
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('atendente') || lowerContent.includes('humano')) {
        console.log(`[Handoff] Transferring conversation ${conversationId} to a human agent.`);
        
        await chatwootService.sendMessage(conversationId, 'Transferindo você para um de nossos atendentes. Aguarde um momento.', false);
        await chatwootService.assignToHuman(conversationId);
        
        return reply.code(200).send({ status: 'success', action: 'handoff' });
      }

      // AI Integration Logic with RAG and Gemini
      console.log(`[AI] Retrieving context for conversation ${conversationId}...`);
      const context = ragService.retrieveContext(content);

      console.log(`[AI] Generating response using Gemini for conversation ${conversationId}...`);
      const aiResponseData = await aiService.generateResponse(content, context);
      
      // Check if Gemini decided to handoff to human
      if (aiResponseData.isHandoff) {
         console.log(`[Handoff via AI Tool] Transferring conversation ${conversationId}. Reason: ${aiResponseData.handoffReason}`);
         await chatwootService.sendMessage(conversationId, aiResponseData.text, false);
         await chatwootService.assignToHuman(conversationId);
         return reply.code(200).send({ status: 'success', action: 'handoff_by_ai', reason: aiResponseData.handoffReason });
      }

      console.log(`[AI] Replying to conversation ${conversationId}...`);
      await chatwootService.sendMessage(conversationId, aiResponseData.text, false);
      
      return reply.code(200).send({ status: 'success', action: 'ai_replied' });
    } catch (error) {
      console.error('Error handling webhook event:', error);
      return reply.code(500).send({ status: 'error', message: 'Internal Server Error' });
    }
  }
};
