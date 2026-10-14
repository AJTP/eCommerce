import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import config from "./config/index.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import dbPlugin from "./plugins/db.js";
import jwtPlugin from "./plugins/jwt.js";
import authorizationPlugin from "./plugins/authorization.js";
import corsPlugin from "./plugins/cors.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import swaggerPlugin from "./plugins/swagger.js";
import authRoutes from "./features/auth/auth.routes.js";
import userRoutes from "./features/users/user.routes.js";
import healthRoutes from "./features/health/health.routes.js";
import type { FastifyServerOptions } from "fastify";

export async function build(opts: FastifyServerOptions = {}): Promise<ReturnType<typeof Fastify>> {
  const fastify = Fastify({
    logger: { level: config.logLevel },
    ...opts,
  });

  // Zod valida las entradas y serializa las respuestas de todas las rutas
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Plugins (swagger antes de las rutas para que las documente)
  await fastify.register(errorHandlerPlugin);
  await fastify.register(dbPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(authorizationPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(swaggerPlugin);

  // Load feature routes
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(healthRoutes);

  return fastify;
}
