import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";

export type AdminProgram = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
  createdByOrgId: string;
  createdAt: string;
  updatedAt: string | null;
  memberCount: number;
  farmAreaCount: number;
};

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

export async function getPrograms(): Promise<AdminProgram[]> {
  try {
    return await apiFetch<AdminProgram[]>("/programs");
  } catch (err) {
    throw asError(err);
  }
}

export async function createProgram(input: {
  name: string;
  slug?: string;
  status?: "active" | "archived";
}): Promise<AdminProgram> {
  try {
    return await apiFetch<AdminProgram>("/programs", { method: "POST", body: input });
  } catch (err) {
    throw asError(err);
  }
}

export async function updateProgram(
  id: string,
  input: { name?: string; slug?: string; status?: "active" | "archived" },
): Promise<AdminProgram> {
  try {
    return await apiFetch<AdminProgram>(`/programs/${id}`, { method: "PATCH", body: input });
  } catch (err) {
    throw asError(err);
  }
}

export async function archiveProgram(id: string): Promise<AdminProgram> {
  try {
    return await apiFetch<AdminProgram>(`/programs/${id}`, { method: "DELETE" });
  } catch (err) {
    throw asError(err);
  }
}
