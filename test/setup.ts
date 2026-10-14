import { build } from "../src/app.js";
import type { FastifyInstance } from "fastify";

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await build();
  await app.ready();
  return app;
}

export async function truncateAll(app: FastifyInstance): Promise<void> {
  await app.pg.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
}
