import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsecutiveStreak, getMotivationalPhrase } from "@/hooks/useConsecutiveStreak";
import { cn } from "@/lib/utils";
import streakFrame from "@/assets/streak-frame.png";

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Golden star for completed days */
const GoldenStar = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#D4AF37" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

/** Gray dot placeholder for incomplete days */
const GrayDot = ({ size = 22 }: { size?: number }) => (
  <div
    className="rounded-full bg-muted"
    style={{ width: size * 0.45, height: size * 0.45 }}
    aria-hidden="true"
  />
);

interface StreakAchievementProps {
  glowActive?: boolean;
}

export function StreakAchievement({ glowActive = false }: StreakAchievementProps) {
  const { consecutiveDays, weekDays, isLoading } = useConsecutiveStreak();
  const phrase = useMemo(() => getMotivationalPhrase(), []);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-28 h-28 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex justify-center gap-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-7 h-9 rounded" />
          ))}
        </div>
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>
    );
  }

  return (
    <section
      className="bg-card rounded-2xl shadow-soft"
      aria-label="Conquista de constância"
      style={{ padding: "28px 24px 24px" }}
    >
      {/* Central: Flower of Life + streak number */}
      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
          <img
            src={streakFrame}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain"
          />
          <span
            className={cn(
              "relative font-display font-bold transition-all duration-700",
              glowActive && "animate-streak-glow"
            )}
            style={{
              fontSize: "8.5rem",
              lineHeight: 1,
              marginTop: "-22%",
              color: "#D4AF37",
              textShadow: "0 0 18px rgba(212, 175, 55, 0.5), 0 0 36px rgba(212, 175, 55, 0.2), 0 2px 4px rgba(212, 175, 55, 0.3)",
            }}
          >
            {consecutiveDays}
          </span>
        </div>

        <span
          className="font-body font-medium uppercase"
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            color: "hsl(var(--foreground))",
            marginTop: 6,
          }}
        >
          {consecutiveDays === 1 ? "dia consecutivo" : "dias consecutivos"}
        </span>
      </div>

      {/* Weekly star bar */}
      <div className="flex justify-center items-end gap-5 sm:gap-6" style={{ marginTop: 24 }}>
        {weekDays.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <span
              className="font-body font-medium uppercase"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              {DAY_LABELS[day.dayIndex]}
            </span>
            <div className="flex items-center justify-center" style={{ width: 22, height: 22 }}>
              {day.hasCheckin ? <GoldenStar size={22} /> : <GrayDot size={22} />}
            </div>
          </div>
        ))}
      </div>

      {/* Motivational phrase */}
      <p
        className="text-center font-body italic leading-relaxed"
        style={{
          color: "hsl(var(--muted-foreground))",
          fontSize: "0.8125rem",
          marginTop: 24,
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        "{phrase}"
      </p>
    </section>
  );
}
