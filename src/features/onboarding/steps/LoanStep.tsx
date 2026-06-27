import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Trash2, Home, Landmark, Calendar, Percent } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildDailyAmortization } from '@/lib/loanCalculator';
import { formatCurrency } from '@/lib/formatters';
import type { LoanSetup } from '@/types';

const rateHistorySchema = z.object({
  effectiveDate: z.string().min(1, { message: 'Date is required' }),
  rate: z.coerce.number().min(1, { message: 'Rate must be positive' }),
});

const schema = z.object({
  loanName: z.string().min(2, { message: 'Loan Name is required' }),
  bankName: z.string().min(2, { message: 'Bank Name is required' }),
  originalAmount: z.number().min(100000, { message: 'Amount must be at least ₹1 Lakh' }),
  disbursementDate: z.string().min(1, { message: 'Disbursement Date is required' }),
  emi: z.number().min(1000, { message: 'EMI must be at least ₹1,000' }),
  originalTenureMonths: z.coerce.number().min(12, { message: 'Tenure must be at least 12 months' }),
  rateType: z.enum(['fixed', 'floating']),
  initialRate: z.coerce.number().min(1, { message: 'Initial rate is required' }),
  rateHistory: z.array(rateHistorySchema).optional(),
});

type FormValues = z.infer<typeof schema>;

interface LoanStepProps {
  onNext: (values: LoanSetup | null) => void;
  defaultValues?: Partial<FormValues>;
}

