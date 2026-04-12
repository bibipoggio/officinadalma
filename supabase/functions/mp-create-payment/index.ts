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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!mpAccessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type } = body; // "lesson" or "meditation"

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let itemTitle: string;
    let unitPrice: number;
    let externalRef: Record<string, string>;
    let table: string;
    let idField: string;
    let idValue: string;
    let amountCents: number;
    let backUrlSuccess: string;
    let backUrlFailure: string;

    if (type === "meditation") {
      const { meditation_id, meditation_title } = body;
      if (!meditation_id) {
        return new Response(JSON.stringify({ error: "meditation_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already purchased
      const { data: existing } = await supabaseAdmin
        .from("meditacoes_compradas")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("meditation_id", meditation_id)
        .maybeSingle();

      if (existing?.status === "aprovado") {
        return new Response(JSON.stringify({ error: "Meditação já comprada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      itemTitle = `Meditação Avulsa: ${meditation_title || "Meditação"}`;
      unitPrice = 15.93;
      amountCents = 1593;
      externalRef = { type: "meditation_purchase", user_id: user.id, meditation_id };
      table = "meditacoes_compradas";
      idField = "meditation_id";
      idValue = meditation_id;
      backUrlSuccess = "https://officinadalma.lovable.app/orientacoes";
      backUrlFailure = "https://officinadalma.lovable.app/";
    } else {
      // Default: lesson purchase
      const { lesson_id, lesson_title } = body;
      if (!lesson_id || !lesson_title) {
        return new Response(JSON.stringify({ error: "lesson_id and lesson_title are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabaseAdmin
        .from("aulas_compradas")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson_id)
        .maybeSingle();

      if (existing?.status === "aprovado") {
        return new Response(JSON.stringify({ error: "Aula já comprada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      itemTitle = `Aula Avulsa: ${lesson_title}`;
      unitPrice = 29.75;
      amountCents = 2975;
      externalRef = { type: "lesson_purchase", user_id: user.id, lesson_id };
      table = "aulas_compradas";
      idField = "lesson_id";
      idValue = lesson_id;
      backUrlSuccess = "https://officinadalma.lovable.app/orientacoes";
      backUrlFailure = "https://officinadalma.lovable.app/aulas";
    }

    // Create Mercado Pago payment preference
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: itemTitle,
            quantity: 1,
            unit_price: unitPrice,
            currency_id: "BRL",
          },
        ],
        payer: { email: user.email },
        external_reference: JSON.stringify(externalRef),
        back_urls: {
          success: backUrlSuccess,
          failure: backUrlFailure,
          pending: backUrlFailure,
        },
        auto_return: "approved",
        payment_methods: {
          excluded_payment_types: [],
          installments: 1,
        },
        notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      }),
    });

    const mpData = await response.json();

    if (!response.ok) {
      console.error("MP error:", mpData);
      throw new Error(`Mercado Pago API error: ${response.status}`);
    }

    // Upsert pending purchase record
    const { data: existingRecord } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("user_id", user.id)
      .eq(idField, idValue)
      .maybeSingle();

    if (existingRecord) {
      await supabaseAdmin
        .from(table)
        .update({ status: "pendente", provider_payment_id: mpData.id, updated_at: new Date().toISOString() })
        .eq("id", existingRecord.id);
    } else {
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        [idField]: idValue,
        status: "pendente",
        provider_payment_id: mpData.id,
        amount_cents: amountCents,
      };
      await supabaseAdmin.from(table).insert(insertData);
    }

    console.log(`Payment preference created: ${mpData.id} for ${type || "lesson"}: ${idValue}`);

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        id: mpData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
