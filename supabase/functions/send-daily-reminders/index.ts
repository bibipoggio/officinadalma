import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface DailyContent {
  tonica_title: string;
  tonica_short: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  notification_enabled: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in Brazil timezone
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

    // Fetch today's tonica
    const { data: dailyContent } = await supabase
      .from("daily_content")
      .select("tonica_title, tonica_short")
      .eq("date", today)
      .eq("published", true)
      .single();

    // Fetch all push subscriptions with notification enabled profiles
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select(`
        id,
        user_id,
        endpoint,
        p256dh,
        auth
      `);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profiles with notifications enabled
    const userIds = subscriptions.map((s: PushSubscription) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, notification_enabled")
      .in("id", userIds)
      .eq("notification_enabled", true);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with notifications enabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enabledUserIds = new Set(profiles.map((p: Profile) => p.id));
    const activeSubscriptions = subscriptions.filter((s: PushSubscription) => 
      enabledUserIds.has(s.user_id)
    );

    // Build notification payload
    const title = "🌿 Oficina da Alma";
    let body = "Hora do seu check-in diário! Como está seu coração hoje?";
    
    if (dailyContent) {
      body = `Tônica de hoje: ${dailyContent.tonica_title}. Venha refletir conosco!`;
    }

    const notificationPayload = {
      title,
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        url: "/",
        type: "daily_reminder",
      },
    };

    // Note: In production, you would use web-push library here
    // For now, we log what would be sent
    const results = {
      totalSubscriptions: subscriptions.length,
      enabledUsers: profiles.length,
      activeSubscriptions: activeSubscriptions.length,
      payload: notificationPayload,
      dailyContent: dailyContent ? {
        title: dailyContent.tonica_title,
      } : null,
    };

    console.log("Daily reminder results:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Would send ${activeSubscriptions.length} notifications`,
        ...results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-daily-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
