import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/cn";

export interface ProgressRingProps {
  value: number;
  max: number;
  size?: "sm" | "md" | "lg";
  color?: string;
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { dimension: 64, strokeWidth: 5, fontSize: "text-xs", r: 26 },
  md: { dimension: 96, strokeWidth: 6, fontSize: "text-sm", r: 40 },
  lg: { dimension: 128, strokeWidth: 7, fontSize: "text-base", r: 54 },
} as const;

export function ProgressRing({
  value,
  max,
  size = "md",
  color = "hsl(var(--primary))",
  label,
  className,
}: ProgressRingProps) {
  const config = sizeConfig[size];
  const { dimension, strokeWidth, fontSize, r } = config;
  const circumference = 2 * Math.PI * r;
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = dimension / 2;

  const displayLabel = label ?? `${Math.round(percentage)}%`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/50"
        />
        {/* Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-semibold text-foreground", fontSize)}>
          {displayLabel}
        </span>
      </div>
    </div>
  );
}
