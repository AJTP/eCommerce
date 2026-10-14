import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as authController from "./auth.controller.js";
import { googleLoginSchema, meSchema, refreshSchema, logoutSchema } from "./auth.schema.js";
import config from "../../config/index.js";

const authRateLimit = {
  max: config.authRateLimitMax,
  timeWindow: config.authRateLimitWindow,
};

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.post(
    "/auth/google",
    {
      schema: googleLoginSchema,
      config: { rateLimit: authRateLimit },
    },
    authController.googleLogin,
  );

  fastify.post(
    "/auth/refresh",
    {
      schema: refreshSchema,
      config: { rateLimit: authRateLimit },
    },
    authController.refreshAccessToken,
  );

  fastify.get(
    "/auth/me",
    { schema: meSchema, preHandler: [fastify.authenticate] },
    authController.getMe,
  );

  fastify.post(
    "/auth/logout",
    { schema: logoutSchema, preHandler: [fastify.authenticate] },
    authController.logout,
  );
}
