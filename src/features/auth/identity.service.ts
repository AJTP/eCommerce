import * as identityRepository from "./identity.repository.js";
import * as userService from "../users/user.service.js";
import { UnverifiedEmailError } from "./exceptions.js";
import type { Queryable, User, OAuthProfile } from "../../shared/types.js";
import type { PoolClient } from "pg";

export async function findOrCreateUserFromIdentity(
  pg: Queryable & { connect?(): Promise<PoolClient> },
  profile: OAuthProfile,
): Promise<User> {
  const { provider, providerUserId, email, emailVerified, name, avatarUrl } = profile;

  if (!emailVerified) {
    throw new UnverifiedEmailError(provider);
  }

  const identity = await identityRepository.findByProvider(pg, provider, providerUserId);

  if (identity) {
    return userService.getUserById(pg, identity.user_id);
  }

  const client = await (pg as any).connect();
  try {
    await client.query("BEGIN");

    let user = await userService.getUserByEmail(client as Queryable, email);

    if (!user) {
      user = await userService.createUser(client as Queryable, {
        name,
        email,
        avatarUrl,
      });
    }

    await identityRepository.create(client as Queryable, user.id, provider, providerUserId);

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
