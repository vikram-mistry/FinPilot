import * as React from "react";

import { cn } from "@/lib/cn";

export interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatIndianCurrency(num: number): string {
  if (num === 0) return "";
  const str = num.toString();
  if (str.length <= 3) return str;

  const lastThree = str.slice(-3);
  const otherNumbers = str.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${formatted},${lastThree}`;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0", className, disabled = false }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(
      value > 0 ? formatIndianCurrency(value) : ""
    );

    // Sync external value changes
    React.useEffect(() => {
      setDisplayValue(value > 0 ? formatIndianCurrency(value) : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      const numeric = raw === "" ? 0 : parseInt(raw, 10);

      setDisplayValue(numeric > 0 ? formatIndianCurrency(numeric) : "");
      onChange(numeric);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowedKeys = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End",
      ];
      if (allowedKeys.includes(e.key)) return;

      // Allow Ctrl/Cmd + A, C, V, X
      if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return;

      // Only allow digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none">
          ₹
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 tabular-nums",
            className
          )}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
