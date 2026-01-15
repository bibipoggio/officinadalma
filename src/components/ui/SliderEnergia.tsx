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

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={sliderId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="text-sm font-semibold text-primary">{value}/10</span>
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
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-soft transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "hover:shadow-card hover:scale-110"
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
          <p className="text-center text-sm text-muted-foreground font-medium">
            {currentLabel}
          </p>
        </>
      )}
    </div>
  );
}
