import * as userRepository from "./user.repository.js";
import { UserNotFoundError } from "./exceptions.js";
import type { Queryable, User } from "../../shared/types.js";

export async function getUserById(pg: Queryable, userId: string): Promise<User> {
  const user = await userRepository.findById(pg, userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  return user;
}

export async function getUserByEmail(pg: Queryable, email: string): Promise<User | null> {
  return userRepository.findByEmail(pg, email);
}

export async function createUser(
  pg: Queryable,
  userData: { name: string; email: string; avatarUrl: string | null },
): Promise<User> {
  return userRepository.create(pg, userData);
}