export function LoanStep({ onNext, defaultValues }: LoanStepProps) {
  const [calculatedOutstanding, setCalculatedOutstanding] = useState<number | null>(null);
  const [remainingTenure, setRemainingTenure] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      loanName: defaultValues?.loanName || 'SBI MaxGain Home Loan',
      bankName: defaultValues?.bankName || 'State Bank of India',
      originalAmount: defaultValues?.originalAmount || 5000000,
      disbursementDate: defaultValues?.disbursementDate || '',
      emi: defaultValues?.emi || 45000,
      originalTenureMonths: defaultValues?.originalTenureMonths || 240,
      rateType: defaultValues?.rateType || 'floating',
      initialRate: defaultValues?.initialRate || 8.5,
      rateHistory: defaultValues?.rateHistory || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rateHistory',
  });

  const formValues = watch();

  // Run amortization calculation whenever inputs change to show preview
  useEffect(() => {
    if (!formValues.disbursementDate || !formValues.originalAmount || !formValues.emi || !formValues.initialRate) {
      setCalculatedOutstanding(null);
      setRemainingTenure(null);
      setErrorMessage(null);
      return;
    }

    try {
      // Map initial rate as the first rate history entry
      const rates = [
        { effectiveDate: formValues.disbursementDate, rate: Number(formValues.initialRate) },
        ...(formValues.rateHistory || []).map((h) => ({
          effectiveDate: h.effectiveDate,
          rate: Number(h.rate),
        })),
      ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

      const loanSetup: LoanSetup = {
        loanName: formValues.loanName,
        bankName: formValues.bankName,
        originalAmount: Number(formValues.originalAmount),
        disbursementDate: formValues.disbursementDate,
        emi: Number(formValues.emi),
        rateType: formValues.rateType,
        rateHistory: rates,
        currentRate: rates[rates.length - 1]?.rate || Number(formValues.initialRate),
        originalTenureMonths: Number(formValues.originalTenureMonths),
      };

      const result = buildDailyAmortization(loanSetup, []);
      
      // Look up current month in schedule
      const todayYYYYMM = new Date().toISOString().substring(0, 7);
      const row = result.schedule.find(r => r.month === todayYYYYMM) || result.schedule[result.schedule.length - 1];
      
      if (row) {
        setCalculatedOutstanding(row.closingBalance);
        
        // Compute remaining months in schedule from today
        const todayIndex = result.schedule.findIndex(r => r.month === todayYYYYMM);
        const rem = todayIndex >= 0 ? result.schedule.length - todayIndex : result.schedule.length;
        setRemainingTenure(rem);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Calculation error. Check dates.');
      setCalculatedOutstanding(null);
      setRemainingTenure(null);
    }
  }, [formValues]);

  const onSubmit = (data: FormValues) => {
    // Map initial rate + additional history
    const rates = [
      { effectiveDate: data.disbursementDate, rate: Number(data.initialRate) },
      ...(data.rateHistory || []).map((h) => ({
        effectiveDate: h.effectiveDate,
        rate: Number(h.rate),
      })),
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    const finalLoan: LoanSetup = {
      loanName: data.loanName,
      bankName: data.bankName,
      originalAmount: Number(data.originalAmount),
      disbursementDate: data.disbursementDate,
      emi: Number(data.emi),
      rateType: data.rateType,
      rateHistory: rates,
      currentRate: rates[rates.length - 1]?.rate || Number(data.initialRate),
      originalTenureMonths: Number(data.originalTenureMonths),
    };

    onNext(finalLoan);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Loan Name */}
          <div className="space-y-2">
            <Label htmlFor="loanName">Loan Name</Label>
            <div className="relative">
              <Home className="absolute left-3 top-3 w-4.5 h-4.5 text-muted-foreground" />
              <Input
                id="loanName"
                className="pl-10"
                placeholder="e.g. SBI MaxGain Home Loan"
                {...register('loanName')}
              />
            </div>
            {errors.loanName && <p className="text-xs text-expense-500">{errors.loanName.message}</p>}
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <div className="relative">
              <Landmark className="absolute left-3 top-3 w-4.5 h-4.5 text-muted-foreground" />
              <Input
                id="bankName"
                className="pl-10"
                placeholder="e.g. State Bank of India"
                {...register('bankName')}
              />
            </div>
            {errors.bankName && <p className="text-xs text-expense-500">{errors.bankName.message}</p>}
          </div>

          {/* Original Loan Amount */}
          <div className="space-y-2">
            <Label>Original Disbursed Amount</Label>
            <Controller
              control={control}
              name="originalAmount"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. 50,00,000"
                />
              )}
            />
            {errors.originalAmount && <p className="text-xs text-expense-500">{errors.originalAmount.message}</p>}
          </div>

          {/* Disbursement Date */}
          <div className="space-y-2">
            <Label htmlFor="disbursementDate">Disbursement Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4.5 h-4.5 text-muted-foreground" />
              <Input
                id="disbursementDate"
                type="date"
                className="pl-10"
                {...register('disbursementDate')}
              />
            </div>
            {errors.disbursementDate && <p className="text-xs text-expense-500">{errors.disbursementDate.message}</p>}
          </div>

          {/* Fixed Monthly EMI */}
          <div className="space-y-2">
            <Label>Fixed Monthly EMI</Label>
            <Controller
              control={control}
              name="emi"
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. 45,000"
                />
              )}
            />
            {errors.emi && <p className="text-xs text-expense-500">{errors.emi.message}</p>}
          </div>

          {/* Original Tenure Months */}
          <div className="space-y-2">
            <Label htmlFor="originalTenureMonths">Original Tenure (Months)</Label>
            <Input
              id="originalTenureMonths"
              type="number"
              placeholder="e.g. 240"
              {...register('originalTenureMonths')}
            />
            {errors.originalTenureMonths && <p className="text-xs text-expense-500">{errors.originalTenureMonths.message}</p>}
          </div>

          {/* Rate Type */}
          <div className="space-y-2">
            <Label>Interest Rate Type</Label>
            <div className="flex gap-4">
              {['fixed', 'floating'].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                  <input
                    type="radio"
                    value={type}
                    className="w-4 h-4 text-primary focus:ring-primary border-border"
                    {...register('rateType')}
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Initial Interest Rate */}
          <div className="space-y-2">
            <Label htmlFor="initialRate">Disbursement Interest Rate (%)</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-3 w-4.5 h-4.5 text-muted-foreground" />
              <Input
                id="initialRate"
                type="number"
                step="0.01"
                className="pl-10"
                placeholder="e.g. 8.50"
                {...register('initialRate')}
              />
            </div>
            {errors.initialRate && <p className="text-xs text-expense-500">{errors.initialRate.message}</p>}
          </div>
        </div>

        {/* Dynamic Rate History */}
        {formValues.rateType === 'floating' && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-sm font-bold">Interest Rate Change History</Label>
                <p className="text-xs text-muted-foreground">Add past interest rate revisions here to calculate your precise balance.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ effectiveDate: '', rate: 8.5 })}
                className="gap-1.5 rounded-xl text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Revision</span>
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 bg-muted/40 dark:bg-muted/10 p-3 rounded-2xl border">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      {...register(`rateHistory.${index}.effectiveDate` as const)}
                      className="bg-card"
                    />
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="New rate %"
                        className="pl-9 bg-card"
                        {...register(`rateHistory.${index}.rate` as const)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        {calculatedOutstanding !== null && (
          <Card className="border-loan-500/20 bg-loan-50/5 text-loan-800 dark:text-loan-300 rounded-2xl">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-loan-600 dark:text-loan-400 uppercase tracking-wider">Live Computed Loan Status</p>
                <h4 className="text-lg font-bold mt-1">
                  Est. Outstanding: <span className="text-foreground">{formatCurrency(calculatedOutstanding)}</span>
                </h4>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs text-muted-foreground">Est. Remaining Tenure</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {remainingTenure !== null
                    ? `${Math.floor(remainingTenure / 12)} Yrs ${remainingTenure % 12} Mos (${remainingTenure} Mos)`
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl border border-expense-500/20 bg-expense-50/10 text-expense-500 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNext(null)}
            className="flex-1 py-6 rounded-2xl font-semibold border-border hover:bg-muted"
          >
            I don't have a Home Loan (Skip)
          </Button>
          <Button
            type="submit"
            disabled={!isValid || !!errorMessage}
            className="flex-1 py-6 rounded-2xl font-bold bg-loan-600 hover:bg-loan-700 text-white shadow-lg shadow-loan-500/20"
          >
            Save & Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
export default LoanStep;
