import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { User, UserRole } from "@/store/authStore";

type ProfileRow = {
  id: string;
  user_id?: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  outlet_id: string | null;
  active: boolean;
};

function assertSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured");
  }
}

function toUser(row: ProfileRow): User {
  const resolvedId = row.id ?? row.user_id;
  return {
    id: resolvedId,
    email: row.email ?? "",
    name: row.full_name ?? (row.email?.split("@")[0] ?? "User"),
    role: row.role,
    outletId: row.outlet_id ?? undefined,
  };
}

export async function fetchProfiles(): Promise<User[]> {
  assertSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, outlet_id, active")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(toUser);
}

type AdminUsersAction =
  | { action: "create"; email: string; name: string; role: UserRole; actorId?: string; actorPin?: string }
  | { action: "update"; userId: string; name?: string; email?: string; role?: UserRole; actorId?: string; actorPin?: string }
  | { action: "delete"; userId: string; actorId?: string; actorPin?: string }
  | { action: "set_pin"; userId: string; pin: string; actorId?: string; actorPin?: string };

export async function callAdminUsersFunction(payload: AdminUsersAction): Promise<{ generatedPin?: string }> {
  assertSupabase();
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: payload,
  });
  if (error) {
    const hint =
      "Failed to send a request to the Edge Function. Ensure 'admin-users' is deployed in Supabase Dashboard (Edge Functions) and your NEXT_PUBLIC_SUPABASE_URL / anon key are correct.";
    throw new Error(`${error.message}. ${hint}`);
  }
  return (data ?? {}) as { generatedPin?: string };
}

export async function authenticateWithPin(pin: string): Promise<User | null> {
  assertSupabase();
  const { data, error } = await supabase.rpc("authenticate_pin", { p_pin: pin });
  if (error) throw error;
  const row = (data?.[0] ?? null) as ProfileRow | null;
  return row ? toUser(row) : null;
}
