import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";
import config from "../config/index.js";

export default fp(async function corsPlugin(fastify) {
  await fastify.register(fastifyCors, {
    origin: config.corsOrigin,
  });
});
