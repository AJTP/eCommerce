export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface Identity {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

// Tipo auxiliar para pasar al repositorio (Pool o Client con método query)
export type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};
