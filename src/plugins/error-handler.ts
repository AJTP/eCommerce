import fp from "fastify-plugin";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export default fp(async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler(function (
    error: FastifyError & { validation?: unknown; details?: unknown },
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const statusCode = error.statusCode || 500;

    request.log.error({ err: error }, "request error");

    if (error.validation) {
      reply.status(400).send({
        error: "Bad Request",
        message: error.message,
        details: error.validation,
      });
      return;
    }

    const isAppException = error.name && error.name !== "Error";

    const response: Record<string, unknown> = {
      error: statusCode === 500 ? "Internal Server Error" : error.name || "Error",
      message: statusCode === 500 ? "Something went wrong" : error.message,
    };

    if (isAppException && error.details) {
      response.details = error.details;
    }

    reply.status(statusCode).send(response);
  });

  fastify.setNotFoundHandler(function (request: FastifyRequest, reply: FastifyReply) {
    reply.status(404).send({
      error: "Not Found",
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
});
