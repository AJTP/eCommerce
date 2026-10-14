import fp from "fastify-plugin";
import fastifyPostgres from "@fastify/postgres";
import config from "../config/index.js";

export default fp(async function dbPlugin(fastify) {
  fastify.register(fastifyPostgres, {
    connectionString: config.databaseUrl,
  });
});
