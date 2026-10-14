import { OAuth2Client } from "google-auth-library";
import config from "../../config/index.js";
import type { OAuthProfile } from "../../shared/types.js";

const client = new OAuth2Client(config.googleClientId);

// Verifica un id_token de Google y devuelve el perfil normalizado que
// espera identity.service.ts, independientemente del proveedor.
export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google token: no payload");
  }

  return {
    provider: "google",
    providerUserId: payload.sub,
    email: payload.email || "",
    emailVerified: payload.email_verified === true || String(payload.email_verified) === "true",
    name: payload.name || "User",
    avatarUrl: payload.picture || null,
  };
}
