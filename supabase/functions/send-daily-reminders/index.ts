import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import webPush from "web-push";

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

interface SendResult {
  success: boolean;
  endpoint: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization - only allow authenticated calls (cron/admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("Missing VAPID keys");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push with VAPID keys
    webPush.setVapidDetails(
      "mailto:contato@oficinadalma.com.br",
      vapidPublicKey,
      vapidPrivateKey
    );

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

    // Send push notifications to all active subscriptions
    const sendResults: SendResult[] = [];
    const failedEndpoints: string[] = [];

    for (const sub of activeSubscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );
        sendResults.push({ success: true, endpoint: sub.endpoint });
        console.log(`✓ Notification sent to ${sub.endpoint.substring(0, 50)}...`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`✗ Failed to send to ${sub.endpoint.substring(0, 50)}...:`, errorMessage);
        sendResults.push({ success: false, endpoint: sub.endpoint, error: errorMessage });
        
        // If subscription is invalid (410 Gone or 404), mark for cleanup
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
          failedEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
      
      if (deleteError) {
        console.error("Error cleaning up invalid subscriptions:", deleteError);
      } else {
        console.log(`Cleaned up ${failedEndpoints.length} invalid subscriptions`);
      }
    }

    const successCount = sendResults.filter(r => r.success).length;
    const failCount = sendResults.filter(r => !r.success).length;

    console.log(`Daily reminder results: ${successCount} sent, ${failCount} failed, ${failedEndpoints.length} cleaned up`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} notifications, ${failCount} failed`,
        totalSubscriptions: subscriptions.length,
        enabledUsers: profiles.length,
        activeSubscriptions: activeSubscriptions.length,
        sent: successCount,
        failed: failCount,
        cleanedUp: failedEndpoints.length,
        dailyContent: dailyContent ? { title: dailyContent.tonica_title } : null,
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
