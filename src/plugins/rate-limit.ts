import fp from "fastify-plugin";
import fastifyRateLimit from "@fastify/rate-limit";

// global: false -> no limita nada por defecto; cada ruta que quiera límite
// lo declara explícitamente con `config: { rateLimit: { ... } }` (ver
// src/features/auth/auth.routes.ts para /auth/google y /auth/refresh).
export default fp(async function rateLimitPlugin(fastify) {
  await fastify.register(fastifyRateLimit, {
    global: false,
  });
});
