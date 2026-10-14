import type { Queryable, User } from "../../shared/types.js";

export async function findById(pg: Queryable, userId: string): Promise<User | null> {
  const { rows } = await pg.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
    [userId],
  );
  const row = rows[0] as any;
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        createdAt: new Date(row.created_at),
      }
    : null;
}

export async function findByEmail(pg: Queryable, email: string): Promise<User | null> {
  const { rows } = await pg.query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE email = $1",
    [email],
  );
  const row = rows[0] as any;
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        createdAt: new Date(row.created_at),
      }
    : null;
}

export async function create(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  const { name, email, avatarUrl } = userData;
  const { rows } = await pg.query(
    "INSERT INTO users (name, email, avatar_url) VALUES ($1, $2, $3) RETURNING id, name, email, avatar_url, created_at",
    [name, email, avatarUrl],
  );
  const row = rows[0] as any;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
  };
}
