import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        income:
          "border-transparent bg-income-100 text-income-700 dark:bg-income-900/40 dark:text-income-400",
        expense:
          "border-transparent bg-expense-100 text-expense-700 dark:bg-expense-900/40 dark:text-expense-400",
        invest:
          "border-transparent bg-invest-100 text-invest-700 dark:bg-invest-900/40 dark:text-invest-400",
        emergency:
          "border-transparent bg-emergency-100 text-emergency-700 dark:bg-emergency-900/40 dark:text-emergency-400",
        loan:
          "border-transparent bg-loan-100 text-loan-700 dark:bg-loan-900/40 dark:text-loan-400",
        networth:
          "border-transparent bg-networth-100 text-networth-700 dark:bg-networth-900/40 dark:text-networth-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
