import Fastify from 'fastify';
import { env } from './config/env';
import chatwootRoutes from './routes/chatwoot';

const startServer = async () => {
  const fastify = Fastify({
    logger: true
  });

  fastify.get('/', async (request, reply) => {
    return { status: 'ok', message: 'Almeida Atendimento Inteligente - Webhook Middleware is running.' };
  });

  // Register routes
  fastify.register(chatwootRoutes);

  try {
    await fastify.listen({ port: parseInt(env.PORT, 10), host: '0.0.0.0' });
    console.log(`Server is running at http://localhost:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
