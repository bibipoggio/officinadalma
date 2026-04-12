import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle both GET (back_url redirect) and POST (IPN notification)
    if (req.method === "GET") {
      // User redirect — just show success
      return new Response(
        `<html><head><meta http-equiv="refresh" content="3;url=https://officinadalma.lovable.app/"></head><body><p>Pagamento processado! Redirecionando...</p></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    // POST — IPN notification from Mercado Pago
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const { type, data } = body;

    if (type === "subscription_preapproval") {
      // Fetch subscription details from MP
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/${data.id}`,
        {
          headers: { Authorization: `Bearer ${mpAccessToken}` },
        }
      );
      const subscription = await mpRes.json();
      console.log("MP subscription data:", JSON.stringify(subscription));

      const userId = subscription.external_reference;
      const mpStatus = subscription.status; // authorized, paused, cancelled, pending

      if (!userId) {
        console.error("No external_reference (user_id) in subscription");
        return new Response("OK", { status: 200 });
      }

      // Map MP status to period end
      const isActive = mpStatus === "authorized";
      const now = new Date();
      const periodEnd = isActive
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
        : null;

      // Upsert subscription
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            provider: "mercado_pago",
            provider_subscription_id: data.id,
            provider_customer_id: subscription.payer_id?.toString() || null,
            current_period_end: periodEnd,
            trial_ends_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      } else {
        console.log(`Subscription ${isActive ? "activated" : "updated"} for user ${userId}`);
      }
    }

    // Always return 200 to MP
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 to avoid MP retries on our errors
    return new Response("OK", { status: 200 });
  }
});
