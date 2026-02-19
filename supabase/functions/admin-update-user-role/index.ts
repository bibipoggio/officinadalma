import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actorId = claimsData.claims.sub;

    // Use service role client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: actorId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can change roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id, new_role } = await req.json();

    if (!target_user_id || !new_role || !["user", "moderator", "admin"].includes(new_role)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current role
    const { data: currentRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id);

    const currentRole = currentRoles?.length
      ? currentRoles.some((r: any) => r.role === "admin")
        ? "admin"
        : currentRoles.some((r: any) => r.role === "moderator")
        ? "moderator"
        : "user"
      : "user";

    if (currentRole === new_role) {
      return new Response(JSON.stringify({ message: "Role already set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Protection: don't allow last admin to demote self
    if (actorId === target_user_id && currentRole === "admin" && new_role !== "admin") {
      const { count } = await adminClient
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count || 0) <= 1) {
        return new Response(
          JSON.stringify({ error: "Não é possível remover o último admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Delete existing roles for user
    await adminClient.from("user_roles").delete().eq("user_id", target_user_id);

    // Insert new role
    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: target_user_id, role: new_role });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit log
    const actionMap: Record<string, string> = {
      moderator: currentRole === "admin" ? "revoke_admin" : "grant_moderator",
      user: currentRole === "admin" ? "revoke_admin" : "revoke_moderator",
      admin: "grant_admin",
    };

    await adminClient.from("role_audit_log").insert({
      actor_user_id: actorId,
      target_user_id,
      action: actionMap[new_role] || `set_${new_role}`,
      old_role: currentRole,
      new_role,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
