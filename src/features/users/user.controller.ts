import * as userService from "./user.service.js";
import { toUserResponse } from "./user.schema.js";
import type { getUserSchema } from "./user.schema.js";
import type { ZodReply, ZodRequest } from "../../shared/fastify-types.js";

export async function getUser(
  request: ZodRequest<typeof getUserSchema>,
  reply: ZodReply<typeof getUserSchema>,
): Promise<void> {
  const user = await userService.getUserById(request.server.pg, request.params.id);
  reply.send(toUserResponse(user));
}
