import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocument, useCollection, setDocument, addDocument } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { getCurrentMonth, formatCurrency, parseCurrencyInput } from '@/lib/formatters';
import { generateAllocation } from '@/lib/advisor';
import { buildDailyAmortization } from '@/lib/loanCalculator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Coins, 
  Percent, 
  ChevronRight,
  Info,
  Unlock
} from 'lucide-react';
import { motion } from 'motion/react';
import type { LoanSetup, EmergencyFund, InvestmentSetup, MonthlyRecord, RecurringExpense, OneTimeExpense } from '@/types';

const oneTimeExpenseSchema = z.object({
  description: z.string().min(1, { message: 'Description is required' }),
  amount: z.number().min(1, { message: 'Amount must be positive' }),
  category: z.string().min(1, { message: 'Category is required' }),
});

const schema = z.object({
  salaryIncome: z.number().min(0),
  bonusIncome: z.number().min(0),
  otherIncome: z.number().min(0),
  sodexoDeduction: z.number().min(0),
  otherDeductions: z.number().min(0),
  oneTimeExpenses: z.array(oneTimeExpenseSchema),
  didPrepay: z.boolean(),
  prepaymentAmount: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

export function MonthlyPlannerPage() {
  const user = useAuthStore((s) => s.user);
  const { profile } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  
  // Load Configurations
  const { data: loanSetup } = useDocument<LoanSetup>('loanSetup');
  const { data: emergencyFund } = useDocument<EmergencyFund>('emergencyFund');
  const { data: investmentSetup } = useDocument<InvestmentSetup>('investmentSetup');
  const { data: savedRecord } = useDocument<MonthlyRecord>(`monthlyRecords/${selectedMonth}`);
  const { data: recurringExpenses = [] } = useCollection<RecurringExpense>('recurringExpenses');
  const { data: loanHistory = [] } = useCollection<any>('loanHistory');

  // Advisor Allocation result state
  const [advisorPlan, setAdvisorPlan] = useState<any>(null);
  const [adjustingPlan, setAdjustingPlan] = useState<any>(null);
  const [isFinalizedState, setIsFinalizedState] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    register,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      salaryIncome: 120000,
      bonusIncome: 0,
      otherIncome: 0,
      sodexoDeduction: 0,
      otherDeductions: 0,
      oneTimeExpenses: [],
      didPrepay: false,
      prepaymentAmount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'oneTimeExpenses',
  });

  const formValues = watch();

  // Reset form values when savedRecord loads for that month
  useEffect(() => {
    if (savedRecord) {
      reset({
        salaryIncome: savedRecord.salaryIncome || 0,
        bonusIncome: savedRecord.bonusIncome || 0,
        otherIncome: savedRecord.otherIncome || 0,
        sodexoDeduction: savedRecord.sodexoDeduction || 0,
        otherDeductions: savedRecord.otherDeductions || 0,
        oneTimeExpenses: savedRecord.oneTimeExpenses || [],
        didPrepay: savedRecord.actualPrepayment > 0,
        prepaymentAmount: savedRecord.actualPrepayment || 0,
      });
      setIsFinalizedState(savedRecord.finalized);

      const recNetIncome = (savedRecord.salaryIncome || 0) + (savedRecord.bonusIncome || 0) + (savedRecord.otherIncome || 0) - (savedRecord.sodexoDeduction || 0) - (savedRecord.otherDeductions || 0);
      const recFixed = (savedRecord.recurringExpensesSnapshot || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);
      const recVar = (savedRecord.oneTimeExpenses || []).reduce((acc: number, curr: any) => acc + (curr?.amount || 0), 0);
      const recSurplus = Math.max(0, recNetIncome - (recFixed + recVar));

      setAdjustingPlan({
        emergency: savedRecord.actualEmergencyContribution || 0,
        sip: savedRecord.actualSIP || 0,
        prepayment: savedRecord.actualPrepayment || 0,
        buffer: Math.max(0, recSurplus - (savedRecord.actualEmergencyContribution || 0) - (savedRecord.actualSIP || 0) - (savedRecord.actualPrepayment || 0)),
      });
      setAdvisorPlan({
        emergencyContribution: savedRecord.plannedEmergencyContribution || 0,
        sipAmount: savedRecord.plannedSIP || 0,
        prepaymentAmount: savedRecord.plannedPrepayment || 0,
        bufferAmount: Math.max(0, recSurplus - (savedRecord.plannedEmergencyContribution || 0) - (savedRecord.plannedSIP || 0) - (savedRecord.plannedPrepayment || 0)),
        recommendations: []
      });
    } else {
      reset({
        salaryIncome: 120000,
        bonusIncome: 0,
        otherIncome: 0,
        sodexoDeduction: 0,
        otherDeductions: 0,
        oneTimeExpenses: [],
        didPrepay: false,
        prepaymentAmount: 0,
      });
      setIsFinalizedState(false);
      setAdvisorPlan(null);
      setAdjustingPlan(null);
    }
    setSaveSuccess(false);
  }, [savedRecord, selectedMonth, reset]);

  // Navigate Previous / Next Months
  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const [yrStr, moStr] = selectedMonth.split('-');
    if (!yrStr || !moStr) return;
    const date = new Date(Number(yrStr), Number(moStr) - 1, 1);
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  // Compute live local cash flow
  const isFinalized = savedRecord && savedRecord.finalized && isFinalizedState;

  const recurringSum = isFinalized
    ? (savedRecord.recurringExpensesSnapshot || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)
    : recurringExpenses.filter(r => r.active).reduce((acc, curr) => acc + curr.amount, 0);

  const oneTimeExpensesSum = isFinalized
    ? (savedRecord.oneTimeExpenses || []).reduce((acc: number, curr: any) => acc + (curr?.amount || 0), 0)
    : (formValues.oneTimeExpenses?.reduce((acc, curr) => acc + (curr?.amount || 0), 0) || 0);

  const totalIncome = isFinalized
    ? (savedRecord.salaryIncome || 0) + (savedRecord.bonusIncome || 0) + (savedRecord.otherIncome || 0)
    : (formValues.salaryIncome || 0) + (formValues.bonusIncome || 0) + (formValues.otherIncome || 0);

  const deductions = isFinalized
    ? (savedRecord.sodexoDeduction || 0) + (savedRecord.otherDeductions || 0)
    : (formValues.sodexoDeduction || 0) + (formValues.otherDeductions || 0);

  const netIncome = Math.max(0, totalIncome - deductions);
  const totalExpenses = recurringSum + oneTimeExpensesSum;
  const surplus = Math.max(0, netIncome - totalExpenses);

  // Generate allocation plan using Advisor Engine
  const handleGeneratePlan = () => {
    if (!profile) return;
    
    // Aggregate input values for advisor
    const currentEmergency = emergencyFund?.currentCorpus || 0;
    const targetExpenses = emergencyFund?.monthlyExpenses || 50000;
    const targetMonths = emergencyFund?.targetMonths || 9;
    const currentInvest = investmentSetup?.mutualFundValue || 0;
    
    let currentOutstanding = 0;
    let loanTenure = 0;
    let loanRate = 0;

    if (loanSetup) {
      try {
        const result = buildDailyAmortization(loanSetup, loanHistory);
        currentOutstanding = result.currentOutstanding;
        loanTenure = result.remainingTenureMonths;
        loanRate = loanSetup.currentRate;
      } catch (err) {
        console.error(err);
      }
    }

    const input = {
      netIncome,
      totalExpenses,
      currentEmergencyCorpus: currentEmergency,
      emergencyTarget: targetExpenses * targetMonths,
      currentInvestments: currentInvest,
      loanOutstanding: currentOutstanding,
      loanRate,
      loanTenureMonths: loanTenure,
      monthlySurplus: surplus,
      riskProfile: profile.riskProfile,
      investmentPreference: 'balanced' as const
    };

    const plan = generateAllocation(input);
    setAdvisorPlan(plan);
    setAdjustingPlan({
      emergency: plan.emergencyContribution,
      sip: plan.sipAmount,
      prepayment: plan.prepaymentAmount,
      buffer: plan.bufferAmount,
    });
  };

  // Adjust Plan Allocation Sliders
  const handleSliderChange = (type: 'emergency' | 'sip' | 'prepayment', value: number) => {
    if (!adjustingPlan) return;
    const delta = value - adjustingPlan[type];
    const newBuffer = Math.max(0, adjustingPlan.buffer - delta);
    
    // If we have enough buffer surplus, apply adjustment
    if (adjustingPlan.buffer - delta >= 0) {
      setAdjustingPlan({
        ...adjustingPlan,
        [type]: value,
        buffer: newBuffer,
      });
    }
  };

  // Save / Finalize Plan
  const handleFinalizePlan = async () => {
    if (!user) return;
    
    const actualPrepayment = formValues.didPrepay ? formValues.prepaymentAmount : 0;

    try {
      const record: MonthlyRecord = {
        salaryIncome: formValues.salaryIncome,
        bonusIncome: formValues.bonusIncome,
        otherIncome: formValues.otherIncome,
        sodexoDeduction: formValues.sodexoDeduction,
        otherDeductions: formValues.otherDeductions,
        oneTimeExpenses: formValues.oneTimeExpenses as OneTimeExpense[],
        recurringExpensesSnapshot: recurringExpenses.map(r => ({
          name: r.name,
          amount: r.amount,
          category: r.category,
          originalAmount: r.amount
        })),
        plannedSIP: advisorPlan?.sipAmount || 0,
        actualSIP: (investmentSetup?.monthlySIP || 0) + (adjustingPlan?.sip || 0),
        plannedPrepayment: advisorPlan?.prepaymentAmount || 0,
        actualPrepayment,
        plannedEmergencyContribution: advisorPlan?.emergencyContribution || 0,
        actualEmergencyContribution: adjustingPlan?.emergency || 0,
        finalized: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 1. Write the monthly planning record
      await setDocument(user.uid, `monthlyRecords/${selectedMonth}`, record);

      // 2. Write prepayment history log if actualPrepayment is entered
      if (actualPrepayment > 0 && loanSetup) {
        // Run amortization before prepayment
        const amortizationBefore = buildDailyAmortization(loanSetup, loanHistory);
        const outstandingBefore = amortizationBefore.currentOutstanding;
        
        // Mock new prepay log
        const newPrepayLog = {
          date: `${selectedMonth}-20`, // assume payday/prepay day
          prepaymentAmount: actualPrepayment,
        };

        // Recalculate with new prepayment appended
        const updatedHistory = [...loanHistory, newPrepayLog];
        const amortizationAfter = buildDailyAmortization(loanSetup, updatedHistory);
        const outstandingAfter = amortizationAfter.currentOutstanding;
        const tenureReduced = Math.max(0, amortizationBefore.schedule.length - amortizationAfter.schedule.length);

        const prepayEntry = {
          date: `${selectedMonth}-20`,
          prepaymentAmount: actualPrepayment,
          outstandingBefore,
          outstandingAfter,
          tenureReducedByMonths: tenureReduced,
          cumulativeInterestSaved: amortizationAfter.interestSaved,
        };

        await addDocument(user.uid, 'loanHistory', prepayEntry);
      }

      setIsFinalizedState(true);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to finalize monthly plan:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Selector header */}
      <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
        <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('prev')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="font-extrabold text-lg text-foreground uppercase tracking-wider">
          {new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => handleNavigateMonth('next')}>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Planner Forms Column */}
        <div className="lg:col-span-2 space-y-6">
          <form className="space-y-6">
            
            {/* Income Card */}
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base font-bold">Salary & Incomes</CardTitle>
                <CardDescription className="text-xs">Adjust your net take-home salary or bonus for the month</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Basic Monthly Salary</Label>
                  <Controller
                    control={control}
                    name="salaryIncome"
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isFinalizedState}
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bonus / Extra Income</Label>
                  <Controller
                    control={control}
                    name="bonusIncome"
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isFinalizedState}
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Meal Card / Sodexo Deduction</Label>
                  <Controller
                    control={control}
                    name="sodexoDeduction"
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isFinalizedState}
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Other Deductions (PF, Taxes)</Label>
                  <Controller
                    control={control}
                    name="otherDeductions"
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isFinalizedState}
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recurring Commitments Auto Loaded Card */}
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base font-bold">Auto-Loaded Recurring Expenses</CardTitle>
                <CardDescription className="text-xs">These values populate automatically from settings</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-3.5">
                {recurringExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No active recurring commitments.</p>
                ) : (
                  recurringExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center text-xs font-semibold bg-muted/30 p-3 rounded-xl border">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">{exp.name}</span>
                        <span className="text-muted-foreground font-normal uppercase text-[9px] tracking-wider">{exp.category}</span>
                      </div>
                      <span className="text-foreground">{formatCurrency(exp.amount)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* One-Time Expenses Card */}
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">One-Time / Variable Expenses</CardTitle>
                  <CardDescription className="text-xs">Record irregular transactions occurring this month</CardDescription>
                </div>
                {!isFinalizedState && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', amount: 0, category: 'custom' })}
                    className="gap-1.5 rounded-xl text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-5 space-y-3.5">
                {fields.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No variable expenses logged.</p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g. Flight Ticket"
                      className="flex-1 bg-muted/10"
                      disabled={isFinalizedState}
                      {...register(`oneTimeExpenses.${index}.description` as const)}
                    />
                    <Controller
                      control={control}
                      name={`oneTimeExpenses.${index}.amount` as const}
                      render={({ field }) => (
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          className="w-32 bg-muted/10"
                          disabled={isFinalizedState}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`oneTimeExpenses.${index}.category` as const}
                      render={({ field }) => {
                        const isStandard = ['medical', 'electronics', 'travel', 'festival', 'repairs'].includes(field.value);
                        if (!isStandard) {
                          return (
                            <div className="relative w-32">
                              <Input
                                placeholder="Category"
                                className="w-full bg-muted/10 h-10 text-xs pr-6"
                                disabled={isFinalizedState}
                                value={field.value === 'custom' ? '' : field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                              {!isFinalizedState && (
                                <button
                                  type="button"
                                  onClick={() => field.onChange('medical')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px] font-bold"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Select value={field.value} onValueChange={field.onChange} disabled={isFinalizedState}>
                            <SelectTrigger className="w-32 bg-muted/10 h-10 text-xs">
                              <SelectValue placeholder="Cat" />
                            </SelectTrigger>
                            <SelectContent>
                              {['medical', 'electronics', 'travel', 'festival', 'repairs', 'custom'].map((c) => (
                                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                    {!isFinalizedState && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-expense-500 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Home Loan Prepayment Toggle */}
            {loanSetup && (
              <Card className="rounded-2xl border border-border bg-card">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-base font-bold">Home Loan Prepayment</CardTitle>
                  <CardDescription className="text-xs">Prepay extra principal amount this month to shorten tenure</CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Did you prepay towards home loan?</Label>
                      <p className="text-xs text-muted-foreground">Applies a direct reducing payment to principal balance</p>
                    </div>
                    <Controller
                      control={control}
                      name="didPrepay"
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFinalizedState}
                        />
                      )}
                    />
                  </div>

                  {formValues.didPrepay && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5 pt-2"
                    >
                      <Label>Prepayment Principal Amount</Label>
                      <Controller
                        control={control}
                        name="prepaymentAmount"
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isFinalizedState}
                            placeholder="e.g. 50,000"
                          />
                        )}
                      />
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            )}
          </form>
        </div>

        {/* Plan Calculations Sidebar */}
        <div className="space-y-6">
          
          {/* Cash Flow Summary */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Cash Flow Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Monthly Income</span>
                <span className="text-foreground">{formatCurrency(netIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixed Recurring Commitments</span>
                <span className="text-foreground">{formatCurrency(recurringSum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">One-Time Variable Bills</span>
                <span className="text-foreground">{formatCurrency(oneTimeExpensesSum)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-bold text-sm">
                <span className="text-foreground">Available Surplus</span>
                <span className="text-primary">{formatCurrency(surplus)}</span>
              </div>
            </CardContent>
            
            {!isFinalizedState && surplus > 0 && (
              <CardFooter className="pt-2">
                <Button
                  onClick={handleGeneratePlan}
                  className="w-full gap-1.5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Plan</span>
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Smart Plan Allocation Card */}
          {advisorPlan && adjustingPlan && (
            <Card className="rounded-2xl border border-primary/20 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Smart Planner Suggestions</span>
                </CardTitle>
                <CardDescription className="text-xs">Adjust sliders below to allocate surplus</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                
                {/* Emergency top up */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-foreground">
                    <span>Emergency Fund Top-up</span>
                    <span>{formatCurrency(adjustingPlan.emergency)}</span>
                  </div>
                  {!isFinalizedState && (
                    <input
                      type="range"
                      min="0"
                      max={String(adjustingPlan.emergency + adjustingPlan.buffer)}
                      value={adjustingPlan.emergency}
                      onChange={(e) => handleSliderChange('emergency', Number(e.target.value))}
                      className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                  )}
                </div>

                {/* Additional SIP */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-foreground">
                    <span>Additional SIP Investments</span>
                    <span>{formatCurrency(adjustingPlan.sip)}</span>
                  </div>
                  {!isFinalizedState && (
                    <input
                      type="range"
                      min="0"
                      max={String(adjustingPlan.sip + adjustingPlan.buffer)}
                      value={adjustingPlan.sip}
                      onChange={(e) => handleSliderChange('sip', Number(e.target.value))}
                      className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                  )}
                </div>

                {/* Prepayment allocation */}
                {loanSetup && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-foreground">
                      <span>Home Loan Prepayment</span>
                      <span>{formatCurrency(adjustingPlan.prepayment)}</span>
                    </div>
                    {!isFinalizedState && (
                      <input
                        type="range"
                        min="0"
                        max={String(adjustingPlan.prepayment + adjustingPlan.buffer)}
                        value={adjustingPlan.prepayment}
                        onChange={(e) => handleSliderChange('prepayment', Number(e.target.value))}
                        className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                    )}
                  </div>
                )}

                {/* Leftover Buffer */}
                <div className="flex justify-between text-xs font-bold text-muted-foreground border-t pt-3">
                  <span>Retained Cash Buffer</span>
                  <span>{formatCurrency(adjustingPlan.buffer)}</span>
                </div>

                {/* English Advisor text */}
                <div className="bg-muted/40 p-3.5 rounded-2xl border text-xs text-muted-foreground space-y-1.5 leading-relaxed font-medium">
                  {advisorPlan.recommendations.map((rec: string, i: number) => (
                    <p key={i} className="flex gap-2 items-start">
                      <span className="text-primary font-extrabold">•</span>
                      <span>{rec}</span>
                    </p>
                  ))}
                </div>
              </CardContent>

              {!isFinalizedState && (
                <CardFooter className="pt-2 border-t mt-4">
                  <Button
                    onClick={handleFinalizePlan}
                    className="w-full py-5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/10"
                  >
                    Finalize Plan For This Month
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

          {isFinalizedState && (
            <Card className="border-income-500/20 bg-income-50/5 text-income-800 dark:text-income-300 rounded-2xl">
              <CardContent className="p-5 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-income-500 mx-auto animate-bounce" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">Monthly Plan Is Finalized</h4>
                  <p className="text-xs text-muted-foreground mt-1">This month is locked. Click below to unlock and re-adjust this month's allocations.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFinalizedState(false)}
                    className="rounded-xl font-semibold text-xs mt-4 gap-1.5 border-income-500/30 hover:bg-income-500/10 text-income-600 dark:text-income-400"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock & Replan</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
export default MonthlyPlannerPage;
