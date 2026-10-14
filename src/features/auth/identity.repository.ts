import type { Queryable } from "../../shared/types.js";

export async function findByProvider(
  pg: Queryable,
  provider: string,
  providerUserId: string,
): Promise<{ user_id: string } | null> {
  const { rows } = await pg.query(
    "SELECT user_id FROM identities WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId],
  );
  return (rows[0] as { user_id: string } | undefined) || null;
}

export async function create(
  pg: Queryable,
  userId: string,
  provider: string,
  providerUserId: string,
): Promise<void> {
  await pg.query(
    "INSERT INTO identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)",
    [userId, provider, providerUserId],
  );
}
