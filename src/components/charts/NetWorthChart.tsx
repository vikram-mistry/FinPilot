import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrencyCompact } from '@/lib/formatters';

interface NetWorthDataRow {
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

interface NetWorthChartProps {
  data: NetWorthDataRow[];
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 5, left: -20, bottom: 5 }}
        >
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
                const assets = payload[0]?.value as number;
                const liabilities = payload[1]?.value as number;
                const netWorth = payload[2]?.value as number;
                return (
                  <div className="bg-popover border border-border p-3.5 rounded-2xl shadow-xl text-xs space-y-1">
                    <p className="font-semibold text-foreground">{payload[0]?.payload.month}</p>
                    <div className="flex justify-between gap-6 text-networth-600 dark:text-networth-400">
                      <span>Total Assets:</span>
                      <span className="font-bold">₹{Math.round(assets).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-6 text-expense-600 dark:text-expense-400">
                      <span>Total Liabilities:</span>
                      <span className="font-bold">₹{Math.round(liabilities).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-border pt-1 flex justify-between gap-6 font-bold text-foreground">
                      <span>Net Worth:</span>
                      <span>₹{Math.round(netWorth).toLocaleString('en-IN')}</span>
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
            formatter={(value) => <span className="text-xs font-semibold text-muted-foreground capitalize">{value === 'assets' ? 'Assets' : value === 'liabilities' ? 'Liabilities' : 'Net Worth'}</span>}
          />
          <Bar dataKey="assets" fill="#14b8a6" radius={[4, 4, 0, 0]} name="assets" />
          <Bar dataKey="liabilities" fill="#ef4444" radius={[4, 4, 0, 0]} name="liabilities" />
          <Line type="monotone" dataKey="netWorth" stroke="#0d9488" strokeWidth={3} dot={{ stroke: '#0d9488', strokeWidth: 2, r: 4 }} name="netWorth" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
export default NetWorthChart;
