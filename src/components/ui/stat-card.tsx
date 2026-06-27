import * as React from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

type ColorVariant = "income" | "expense" | "invest" | "emergency" | "loan" | "networth";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: ColorVariant;
  trend?: { value: number; label: string };
  className?: string;
}

const colorMap: Record<ColorVariant, {
  icon: string;
  bg: string;
  text: string;
  trendUp: string;
  trendDown: string;
}> = {
  income: {
    icon: "bg-income-100 text-income-600 dark:bg-income-900/30 dark:text-income-400",
    bg: "from-income-500/5 to-income-500/10 dark:from-income-500/10 dark:to-income-500/5",
    text: "text-income-600 dark:text-income-400",
    trendUp: "text-income-600 dark:text-income-400",
    trendDown: "text-expense-600 dark:text-expense-400",
  },
  expense: {
    icon: "bg-expense-100 text-expense-600 dark:bg-expense-900/30 dark:text-expense-400",
    bg: "from-expense-500/5 to-expense-500/10 dark:from-expense-500/10 dark:to-expense-500/5",
    text: "text-expense-600 dark:text-expense-400",
    trendUp: "text-income-600 dark:text-income-400",
    trendDown: "text-expense-600 dark:text-expense-400",
  },
  invest: {
    icon: "bg-invest-100 text-invest-600 dark:bg-invest-900/30 dark:text-invest-400",
    bg: "from-invest-500/5 to-invest-500/10 dark:from-invest-500/10 dark:to-invest-500/5",
    text: "text-invest-600 dark:text-invest-400",
    trendUp: "text-income-600 dark:text-income-400",
    trendDown: "text-expense-600 dark:text-expense-400",
  },
  emergency: {
    icon: "bg-emergency-100 text-emergency-600 dark:bg-emergency-900/30 dark:text-emergency-400",
    bg: "from-emergency-500/5 to-emergency-500/10 dark:from-emergency-500/10 dark:to-emergency-500/5",
    text: "text-emergency-600 dark:text-emergency-400",
    trendUp: "text-income-600 dark:text-income-400",
    trendDown: "text-expense-600 dark:text-expense-400",
  },
  loan: {
    icon: "bg-loan-100 text-loan-600 dark:bg-loan-900/30 dark:text-loan-400",
    bg: "from-loan-500/5 to-loan-500/10 dark:from-loan-500/10 dark:to-loan-500/5",
    text: "text-loan-600 dark:text-loan-400",
    trendUp: "text-income-600 dark:text-income-400",
    trendDown: "text-expense-600 dark:text-expense-400",
  },
  networth: {
    icon: "bg-networth-100 text-networth-600 dark:bg-networth-900/30 dark:text-networth-400",
    bg: "from-networth-500/5 to-networth-500/10 dark:from-networth-500/10 dark:to-networth-500/5",
    text: "text-networth-600 dark:text-networth-400",
    trendUp: "text-income-600 dark:text-income-400",
    trendDown: "text-expense-600 dark:text-expense-400",
  },
};

function useCountUp(end: number, duration = 1200) {
  const [count, setCount] = React.useState(0);
  const prevEnd = React.useRef(end);

  React.useEffect(() => {
    prevEnd.current = end;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

function formatValue(value: string | number): { numeric: number | null; display: string } {
  if (typeof value === "string") {
    const stripped = value.replace(/[₹,\s]/g, "");
    const num = Number(stripped);
    if (!isNaN(num)) return { numeric: num, display: value.replace(/[\d,]+/, "{NUM}") };
    return { numeric: null, display: value };
  }
  return { numeric: value, display: "₹{NUM}" };
}

function formatIndianNumber(n: number): string {
  const abs = Math.abs(n);
  const str = abs.toString();
  if (str.length <= 3) return n < 0 ? `-${str}` : str;

  let lastThree = str.slice(-3);
  const otherNumbers = str.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const result = `${formatted},${lastThree}`;
  return n < 0 ? `-${result}` : result;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  className,
}: StatCardProps) {
  const colors = colorMap[color];
  const { numeric, display } = formatValue(value);
  const animatedNum = useCountUp(numeric ?? 0);

  const displayValue = numeric !== null
    ? display.replace("{NUM}", formatIndianNumber(animatedNum))
    : display;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "relative overflow-hidden bg-gradient-to-br border",
          colors.bg,
          className
        )}
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              <p className={cn("text-2xl font-bold mt-1 tracking-tight", colors.text)}>
                {displayValue}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  {trend.value >= 0 ? (
                    <TrendingUp className={cn("h-3.5 w-3.5", colors.trendUp)} />
                  ) : (
                    <TrendingDown className={cn("h-3.5 w-3.5", colors.trendDown)} />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      trend.value >= 0 ? colors.trendUp : colors.trendDown
                    )}
                  >
                    {trend.value >= 0 ? "+" : ""}
                    {trend.value}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {trend.label}
                  </span>
                </div>
              )}
            </div>
            <div className={cn("rounded-xl p-2.5 shrink-0", colors.icon)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
