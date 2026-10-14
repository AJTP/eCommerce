import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import scalarApiReference from "@scalar/fastify-api-reference";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import config from "../config/index.js";

export default fp(async function swaggerPlugin(fastify) {
  if (config.isTest) {
    return;
  }

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Backend Boilerplate API",
        description:
          "API de autenticación con proveedores de identidad (Google, ...) y refresh tokens.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    // Convierte los schemas Zod de cada ruta a JSON Schema para el OpenAPI
    transform: jsonSchemaTransform,
  });

  await fastify.register(scalarApiReference, {
    routePrefix: "/reference",
  });
});
