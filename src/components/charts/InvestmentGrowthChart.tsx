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

interface GrowthDataRow {
  month: string;
  value: number;
  projected?: number;
}

interface InvestmentGrowthChartProps {
  data: GrowthDataRow[];
}

export function InvestmentGrowthChart({ data }: InvestmentGrowthChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 5, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                const val = payload[0]?.value as number;
                const proj = payload[1]?.value as number;
                return (
                  <div className="bg-popover border border-border p-3.5 rounded-2xl shadow-xl text-xs space-y-1">
                    <p className="font-semibold text-foreground">{payload[0]?.payload.month}</p>
                    <div className="flex justify-between gap-6 text-invest-600 dark:text-invest-400">
                      <span>Portfolio Value:</span>
                      <span className="font-bold">₹{Math.round(val).toLocaleString('en-IN')}</span>
                    </div>
                    {proj !== undefined && (
                      <div className="flex justify-between gap-6 text-muted-foreground border-t border-border pt-1">
                        <span>Projected Compound:</span>
                        <span className="font-bold">₹{Math.round(proj).toLocaleString('en-IN')}</span>
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
            formatter={(value) => <span className="text-xs font-semibold text-muted-foreground capitalize">{value === 'value' ? 'Current Portfolio' : 'Projected Path'}</span>}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorInvest)" 
            name="value"
          />
          {data.some(d => d.projected !== undefined) && (
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#60a5fa"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="none"
              name="projected"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export default InvestmentGrowthChart;
