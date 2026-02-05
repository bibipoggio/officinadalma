 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 
 export interface ScheduledEvent {
   id: string;
   title: string;
   description: string | null;
   day_of_week: number;
   event_time: string;
   reminder_minutes_before: number;
   is_active: boolean;
   created_by: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export type ScheduledEventInsert = Omit<ScheduledEvent, "id" | "created_at" | "updated_at" | "created_by">;
 
 const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
 
 export function getDayName(dayOfWeek: number): string {
   return DAY_NAMES[dayOfWeek] || "";
 }
 
 export function useScheduledEvents() {
   const { user } = useAuth();
   const [events, setEvents] = useState<ScheduledEvent[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
 
   const fetchEvents = useCallback(async () => {
     setIsLoading(true);
     setError(null);
     
     try {
       const { data, error: fetchError } = await supabase
         .from("scheduled_events")
         .select("*")
         .order("day_of_week", { ascending: true })
         .order("event_time", { ascending: true });
 
       if (fetchError) throw fetchError;
       setEvents((data as ScheduledEvent[]) || []);
     } catch (err) {
       console.error("Error fetching scheduled events:", err);
       setError(err as Error);
     } finally {
       setIsLoading(false);
     }
   }, []);
 
   useEffect(() => {
     fetchEvents();
   }, [fetchEvents]);
 
   const createEvent = async (event: ScheduledEventInsert) => {
     if (!user) return { success: false, error: new Error("Not authenticated") };
     
     try {
       const { error: insertError } = await supabase
         .from("scheduled_events")
         .insert({
           ...event,
           created_by: user.id,
         });
 
       if (insertError) throw insertError;
       await fetchEvents();
       return { success: true, error: null };
     } catch (err) {
       console.error("Error creating event:", err);
       return { success: false, error: err as Error };
     }
   };
 
   const updateEvent = async (id: string, updates: Partial<ScheduledEventInsert>) => {
     try {
       const { error: updateError } = await supabase
         .from("scheduled_events")
         .update(updates)
         .eq("id", id);
 
       if (updateError) throw updateError;
       await fetchEvents();
       return { success: true, error: null };
     } catch (err) {
       console.error("Error updating event:", err);
       return { success: false, error: err as Error };
     }
   };
 
   const deleteEvent = async (id: string) => {
     try {
       const { error: deleteError } = await supabase
         .from("scheduled_events")
         .delete()
         .eq("id", id);
 
       if (deleteError) throw deleteError;
       await fetchEvents();
       return { success: true, error: null };
     } catch (err) {
       console.error("Error deleting event:", err);
       return { success: false, error: err as Error };
     }
   };
 
   const toggleEventActive = async (id: string, isActive: boolean) => {
     return updateEvent(id, { is_active: isActive });
   };
 
   return {
     events,
     isLoading,
     error,
     refetch: fetchEvents,
     createEvent,
     updateEvent,
     deleteEvent,
     toggleEventActive,
   };
 }