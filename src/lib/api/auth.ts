import { apiFetch } from "./http";
import { clearTokens, writeTokens } from "./token-storage";
import type {
  AuthSessionRow,
  LoginResult,
  MeResponse,
  TokenBundle,
} from "./types";

function persistBundle(data: TokenBundle) {
  writeTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    sessionId: data.sessionId,
  });
}

export async function getAuthConfig() {
  return apiFetch<{ otpOnLogin: boolean }>("/auth/config", { auth: false });
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const data = await apiFetch<LoginResult>("/auth/login", {
    auth: false,
    body: { email, password },
  });

  if ("accessToken" in data && data.accessToken) {
    persistBundle(data);
  }
  return data;
}

export async function verifyOtp(otpChallengeToken: string, code: string, deviceLabel?: string) {
  const data = await apiFetch<TokenBundle & { me: MeResponse }>("/auth/otp/verify", {
    auth: false,
    body: { otpChallengeToken, code, deviceLabel },
  });
  persistBundle(data);
  return data;
}

export async function enrollTotp(enrollmentToken: string, code: string) {
  const data = await apiFetch<TokenBundle & { me: MeResponse }>("/auth/totp/enroll", {
    auth: false,
    body: { enrollmentToken, code },
  });
  persistBundle(data);
  return data;
}

export async function fetchMe() {
  return apiFetch<MeResponse>("/auth/me");
}

export async function logout(refreshToken?: string) {
  try {
    await apiFetch<{ ok: boolean }>("/auth/logout", {
      body: refreshToken ? { refreshToken } : {},
    });
  } catch {
    // still clear local session
  } finally {
    clearTokens();
  }
}

export async function switchProgram(programId: string) {
  const data = await apiFetch<TokenBundle & { me: MeResponse; activeProgram: unknown }>(
    "/auth/switch-program",
    { body: { programId } },
  );
  if (data.accessToken) persistBundle(data);
  return data;
}

export async function listSessions() {
  return apiFetch<AuthSessionRow[]>("/auth/sessions");
}

export async function revokeSession(sessionId: string) {
  return apiFetch<{ ok: boolean }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function forgotPassword(email: string) {
  return apiFetch<{ ok: boolean }>("/auth/password/forgot", {
    auth: false,
    body: { email },
  });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ ok: boolean }>("/auth/password/reset", {
    auth: false,
    body: { token, password },
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: boolean }>("/auth/password/change", {
    body: { currentPassword, newPassword },
  });
}
