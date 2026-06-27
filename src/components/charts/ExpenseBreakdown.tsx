import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface ExpenseBreakdownData {
  name: string;
  value: number;
  color: string;
}

interface ExpenseBreakdownProps {
  data: ExpenseBreakdownData[];
}

export function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-xs text-muted-foreground font-medium">
        No expenses recorded for this period
      </div>
    );
  }

  return (
    <div className="relative w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0];
                const pct = total > 0 ? (((item?.value as number) / total) * 100).toFixed(1) : '0';
                return (
                  <div className="bg-popover border border-border px-3 py-2 rounded-xl shadow-xl text-xs flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item?.payload.color }} />
                      {item?.name}
                    </span>
                    <span className="text-muted-foreground font-medium mt-0.5">
                      ₹{Number(item?.value).toLocaleString('en-IN')} ({pct}%)
                    </span>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Expenses</span>
        <span className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
export default ExpenseBreakdown;
