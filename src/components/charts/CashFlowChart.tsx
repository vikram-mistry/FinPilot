import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrencyCompact } from '@/lib/formatters';

interface CashFlowData {
  month: string; // YYYY-MM or display name
  income: number;
  expenses: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 5, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: 'currentColor' }} 
            className="text-xs text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fill: 'currentColor' }}
            className="text-xs text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const inc = payload[0]?.value as number;
                const exp = payload[1]?.value as number;
                return (
                  <div className="bg-popover border border-border p-3.5 rounded-2xl shadow-xl text-xs space-y-1">
                    <p className="font-semibold text-foreground">{payload[0]?.payload.month}</p>
                    <div className="flex justify-between gap-6 text-income-600 dark:text-income-400">
                      <span>Income:</span>
                      <span className="font-bold">₹{inc.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-6 text-expense-600 dark:text-expense-400">
                      <span>Expenses:</span>
                      <span className="font-bold">₹{exp.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-border pt-1 flex justify-between gap-6 font-semibold text-foreground">
                      <span>Surplus:</span>
                      <span>₹{(inc - exp).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-xs font-semibold text-muted-foreground capitalize">{value}</span>}
          />
          <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
          <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export default CashFlowChart;
