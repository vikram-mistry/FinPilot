import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, getCurrentMonth } from '@/lib/formatters';

const expenseItemSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  amount: z.number().min(1, { message: 'Amount must be positive' }),
  category: z.string().min(1, { message: 'Category is required' }),
  startMonth: z.string().min(1, { message: 'Start month is required' }),
});

const schema = z.object({
  expenses: z.array(expenseItemSchema),
});

type FormValues = z.infer<typeof schema>;

interface RecurringExpensesStepProps {
  onNext: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  loanSetup: any; // pass loanSetup to auto-populate EMI if present
}

export function RecurringExpensesStep({ onNext, defaultValues, loanSetup }: RecurringExpensesStepProps) {
  const currentYYYYMM = getCurrentMonth();

  // Preset suggestions for quick adding
  const presets = [
    { name: 'Groceries', amount: 15000, category: 'Food & Dining' },
    { name: 'Electricity', amount: 4000, category: 'Bills & Utilities' },
    { name: 'Maintenance', amount: 3500, category: 'Bills & Utilities' },
    { name: 'Milk & Newspaper', amount: 1800, category: 'Food & Dining' },
    { name: 'Insurance Premium', amount: 2500, category: 'Insurance' },
    { name: 'School Fees', amount: 8000, category: 'Education' },
    { name: 'Parents Support', amount: 15000, category: 'Family' },
    { name: 'Miscellaneous', amount: 5000, category: 'Discretionary' },
  ];

  const initialExpenses = defaultValues?.expenses || [];

  const {
    control,
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenses: initialExpenses.length > 0 
        ? initialExpenses 
        : [
            ...(loanSetup 
              ? [{ name: `${loanSetup.bankName} EMI`, amount: loanSetup.emi, category: 'EMI', startMonth: currentYYYYMM }] 
              : []
            ),
          ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'expenses',
  });

  const formValues = watch();
  const totalExpenses = (formValues.expenses || []).reduce((acc, curr) => acc + (curr?.amount || 0), 0);

  const handleAddPreset = (preset: typeof presets[0]) => {
    append({
      name: preset.name,
      amount: preset.amount,
      category: preset.category,
      startMonth: currentYYYYMM,
    });
  };

  const onSubmit = (data: FormValues) => {
    onNext(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Suggestions block */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Quick Preset Suggestions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleAddPreset(preset)}
              className="text-xs px-3.5 py-2 rounded-full border border-border bg-card hover:bg-primary/5 hover:border-primary hover:text-primary transition-all font-medium flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>{preset.name} ({formatCurrency(preset.amount)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expenses list */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-bold">List of Recurring Monthly Expenses</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', amount: 0, category: 'Bills & Utilities', startMonth: currentYYYYMM })}
            className="gap-1.5 rounded-xl text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom</span>
          </Button>
        </div>

        {fields.length === 0 && (
          <div className="p-8 border border-dashed border-border rounded-2xl text-center text-muted-foreground text-xs space-y-1.5 bg-muted/20">
            <AlertCircle className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <p className="font-semibold text-foreground">No recurring expenses added</p>
            <p>Add common monthly expenses or use the presets above.</p>
          </div>
        )}

        <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 bg-muted/30 dark:bg-muted/5 p-4 rounded-2xl border relative items-start group">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Name */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Expense Name</Label>
                  <Input
                    placeholder="e.g. Grocery"
                    className="bg-card h-10 text-sm"
                    {...register(`expenses.${index}.name` as const)}
                  />
                  {errors.expenses?.[index]?.name && (
                    <p className="text-[10px] text-expense-500 font-semibold">{errors.expenses[index]?.name?.message}</p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Amount</Label>
                  <Controller
                    control={control}
                    name={`expenses.${index}.amount` as const}
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Amount"
                        className="bg-card h-10 text-sm"
                      />
                    )}
                  />
                  {errors.expenses?.[index]?.amount && (
                    <p className="text-[10px] text-expense-500 font-semibold">{errors.expenses[index]?.amount?.message}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Category</Label>
                  <Controller
                    control={control}
                    name={`expenses.${index}.category` as const}
                    render={({ field }) => (
                      <Select defaultValue={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-card h-10 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Food & Dining', 'Bills & Utilities', 'EMI', 'Insurance', 'Education', 'Family', 'Travel', 'Discretionary', 'SIP', 'Investment', 'Miscellaneous'].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.expenses?.[index]?.category && (
                    <p className="text-[10px] text-expense-500 font-semibold">{errors.expenses[index]?.category?.message}</p>
                  )}
                </div>

                {/* Start Month */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Start Month</Label>
                  <Input
                    type="month"
                    className="bg-card h-10 text-sm"
                    {...register(`expenses.${index}.startMonth` as const)}
                  />
                  {errors.expenses?.[index]?.startMonth && (
                    <p className="text-[10px] text-expense-500 font-semibold">{errors.expenses[index]?.startMonth?.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl mt-4.5 shrink-0"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Aggregate summary card */}
      <Card className="border-expense-500/20 bg-expense-50/5 text-expense-800 dark:text-expense-300 rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-expense-600 dark:text-expense-400 uppercase tracking-wider">Total Monthly Recurring Commits</span>
            <h4 className="text-xl font-bold mt-1 text-foreground">{formatCurrency(totalExpenses)}</h4>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full py-6 rounded-2xl font-bold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20">
        Finalize Onboarding & Complete Setup
      </Button>
    </form>
  );
}
export default RecurringExpensesStep;
