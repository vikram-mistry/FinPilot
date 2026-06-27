import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrencyCompact } from '@/lib/formatters';

interface AmortizationChartRow {
  month: string;
  withPrepayment: number;
  withoutPrepayment: number;
}

interface LoanOutstandingChartProps {
  data: AmortizationChartRow[];
}

export function LoanOutstandingChart({ data }: LoanOutstandingChartProps) {
  // If data is too large, downsample it to avoid overloading the browser (e.g. plot every 6th month)
  const sampledData = data.filter((_, idx) => idx % 6 === 0 || idx === data.length - 1);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={sampledData}
          margin={{ top: 20, right: 5, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorWith" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorWithout" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: 'currentColor' }} 
            className="text-[10px] text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fill: 'currentColor' }}
            className="text-[10px] text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const wPre = payload[0]?.value as number;
                const woPre = payload[1]?.value as number;
                const savings = Math.max(0, woPre - wPre);

                return (
                  <div className="bg-popover border border-border p-3.5 rounded-2xl shadow-xl text-xs space-y-1">
                    <p className="font-semibold text-foreground">{payload[0]?.payload.month}</p>
                    <div className="flex justify-between gap-6 text-loan-600 dark:text-loan-400">
                      <span>With Prepayments:</span>
                      <span className="font-bold">₹{Math.round(wPre).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-6 text-muted-foreground">
                      <span>Standard Schedule:</span>
                      <span className="font-bold">₹{Math.round(woPre).toLocaleString('en-IN')}</span>
                    </div>
                    {savings > 0 && (
                      <div className="border-t border-border pt-1 flex justify-between gap-6 font-semibold text-income-600 dark:text-income-400">
                        <span>Balance Difference:</span>
                        <span>₹{Math.round(savings).toLocaleString('en-IN')}</span>
                      </div>
                    )}
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
            formatter={(value) => <span className="text-xs font-semibold text-muted-foreground capitalize">{value === 'withPrepayment' ? 'With Prepayments' : 'Standard EMI Schedule'}</span>}
          />
          <Area 
            type="monotone" 
            dataKey="withPrepayment" 
            stroke="#f97316" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorWith)" 
          />
          <Area 
            type="monotone" 
            dataKey="withoutPrepayment" 
            stroke="#94a3b8" 
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorWithout)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export default LoanOutstandingChart;
