import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, PiggyBank, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';

const schema = z.object({
  currentCorpus: z.number().min(0, { message: 'Corpus cannot be negative' }),
  targetMonths: z.coerce.number().min(1).max(36),
  monthlyExpenses: z.number().min(1000, { message: 'Monthly expenses must be at least ₹1,000' }),
});

type FormValues = z.infer<typeof schema>;

interface EmergencyStepProps {
  onNext: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
}

export function EmergencyStep({ onNext, defaultValues }: EmergencyStepProps) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentCorpus: defaultValues?.currentCorpus || 0,
      targetMonths: defaultValues?.targetMonths || 9,
      monthlyExpenses: defaultValues?.monthlyExpenses || 50000,
    },
  });

  const formValues = watch();
  const targetCorpus = formValues.monthlyExpenses * formValues.targetMonths;
  const progressPct = targetCorpus > 0 ? Math.min(100, (formValues.currentCorpus / targetCorpus) * 100) : 0;

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Emergency Fund Corpus */}
        <div className="space-y-2">
          <Label>Current Emergency Fund Value</Label>
          <Controller
            control={control}
            name="currentCorpus"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 1,50,000"
              />
            )}
          />
          {errors.currentCorpus && <p className="text-xs text-expense-500">{errors.currentCorpus.message}</p>}
        </div>

        {/* Monthly Expenses estimate */}
        <div className="space-y-2">
          <Label>Estimate of Monthly Fixed Expenses</Label>
          <Controller
            control={control}
            name="monthlyExpenses"
            render={({ field }) => (
              <CurrencyInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. 50,000"
              />
            )}
          />
          {errors.monthlyExpenses && <p className="text-xs text-expense-500">{errors.monthlyExpenses.message}</p>}
        </div>

        {/* Target Coverage Months */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="targetMonths">Target Coverage Months</Label>
          <Select
            defaultValue={String(formValues.targetMonths)}
            onValueChange={(val) => setValue('targetMonths', Number(val))}
          >
            <SelectTrigger id="targetMonths">
              <SelectValue placeholder="Select months" />
            </SelectTrigger>
            <SelectContent>
              {[3, 6, 9, 12, 15, 18, 24].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} Months of Expenses (Recommended {m === 9 ? '9m' : m === 6 ? '6m' : `${m}m`})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Target calculation preview card */}
      <Card className="border-emergency-500/20 bg-emergency-50/5 text-emergency-800 dark:text-emergency-300 rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emergency-500/10 flex items-center justify-center text-emergency-500">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emergency-600 dark:text-emergency-400 uppercase tracking-wider">Emergency Target Goal</p>
                <h4 className="text-base font-bold mt-0.5">{formatCurrency(targetCorpus)}</h4>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emergency-500/10 flex items-center justify-center text-emergency-500">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Funded Progress</p>
                <h4 className="text-base font-bold mt-0.5">{progressPct.toFixed(1)}%</h4>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>{formatCurrency(formValues.currentCorpus)} saved</span>
              <span>{formatCurrency(targetCorpus)} target</span>
            </div>
            <Progress value={progressPct} className="h-2.5 bg-muted [&>div]:bg-emergency-500 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full py-6 rounded-2xl font-bold bg-emergency-600 hover:bg-emergency-700 text-white shadow-lg shadow-emergency-500/20">
        Save & Continue
      </Button>
    </form>
  );
}
export default EmergencyStep;
