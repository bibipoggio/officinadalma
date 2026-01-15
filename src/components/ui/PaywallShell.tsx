import * as React from "react";
import { Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PaywallShellProps {
  title: string;
  subtitle?: string;
  features: string[];
  primaryCta: {
    label: string;
    onClick: () => void;
  };
  secondaryCta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function PaywallShell({
  title,
  subtitle,
  features,
  primaryCta,
  secondaryCta,
  className,
}: PaywallShellProps) {
  return (
    <Card variant="elevated" className={cn("p-6 md:p-8 text-center max-w-md mx-auto", className)}>
      <div className="w-12 h-12 rounded-full bg-amethyst-light flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>

      <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
        {title}
      </h2>

      {subtitle && (
        <p className="text-muted-foreground mb-6">{subtitle}</p>
      )}

      <ul className="space-y-3 mb-6 text-left">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary" />
            </span>
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={primaryCta.onClick}
        >
          {primaryCta.label}
        </Button>

        {secondaryCta && (
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={secondaryCta.onClick}
          >
            {secondaryCta.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
