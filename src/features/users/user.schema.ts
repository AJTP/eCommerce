import { z } from "zod";
import { errorResponseSchema } from "../../shared/schemas/common.schema.js";
import type { User } from "../../shared/types.js";

// Contrato público de la API (snake_case); el dominio usa camelCase.
export const userResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  avatar_url: z.string().nullable(),
  created_at: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt.toISOString(),
  };
}

export const getUserSchema = {
  tags: ["users"],
  summary: "Obtiene un usuario por ID",
  params: z.object({ id: z.uuid() }),
  response: {
    200: userResponseSchema,
    404: errorResponseSchema,
  },
};
