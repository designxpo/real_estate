// Google OAuth (web, authorization-code flow) for the broker portal. Inactive
// until GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set — same dev-gating pattern
// as R2 / FCM / billing. Uses the dynamic request origin as the redirect base so
// it works on localhost and prod without reconfiguration.

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(origin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

// Exchange the auth code for tokens, then fetch the userinfo profile.
export async function exchangeGoogleCode(code: string, origin: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Google token exchange failed");
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("No access token from Google");

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) throw new Error("Google userinfo failed");
  const info = (await infoRes.json()) as {
    sub: string; email: string; email_verified?: boolean; name?: string; picture?: string;
  };
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: !!info.email_verified,
    name: info.name,
    picture: info.picture,
  };
}
