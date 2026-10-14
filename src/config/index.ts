import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .regex(/^[0-9]+$/)
    .default("3000"),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1h"),
  CORS_ORIGIN: z.string().default("*"),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .regex(/^[0-9]+$/)
    .default("10"),
  AUTH_RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  STRICT_SSL: z.string().optional(),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  const errors = envResult.error.issues
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${errors}`);
}

const env = envResult.data;

// En redes con proxy que intercepta TLS (p. ej. Netskope), STRICT_SSL=false
// también desactiva la verificación de certificados en las llamadas HTTPS
// salientes en runtime (no solo al instalar dependencias), necesaria para
// que google-auth-library pueda descargar los certificados de verificación
// de Google.
if (env.STRICT_SSL === "false") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// CORS_ORIGIN admite "*" (cualquier origen), un origen único o varios
// separados por comas.
function parseCorsOrigin(value: string): boolean | string | string[] {
  if (value === "*") return true;
  if (value.includes(",")) return value.split(",").map((origin) => origin.trim());
  return value;
}

export interface Config {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  isTest: boolean;
  port: number;
  host: string;
  logLevel: string;
  databaseUrl: string;
  googleClientId: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: boolean | string | string[];
  authRateLimitMax: number;
  authRateLimitWindow: string;
}

const config: Config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: Number(env.PORT),
  host: env.HOST,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  googleClientId: env.GOOGLE_CLIENT_ID,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
  authRateLimitMax: Number(env.AUTH_RATE_LIMIT_MAX),
  authRateLimitWindow: env.AUTH_RATE_LIMIT_WINDOW,
};

export default config;
