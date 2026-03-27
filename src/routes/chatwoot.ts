import { FastifyInstance } from 'fastify';
import { webhookController } from '../controllers/webhookController';

export default async function chatwootRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook/chatwoot', webhookController.handleChatwootEvent);
}
