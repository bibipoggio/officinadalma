import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

interface WeekDay {
  date: string;        // yyyy-MM-dd
  dayIndex: number;    // 0=Sun .. 6=Sat
  hasCheckin: boolean;
}

interface ConsecutiveStreakResult {
  consecutiveDays: number;
  weekDays: WeekDay[];
  isLoading: boolean;
  refetch: () => void;
}

export function useConsecutiveStreak(): ConsecutiveStreakResult {
  const { user } = useAuth();
  const [consecutiveDays, setConsecutiveDays] = useState(0);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setConsecutiveDays(0);
      setWeekDays([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      // Fetch last 90 days of checkins to calculate consecutive streak
      const startDate = format(subDays(today, 90), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("checkins")
        .select("date")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", todayStr)
        .order("date", { ascending: false });

      if (error) throw error;

      const checkinDates = new Set(data?.map(c => c.date) || []);

      // Calculate consecutive days ending today (or yesterday if no checkin today)
      let streak = 0;
      let checkDate = today;

      // First check if today has a checkin
      if (checkinDates.has(todayStr)) {
        streak = 1;
        checkDate = subDays(today, 1);
      } else {
        // Check from yesterday
        checkDate = subDays(today, 1);
        const yesterdayStr = format(checkDate, "yyyy-MM-dd");
        if (!checkinDates.has(yesterdayStr)) {
          // No streak at all
          streak = 0;
        } else {
          streak = 1;
          checkDate = subDays(checkDate, 1);
        }
      }

      // Count backwards
      if (streak > 0) {
        while (true) {
          const dateStr = format(checkDate, "yyyy-MM-dd");
          if (checkinDates.has(dateStr)) {
            streak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        }
      }

      setConsecutiveDays(streak);

      // Build current week data (Sun-Sat)
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const weekData: WeekDay[] = daysInWeek.map(day => ({
        date: format(day, "yyyy-MM-dd"),
        dayIndex: day.getDay(),
        hasCheckin: checkinDates.has(format(day, "yyyy-MM-dd")),
      }));

      setWeekDays(weekData);
    } catch (err) {
      console.error("Error fetching consecutive streak:", err);
      setConsecutiveDays(0);
      setWeekDays([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return { consecutiveDays, weekDays, isLoading, refetch: fetchStreak };
}

const MOTIVATIONAL_PHRASES = [
  "Silencie o externo para ouvir a sabedoria que já habita em você.",         // Domingo
  "Que sua ação hoje seja um reflexo direto da sua verdade mais profunda.",    // Segunda
  "A alquimia da transformação começa com a coragem de olhar para dentro.",    // Terça
  "Encontre o ponto de paz no centro do movimento da sua vida.",              // Quarta
  "Sua consciência se expande a cada escolha feita com presença.",            // Quinta
  "Honre os vínculos que nutrem sua alma e elevam sua frequência.",           // Sexta
  "O agora é o único espaço onde a transformação realmente acontece.",        // Sábado
];

const FALLBACK_PHRASE = "Sua jornada de autotransformação continua hoje.";

export function getMotivationalPhrase(): string {
  try {
    const dayOfWeek = new Date().getDay();
    return MOTIVATIONAL_PHRASES[dayOfWeek] || FALLBACK_PHRASE;
  } catch {
    return FALLBACK_PHRASE;
  }
}
