import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";

// Test aislado: recarga la app con un AUTH_RATE_LIMIT_MAX bajo propio, para
// no compartir contador con auth.test.ts (que usa el límite alto de
// .env.test) ni depender de cuántas llamadas a /auth/google haga esa otra
// suite.
describe("auth rate limiting", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.resetModules();
    process.env.AUTH_RATE_LIMIT_MAX = "2";
    process.env.AUTH_RATE_LIMIT_WINDOW = "1 minute";

    const { build } = await import("../src/app.js");
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.AUTH_RATE_LIMIT_WINDOW;
    vi.resetModules();
  });

  it("blocks /auth/google once the configured max is exceeded", async () => {
    const attempt = () =>
      app.inject({
        method: "POST",
        url: "/auth/google",
        // Token con formato inválido: falla localmente sin llamar a Google,
        // así el test es offline y rápido.
        payload: { id_token: "not-a-real-token" },
      });

    const first = await attempt();
    const second = await attempt();
    const third = await attempt();

    expect(first.statusCode).not.toBe(429);
    expect(second.statusCode).not.toBe(429);
    expect(third.statusCode).toBe(429);
  });
});
