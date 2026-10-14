import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";

export default fp(async function authorizationPlugin(fastify) {
  fastify.decorate("ensureOwnParams", function (idParam = "id") {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as Record<string, string>;
      if (request.user.id !== params[idParam]) {
        reply.status(403).send({
          error: "Forbidden",
          message: "You cannot access this resource",
        });
      }
    };
  });
});
