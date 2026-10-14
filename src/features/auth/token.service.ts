import * as refreshTokenRepository from "./refresh-token.repository.js";
import type { Queryable } from "../../shared/types.js";

export async function issueRefreshToken(pg: Queryable, userId: string): Promise<string> {
  return refreshTokenRepository.create(pg, userId);
}

export async function rotateRefreshToken(
  pg: Queryable,
  rawToken: string,
): Promise<{ userId: string; refreshToken: string } | null> {
  const current = await refreshTokenRepository.findValid(pg, rawToken);

  if (!current) {
    return null;
  }

  await refreshTokenRepository.revoke(pg, current.id);
  const newRefreshToken = await issueRefreshToken(pg, current.user_id);

  return { userId: current.user_id, refreshToken: newRefreshToken };
}

export async function revokeAllRefreshTokens(pg: Queryable, userId: string): Promise<void> {
  return refreshTokenRepository.revokeAllByUserId(pg, userId);
}
