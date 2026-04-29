import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ParameterRowProps {
  label: string;
  value: string | number | undefined | null;
  unit?: string;
  decimals?: number;
  description?: string;
}

export function ParameterRow({ label, value, unit, decimals = 2, description }: ParameterRowProps) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevValue.current !== value && value !== undefined) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [value]);

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 group">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors" title={description}>{label}</span>
        {description && <span className="text-[10px] text-muted-foreground hidden sm:block">{description}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span 
          className={cn(
            "font-mono text-base font-semibold transition-colors duration-300",
            flash ? "text-primary" : "text-foreground"
          )}
        >
          {formatValue(value, decimals)}
        </span>
        {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
      </div>
    </div>
  );
}

export function MeterCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex flex-col h-full bg-card/80 backdrop-blur-sm border-border/50 shadow-sm", className)}>
      <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-xs sm:text-sm font-semibold tracking-wide text-foreground/90 uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 sm:p-4 flex flex-col gap-1">
        {children}
      </CardContent>
    </Card>
  );
}
