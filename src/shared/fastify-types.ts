import type {
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

// Request/Reply tipados a partir del schema Zod de la ruta: permiten escribir
// controllers en archivos separados sin casts (`request.body` ya llega tipado).
export type ZodRequest<S extends FastifySchema> = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  S,
  ZodTypeProvider
>;

export type ZodReply<S extends FastifySchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  unknown,
  S,
  ZodTypeProvider
>;
