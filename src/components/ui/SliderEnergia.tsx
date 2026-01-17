import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const energyLabels = [
  { value: 0, label: "Sem energia" },
  { value: 1, label: "Muito baixa" },
  { value: 2, label: "Baixa" },
  { value: 3, label: "Pouca" },
  { value: 4, label: "Moderada baixa" },
  { value: 5, label: "Equilibrada" },
  { value: 6, label: "Moderada alta" },
  { value: 7, label: "Boa" },
  { value: 8, label: "Alta" },
  { value: 9, label: "Muito alta" },
  { value: 10, label: "Máxima" },
];

// Colors matching the community feed display
const getEnergyColor = (energy: number) => {
  if (energy <= 3) return { bg: "bg-rose-500", text: "text-rose-700" };
  if (energy <= 6) return { bg: "bg-amber-500", text: "text-amber-700" };
  return { bg: "bg-green-500", text: "text-green-700" };
};

const getEnergyBadgeColor = (energy: number) => {
  if (energy <= 3) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (energy <= 6) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
};

export interface SliderEnergiaProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showLabels?: boolean;
  className?: string;
  label?: string;
  id?: string;
}

export function SliderEnergia({
  value,
  onChange,
  disabled = false,
  showLabels = true,
  className,
  label = "Nível de Energia",
  id,
}: SliderEnergiaProps) {
  const currentLabel = energyLabels.find((l) => l.value === value)?.label || "";
  const sliderId = id || "slider-energia";
  const energyColor = getEnergyColor(value);
  const badgeColor = getEnergyBadgeColor(value);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={sliderId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className={cn(
          "text-sm font-semibold px-2.5 py-0.5 rounded-full transition-colors duration-300",
          badgeColor
        )}>
          {value}/10
        </span>
      </div>

      <SliderPrimitive.Root
        id={sliderId}
        className="relative flex w-full touch-none select-none items-center"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={10}
        min={0}
        step={1}
        disabled={disabled}
        aria-label={label}
      >
        {/* Track with full gradient background */}
        <SliderPrimitive.Track 
          className="relative h-3 w-full grow overflow-hidden rounded-full"
          style={{
            background: "linear-gradient(to right, #fda4af 0%, #fda4af 30%, #fcd34d 50%, #86efac 100%)"
          }}
        >
          {/* Dark overlay for unselected portion */}
          <div 
            className="absolute right-0 h-full bg-secondary/80 dark:bg-secondary/90 transition-all duration-150"
            style={{ 
              width: `${100 - (value / 10) * 100}%`,
            }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block h-6 w-6 rounded-full border-3 bg-background shadow-elevated transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "hover:shadow-card hover:scale-110",
            value <= 3 ? "border-rose-500" : value <= 6 ? "border-amber-500" : "border-green-500"
          )}
        />
      </SliderPrimitive.Root>

      {showLabels && (
        <>
          <div className="flex justify-between text-xs text-muted-foreground px-0.5">
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
          <p className={cn(
            "text-center text-sm font-medium transition-colors duration-300",
            value <= 3 ? "text-rose-600 dark:text-rose-400" : 
            value <= 6 ? "text-amber-600 dark:text-amber-400" : 
            "text-green-600 dark:text-green-400"
          )}>
            {currentLabel}
          </p>
        </>
      )}
    </div>
  );
}
