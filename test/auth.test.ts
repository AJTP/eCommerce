import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { buildTestApp, truncateAll } from "./setup.js";
import type { FastifyInstance } from "fastify";

const mockVerifyIdToken = vi.hoisted(() => vi.fn());

vi.mock("../src/features/providers/google.js", () => ({
  verifyGoogleIdToken: mockVerifyIdToken,
}));

function mockGoogleProfile(overrides: Record<string, unknown> = {}): void {
  mockVerifyIdToken.mockResolvedValueOnce({
    provider: "google",
    providerUserId: "google-123",
    email: "ada@example.com",
    emailVerified: true,
    name: "Ada Lovelace",
    avatarUrl: "https://example.com/ada.jpg",
    ...overrides,
  });
}

describe("auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    mockVerifyIdToken.mockReset();
    await truncateAll(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/google creates a new user on first login", async () => {
    mockGoogleProfile();

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("POST /auth/google logs in the same user on subsequent logins", async () => {
    mockGoogleProfile();
    const first = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    mockGoogleProfile();
    const second = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    const firstBody = first.json() as any;
    const secondBody = second.json() as any;
    expect(firstBody.user.id).toBe(secondBody.user.id);
  });

  it("POST /auth/google rejects an invalid Google token", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("invalid token"));

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "invalid-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("POST /auth/google rejects an unverified email", async () => {
    mockGoogleProfile({ emailVerified: false });

    const response = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("GET /auth/me without a token returns 401", async () => {
    const response = await app.inject({ method: "GET", url: "/auth/me" });

    expect(response.statusCode).toBe(401);
  });

  it("GET /auth/me with a valid token returns the current user profile", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const loginBody = loginResponse.json() as any;
    const { accessToken, user } = loginBody;

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: user.id,
      email: user.email,
    });
  });

  it("POST /auth/refresh issues a new token pair", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const loginBody = loginResponse.json() as any;
    const { refreshToken } = loginBody;

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it("POST /auth/refresh rejects an unknown refresh token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: "does-not-exist" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("POST /auth/refresh rejects a reused (already rotated) refresh token", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const loginBody = loginResponse.json() as any;
    const { refreshToken } = loginBody;

    await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });

    expect(response.statusCode).toBe(401);
  });

  it("POST /auth/logout revokes every refresh token of the user", async () => {
    mockGoogleProfile();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { id_token: "valid-token" },
    });
    const loginBody = loginResponse.json() as any;
    const { accessToken, refreshToken } = loginBody;

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(logoutResponse.statusCode).toBe(204);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh_token: refreshToken },
    });
    expect(refreshResponse.statusCode).toBe(401);
  });

  it("POST /auth/logout without a token returns 401", async () => {
    const response = await app.inject({ method: "POST", url: "/auth/logout" });

    expect(response.statusCode).toBe(401);
  });
});
