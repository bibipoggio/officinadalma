import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import { useConsecutiveStreak, getMotivationalPhrase } from "@/hooks/useConsecutiveStreak";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Flower of Life SVG – 7 overlapping circles in violet */
const FlowerOfLife = ({ size = 96 }: { size?: number }) => {
  const r = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const d = r; // distance from center to petal centers

  const angles = [0, 60, 120, 180, 240, 300];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(263, 70%, 50%)" strokeWidth="1.2" opacity="0.7" />
      {/* Petal circles */}
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const px = cx + d * Math.cos(rad);
        const py = cy + d * Math.sin(rad);
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={r}
            fill="none"
            stroke="hsl(263, 70%, 50%)"
            strokeWidth="1.2"
            opacity={0.5 + i * 0.05}
          />
        );
      })}
    </svg>
  );
};

interface StreakAchievementProps {
  /** If true, show a subtle glow animation on the number (just incremented) */
  glowActive?: boolean;
}

export function StreakAchievement({ glowActive = false }: StreakAchievementProps) {
  const { consecutiveDays, weekDays, isLoading } = useConsecutiveStreak();
  const phrase = useMemo(() => getMotivationalPhrase(), []);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex justify-center gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-10 rounded" />
          ))}
        </div>
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    );
  }

  return (
    <section className="bg-card rounded-2xl p-6 shadow-soft" aria-label="Conquista de constância">
      {/* Central element: Flower of Life + streak number */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <FlowerOfLife size={96} />
          {/* Streak number centered in flower */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "text-3xl font-display font-bold transition-all duration-700",
                glowActive && "animate-streak-glow"
              )}
              style={{ color: "#D4AF37" }}
            >
              {consecutiveDays}
            </span>
          </div>
        </div>
        <span className="text-xs tracking-wide text-muted-foreground font-body">
          {consecutiveDays === 1 ? "dia consecutivo" : "dias consecutivos"}
        </span>
      </div>

      {/* Weekly bar */}
      <div className="flex justify-center gap-3 sm:gap-5 mt-5">
        {weekDays.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {DAY_LABELS[day.dayIndex]}
            </span>
            <Star
              className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 transition-colors",
                day.hasCheckin
                  ? "fill-[#D4AF37] text-[#D4AF37] drop-shadow-sm"
                  : "text-muted-foreground/30"
              )}
              strokeWidth={day.hasCheckin ? 1.5 : 1}
            />
          </div>
        ))}
      </div>

      {/* Motivational phrase */}
      <p
        className="text-center text-sm italic mt-5 leading-relaxed px-4 font-body"
        style={{ color: "#6B7280" }}
      >
        "{phrase}"
      </p>
    </section>
  );
}
