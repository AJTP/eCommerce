import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import config from "../config/index.js";

export default fp(async function jwtPlugin(fastify) {
  fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: "Unauthorized", message: "Invalid or expired token" });
    }
  });
});
