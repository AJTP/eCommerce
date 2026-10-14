import crypto from "node:crypto";
import type { Queryable } from "../../shared/types.js";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function create(pg: Queryable, userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await pg.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(rawToken), expiresAt],
  );

  return rawToken;
}

export async function findValid(
  pg: Queryable,
  rawToken: string,
): Promise<{ id: string; user_id: string } | null> {
  const { rows } = await pg.query(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashToken(rawToken)],
  );
  return (rows[0] as { id: string; user_id: string } | undefined) || null;
}

export async function revoke(pg: Queryable, tokenId: string): Promise<void> {
  await pg.query("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", [tokenId]);
}

export async function revokeAllByUserId(pg: Queryable, userId: string): Promise<void> {
  await pg.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
}
