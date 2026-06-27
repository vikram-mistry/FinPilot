import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Coins, PiggyBank, BarChart3, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const schema = z.object({
  mutualFundValue: z.number().min(0, { message: 'Must be positive or zero' }),
  monthlySIP: z.number().min(0, { message: 'Must be positive or zero' }),
  epfValue: z.number().min(0, { message: 'Must be positive or zero' }),
  npsValue: z.number().min(0, { message: 'Must be positive or zero' }),
  otherInvestments: z.number().min(0, { message: 'Must be positive or zero' }),
});

type FormValues = z.infer<typeof schema>;

interface InvestmentStepProps {
  onNext: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
}

export function InvestmentStep({ onNext, defaultValues }: InvestmentStepProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mutualFundValue: defaultValues?.mutualFundValue || 0,
      monthlySIP: defaultValues?.monthlySIP || 0,
      epfValue: defaultValues?.epfValue || 0,
      npsValue: defaultValues?.npsValue || 0,
      otherInvestments: defaultValues?.otherInvestments || 0,
    },
  });

  const formValues = watch();
  
  const totalPortfolio = 
    (formValues.mutualFundValue || 0) + 
    (formValues.epfValue || 0) + 
    (formValues.npsValue || 0) + 
    (formValues.otherInvestments || 0);

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mutual Fund Value */}
        <div className="space-y-2">
          <Label>Mutual Fund Portfolio Value</Label>
          <Controller
            control={control}
            name="mutualFundValue"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 5,00,000"
              />
            )}
          />
          {errors.mutualFundValue && <p className="text-xs text-expense-500">{errors.mutualFundValue.message}</p>}
        </div>

        {/* Monthly SIP */}
        <div className="space-y-2">
          <Label>Monthly SIP Commitments</Label>
          <Controller
            control={control}
            name="monthlySIP"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 25,000"
              />
            )}
          />
          {errors.monthlySIP && <p className="text-xs text-expense-500">{errors.monthlySIP.message}</p>}
        </div>

        {/* EPF Value */}
        <div className="space-y-2">
          <Label>Employee Provident Fund (EPF) Value</Label>
          <Controller
            control={control}
            name="epfValue"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 3,50,000"
              />
            )}
          />
          {errors.epfValue && <p className="text-xs text-expense-500">{errors.epfValue.message}</p>}
        </div>

        {/* NPS Value */}
        <div className="space-y-2">
          <Label>National Pension System (NPS) Value</Label>
          <Controller
            control={control}
            name="npsValue"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 1,20,000"
              />
            )}
          />
          {errors.npsValue && <p className="text-xs text-expense-500">{errors.npsValue.message}</p>}
        </div>

        {/* Other Investments */}
        <div className="space-y-2 md:col-span-2">
          <Label>Other Investments (Gold, Stocks, FDs, etc.)</Label>
          <Controller
            control={control}
            name="otherInvestments"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 2,00,000"
              />
            )}
          />
          {errors.otherInvestments && <p className="text-xs text-expense-500">{errors.otherInvestments.message}</p>}
        </div>
      </div>

      {/* Portfolio aggregation display */}
      <Card className="border-invest-500/20 bg-invest-50/5 text-invest-850 dark:text-invest-300 rounded-2xl">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-invest-500/10 flex items-center justify-center text-invest-500 shadow-sm border border-invest-500/15">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-invest-600 dark:text-invest-400 uppercase tracking-wider">Total Computed Portfolio Value</p>
              <h4 className="text-xl font-bold mt-1 text-foreground">{formatCurrency(totalPortfolio)}</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Monthly SIP</p>
            <h4 className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(formValues.monthlySIP || 0)}</h4>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full py-6 rounded-2xl font-bold bg-invest-600 hover:bg-invest-700 text-white shadow-lg shadow-invest-500/20">
        Save & Continue
      </Button>
    </form>
  );
}
export default InvestmentStep;
