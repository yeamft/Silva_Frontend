// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UserRole =
  | "admin"
  | "manager"
  | "supervisor"
  | "cashier"
  | "waiter"
  | "barman"
  | "chef"
  | "butcher"
  | "inventory"
  | "delivery";

type AdminUsersAction =
  | { action: "create"; email: string; name: string; role: UserRole; actorId?: string; actorPin?: string }
  | { action: "update"; userId: string; name?: string; email?: string; role?: UserRole; actorId?: string; actorPin?: string }
  | { action: "delete"; userId: string; actorId?: string; actorPin?: string }
  | { action: "set_pin"; userId: string; pin: string; actorId?: string; actorPin?: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing function env vars: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = (await req.json()) as AdminUsersAction;

    const actorId = payload.actorId;
    const actorPin = payload.actorPin;
    if (!actorId) {
      return new Response(JSON.stringify({ error: "Missing admin verification" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let isAdmin = false;
    if (actorPin) {
      const { data: actorRows, error: actorError } = await adminClient.rpc("authenticate_pin", {
        p_pin: actorPin,
      });
      const actor = actorRows?.[0];
      isAdmin = !actorError && !!actor && actor.user_id === actorId && actor.role === "admin" && actor.active === true;
    }

    if (!isAdmin) {
      const { data: profileRow, error: profileError } = await adminClient
        .from("profiles")
        .select("role, active")
        .eq("id", actorId)
        .single();
      isAdmin = !profileError && !!profileRow && profileRow.role === "admin" && profileRow.active === true;
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can manage users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatePin = async () => {
      for (let i = 0; i < 30; i++) {
        const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: exists } = await adminClient
          .from("user_pins")
          .select("user_id")
          .eq("pin_code", pin)
          .maybeSingle();
        if (!exists) return pin;
      }
      throw new Error("Failed to generate unique PIN");
    };

    if (payload.action === "create") {
      if (!payload.email) {
        throw new Error("Invalid create payload");
      }

      const generatedPin = await generatePin();
      const randomPassword = `${crypto.randomUUID()}Aa1!`;

      const { data, error } = await adminClient.auth.admin.createUser({
        email: payload.email.trim().toLowerCase(),
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          name: payload.name,
          role: payload.role,
        },
      });

      if (error) throw error;

      await adminClient
        .from("profiles")
        .update({
          email: payload.email.trim().toLowerCase(),
          full_name: payload.name,
          role: payload.role,
          active: true,
        })
        .eq("id", data.user.id);

      const { error: pinError } = await adminClient
        .from("user_pins")
        .upsert({ user_id: data.user.id, pin_code: generatedPin }, { onConflict: "user_id" });
      if (pinError) throw pinError;

      return new Response(JSON.stringify({ success: true, userId: data.user.id, generatedPin }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "update") {
      const attrs: {
        email?: string;
        user_metadata?: Record<string, unknown>;
      } = {};

      if (payload.email) attrs.email = payload.email.trim().toLowerCase();
      if (payload.name || payload.role) {
        attrs.user_metadata = {
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.role ? { role: payload.role } : {}),
        };
      }

      if (Object.keys(attrs).length > 0) {
        const { error } = await adminClient.auth.admin.updateUserById(payload.userId, attrs);
        if (error) throw error;
      }

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({
          ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
          ...(payload.name ? { full_name: payload.name } : {}),
          ...(payload.role ? { role: payload.role } : {}),
        })
        .eq("id", payload.userId);

      if (profileUpdateError) throw profileUpdateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "set_pin") {
      if (!payload.pin || !/^\d{4}$/.test(payload.pin)) {
        throw new Error("PIN must be exactly 4 digits");
      }

      const { error: pinError } = await adminClient
        .from("user_pins")
        .upsert({ user_id: payload.userId, pin_code: payload.pin }, { onConflict: "user_id" });
      if (pinError) throw pinError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "delete") {
      await adminClient.from("profiles").update({ active: false }).eq("id", payload.userId);
      await adminClient.from("user_pins").delete().eq("user_id", payload.userId);
      const { error } = await adminClient.auth.admin.deleteUser(payload.userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
