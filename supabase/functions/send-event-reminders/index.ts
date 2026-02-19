 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "web-push";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface PushSubscription {
   endpoint: string;
   p256dh: string;
   auth: string;
   user_id: string;
 }
 
 interface ScheduledEvent {
   id: string;
   title: string;
   description: string | null;
   day_of_week: number;
   event_time: string;
   reminder_minutes_before: number;
 }
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
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
       console.error("VAPID keys not configured");
       return new Response(
         JSON.stringify({ error: "VAPID keys not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
     
     // Get current time in Brazil timezone (UTC-3)
     const now = new Date();
     const brazilOffset = -3 * 60; // UTC-3 in minutes
     const localOffset = now.getTimezoneOffset();
     const brazilTime = new Date(now.getTime() + (localOffset + brazilOffset) * 60 * 1000);
     
     const currentDayOfWeek = brazilTime.getDay();
     const currentHour = brazilTime.getHours();
     const currentMinute = brazilTime.getMinutes();
     
     console.log(`Checking events for day ${currentDayOfWeek}, time ${currentHour}:${currentMinute} (Brazil time)`);
     
     // Get active events for today
     const { data: events, error: eventsError } = await supabase
       .from("scheduled_events")
       .select("*")
       .eq("day_of_week", currentDayOfWeek)
       .eq("is_active", true);
     
     if (eventsError) {
       console.error("Error fetching events:", eventsError);
       throw eventsError;
     }
     
     if (!events || events.length === 0) {
       console.log("No events scheduled for today");
       return new Response(
         JSON.stringify({ message: "No events for today", sent: 0 }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     // Check which events should have reminders sent now
     const eventsToNotify: ScheduledEvent[] = [];
     
     for (const event of events) {
       const [eventHour, eventMinute] = event.event_time.split(":").map(Number);
       
       // Calculate reminder time
       let reminderHour = eventHour;
       let reminderMinute = eventMinute - event.reminder_minutes_before;
       
       if (reminderMinute < 0) {
         reminderHour -= 1;
         reminderMinute += 60;
       }
       if (reminderHour < 0) {
         reminderHour += 24;
       }
       
       // Check if current time matches reminder time (within 1 minute window)
       if (currentHour === reminderHour && currentMinute === reminderMinute) {
         eventsToNotify.push(event);
         console.log(`Event "${event.title}" should be notified now`);
       }
     }
     
     if (eventsToNotify.length === 0) {
       console.log("No events need reminders at this time");
       return new Response(
         JSON.stringify({ message: "No reminders needed now", sent: 0 }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     // Get all push subscriptions for users with notifications enabled
     const { data: subscriptions, error: subsError } = await supabase
       .from("push_subscriptions")
       .select("endpoint, p256dh, auth, user_id");
     
     if (subsError) {
       console.error("Error fetching subscriptions:", subsError);
       throw subsError;
     }
     
     if (!subscriptions || subscriptions.length === 0) {
       console.log("No push subscriptions found");
       return new Response(
         JSON.stringify({ message: "No subscriptions", sent: 0 }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     // Filter subscriptions for users with notifications enabled
     const userIds = subscriptions.map((s) => s.user_id);
     const { data: profiles } = await supabase
       .from("profiles")
       .select("id")
       .in("id", userIds)
       .eq("notification_enabled", true);
     
     const enabledUserIds = new Set(profiles?.map((p) => p.id) || []);
     const activeSubscriptions = subscriptions.filter((s) =>
       enabledUserIds.has(s.user_id)
     );
     
     console.log(`Found ${activeSubscriptions.length} active subscriptions`);
     
     webPush.setVapidDetails(
       "mailto:contato@officinadaalma.com.br",
       vapidPublicKey,
       vapidPrivateKey
     );
     
     let successCount = 0;
     let failCount = 0;
     const invalidSubscriptions: string[] = [];
     
     // Send notifications for each event
     for (const event of eventsToNotify) {
       const payload = JSON.stringify({
         title: `🔔 ${event.title}`,
         body: event.description || `Começa em ${event.reminder_minutes_before} minutos!`,
         icon: "/icon-192.png",
         badge: "/icon-192.png",
         tag: `event-${event.id}`,
         data: {
           url: "/",
           eventId: event.id,
         },
       });
       
       for (const sub of activeSubscriptions) {
         try {
           await webPush.sendNotification(
             {
               endpoint: sub.endpoint,
               keys: {
                 p256dh: sub.p256dh,
                 auth: sub.auth,
               },
             },
             payload
           );
           successCount++;
         } catch (error: any) {
           console.error(`Failed to send to ${sub.endpoint}:`, error.message);
           failCount++;
           
           if (error.statusCode === 404 || error.statusCode === 410) {
             invalidSubscriptions.push(sub.endpoint);
           }
         }
       }
     }
     
     // Clean up invalid subscriptions
     if (invalidSubscriptions.length > 0) {
       console.log(`Cleaning up ${invalidSubscriptions.length} invalid subscriptions`);
       await supabase
         .from("push_subscriptions")
         .delete()
         .in("endpoint", invalidSubscriptions);
     }
     
     console.log(`Event reminders sent: ${successCount} success, ${failCount} failed`);
     
     return new Response(
       JSON.stringify({
         message: "Event reminders sent",
         events: eventsToNotify.length,
         sent: successCount,
         failed: failCount,
         cleaned: invalidSubscriptions.length,
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("Error in send-event-reminders:", error);
     return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });