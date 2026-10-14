import "fastify";
import "@fastify/jwt";
import { Pool } from "pg";
import type { FastifyRequest, FastifyReply } from "fastify";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "test" | "production";
      PORT?: string;
      HOST?: string;
      LOG_LEVEL?: string;
      DATABASE_URL: string;
      GOOGLE_CLIENT_ID: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN?: string;
      CORS_ORIGIN?: string;
      AUTH_RATE_LIMIT_MAX?: string;
      AUTH_RATE_LIMIT_WINDOW?: string;
      STRICT_SSL?: string;
    }
  }
}

declare module "fastify" {
  interface FastifyInstance {
    pg: Pool;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    ensureOwnParams: (
      idParam?: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
    };
    user: {
      id: string;
      email: string;
    };
  }
}
