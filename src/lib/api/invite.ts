import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

export type InvitePreview = {
  email: string;
  name: string;
  orgName: string;
  role: string;
  invitedByName: string | null;
  expiresAt: string;
};

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  try {
    return await apiFetch<InvitePreview>(`/auth/invite?token=${encodeURIComponent(token)}`, {
      auth: false,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function acceptInvite(input: {
  token: string;
  name?: string;
  password: string;
}): Promise<{ ok: true; email: string; name: string }> {
  try {
    return await apiFetch("/auth/invite/accept", {
      method: "POST",
      body: input,
      auth: false,
    });
  } catch (err) {
    throw asError(err);
  }
}
