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

    // Handle GET (back_url redirect)
    if (req.method === "GET") {
      return new Response(
        `<html><head><meta http-equiv="refresh" content="3;url=https://officinadalma.lovable.app/orientacoes"></head><body><p>Pagamento processado! Redirecionando para as orientações...</p></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    // POST — IPN notification from Mercado Pago
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const { type, data } = body;

    // Handle subscription pre-approval notifications
    if (type === "subscription_preapproval") {
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/${data.id}`,
        {
          headers: { Authorization: `Bearer ${mpAccessToken}` },
        }
      );
      const subscription = await mpRes.json();
      console.log("MP subscription data:", JSON.stringify(subscription));

      const userId = subscription.external_reference;
      const mpStatus = subscription.status;

      if (!userId) {
        console.error("No external_reference (user_id) in subscription");
        return new Response("OK", { status: 200 });
      }

      const isActive = mpStatus === "authorized";
      const now = new Date();
      const periodEnd = isActive
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
        : null;

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

    // Handle single payment notifications (lesson purchases)
    if (type === "payment") {
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${data.id}`,
        {
          headers: { Authorization: `Bearer ${mpAccessToken}` },
        }
      );
      const payment = await mpRes.json();
      console.log("MP payment data:", JSON.stringify(payment));

      let externalRef: { type?: string; user_id?: string; lesson_id?: string } | null = null;
      try {
        externalRef = JSON.parse(payment.external_reference || "{}");
      } catch {
        console.error("Failed to parse external_reference:", payment.external_reference);
        return new Response("OK", { status: 200 });
      }

      if (externalRef?.type === "lesson_purchase" && externalRef.user_id && externalRef.lesson_id) {
        const paymentStatus = payment.status; // approved, pending, rejected, etc.
        const purchaseStatus = paymentStatus === "approved" ? "aprovado"
          : paymentStatus === "rejected" ? "rejeitado"
          : "pendente";

        console.log(`Lesson purchase: user=${externalRef.user_id}, lesson=${externalRef.lesson_id}, status=${purchaseStatus}`);

        const { error: upsertError } = await supabase
          .from("aulas_compradas")
          .upsert(
            {
              user_id: externalRef.user_id,
              lesson_id: externalRef.lesson_id,
              status: purchaseStatus,
              provider_payment_id: data.id.toString(),
              amount_cents: Math.round((payment.transaction_amount || 29.75) * 100),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,lesson_id" }
          );

        if (upsertError) {
          console.error("Lesson purchase upsert error:", upsertError);
        } else {
          console.log(`Lesson purchase ${purchaseStatus} for user ${externalRef.user_id}, lesson ${externalRef.lesson_id}`);
        }
      }
    }

    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});
