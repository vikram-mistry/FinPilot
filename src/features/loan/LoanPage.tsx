import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocument, useCollection, setDocument, addDocument, deleteDocument } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { buildDailyAmortization } from '@/lib/loanCalculator';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { Plus, Trash2, Home, Landmark, Calendar, Percent, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { LoanOutstandingChart } from '@/components/charts/LoanOutstandingChart';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { LoanSetup, LoanHistoryEntry } from '@/types';

const rateEntrySchema = z.object({
  effectiveDate: z.string().min(1, { message: 'Date is required' }),
  rate: z.coerce.number().min(1, { message: 'Rate must be positive' }),
});

export function LoanPage() {
  const user = useAuthStore((s) => s.user);
  
  // Load Configurations
  const { data: loanSetup, loading: loanLoading } = useDocument<LoanSetup>('loanSetup');
  const { data: loanHistory = [], loading: historyLoading } = useCollection<LoanHistoryEntry>('loanHistory');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history' | 'rates'>('schedule');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<{ effectiveDate: string; rate: number }>({
    resolver: zodResolver(rateEntrySchema),
  });

  const [prepayDialogOpen, setPrepayDialogOpen] = useState(false);

  const prepaySchema = z.object({
    date: z.string().min(1, { message: 'Date is required' }),
    prepaymentAmount: z.number().min(1, { message: 'Amount must be positive' }),
  });

  const {
    register: registerPrepay,
    handleSubmit: handlePrepaySubmit,
    control: prepayControl,
    reset: resetPrepay,
    formState: { errors: prepayErrors },
  } = useForm<{ date: string; prepaymentAmount: number }>({
    resolver: zodResolver(prepaySchema),
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
      prepaymentAmount: 10000,
    }
  });

  const onAddPrepayment = async (data: { date: string; prepaymentAmount: number }) => {
    if (!user || !loanSetup) return;

    try {
      const amortizationBefore = buildDailyAmortization(loanSetup, loanHistory);
      const outstandingBefore = amortizationBefore.currentOutstanding;

      const newPrepayLog = {
        date: data.date,
        prepaymentAmount: Number(data.prepaymentAmount),
      };

      const updatedHistory = [...loanHistory, newPrepayLog].sort((a, b) => a.date.localeCompare(b.date));
      const amortizationAfter = buildDailyAmortization(loanSetup, updatedHistory);
      const outstandingAfter = amortizationAfter.currentOutstanding;
      const tenureReduced = Math.max(0, amortizationBefore.schedule.length - amortizationAfter.schedule.length);

      const prepayEntry = {
        date: data.date,
        prepaymentAmount: Number(data.prepaymentAmount),
        outstandingBefore,
        outstandingAfter,
        tenureReducedByMonths: tenureReduced,
        cumulativeInterestSaved: amortizationAfter.interestSaved,
      };

      await addDocument(user.uid, 'loanHistory', prepayEntry);
      
      resetPrepay();
      setPrepayDialogOpen(false);
    } catch (err) {
      console.error('Failed to log prepayment:', err);
    }
  };

  const onDeletePrepayment = async (id: string) => {
    if (!user) return;
    try {
      await deleteDocument(user.uid, `loanHistory/${id}`);
    } catch (err) {
      console.error('Failed to delete prepayment:', err);
    }
  };

  if (loanLoading || historyLoading) {
    return <div className="text-center py-20">Loading Home Loan Details...</div>;
  }

  if (!loanSetup) {
    return (
      <EmptyState
        icon={Home}
        title="No Active Home Loan"
        description="Configure your home loan setup during onboarding or settings to calculate amortization schedules."
      />
    );
  }

  // Calculate Amortization Schedules (With & Without Prepayments)
  let amortizationWith: any = null;
  let amortizationWithout: any = null;
  let isNegativeAmortization = false;

  // Sort and calculate individual prepayment marginal savings
  const sortedPrepayments = [...loanHistory].sort((a, b) => a.date.localeCompare(b.date));
  let cumulativeInterestHistory: number[] = [];
  let tenureReducedHistory: number[] = [];
  
  if (loanSetup) {
    try {
      let runningHistory: any[] = [];
      const baseAmortization = buildDailyAmortization(loanSetup, []);
      const baseTenureMonths = baseAmortization.schedule.length;

      sortedPrepayments.forEach((prepay) => {
        runningHistory.push(prepay);
        const amort = buildDailyAmortization(loanSetup, runningHistory);
        cumulativeInterestHistory.push(amort.interestSaved);
        tenureReducedHistory.push(Math.max(0, baseTenureMonths - amort.schedule.length));
      });
    } catch (err) {
      console.error('Error precalculating prepayment history savings:', err);
    }
  }

  const computedPrepayments = sortedPrepayments.map((item: any, idx: number) => {
    const cumulativeSaved = cumulativeInterestHistory[idx] || 0;
    const prevCumulativeSaved = (idx > 0 ? cumulativeInterestHistory[idx - 1] : 0) || 0;
    const specificSaved = Math.max(0, cumulativeSaved - prevCumulativeSaved);

    const cumulativeTenure = tenureReducedHistory[idx] || 0;
    const prevCumulativeTenure = (idx > 0 ? tenureReducedHistory[idx - 1] : 0) || 0;
    const specificTenure = Math.max(0, cumulativeTenure - prevCumulativeTenure);

    return {
      ...item,
      specificSaved,
      specificTenure
    };
  }).sort((a, b) => b.date.localeCompare(a.date)); // Sort descending for display (latest first)

  try {
    amortizationWith = buildDailyAmortization(loanSetup, loanHistory);
    
    // Build schedule without prepayments for comparison
    amortizationWithout = buildDailyAmortization(loanSetup, []);

    // Check if interest accrued exceeds EMI in any row
    isNegativeAmortization = amortizationWith.schedule.some((row: any) => row.emi < row.interestComponent);
  } catch (err) {
    console.error('Amortization calculation error:', err);
  }

  const schedule = amortizationWith?.schedule || [];
  const totalInterestSaved = amortizationWith?.interestSaved || 0;
  const closureDate = amortizationWith?.closureDate || new Date();
  const currentOutstanding = amortizationWith?.currentOutstanding || 0;
  const remainingMonths = amortizationWith?.remainingTenureMonths || 0;

  // Add Rate Revision Entry
  const onAddRate = async (data: { effectiveDate: string; rate: number }) => {
    if (!user) return;
    
    // Sort rateHistory
    const updatedHistory = [
      ...loanSetup.rateHistory,
      { effectiveDate: data.effectiveDate, rate: Number(data.rate) }
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    const updatedSetup: LoanSetup = {
      ...loanSetup,
      rateHistory: updatedHistory,
      currentRate: updatedHistory[updatedHistory.length - 1]?.rate || loanSetup.currentRate
    };

    await setDocument(user.uid, 'loanSetup', updatedSetup);
    reset();
    setDialogOpen(false);
  };

  // Delete Rate Revision Entry
  const onDeleteRate = async (index: number) => {
    if (!user || loanSetup.rateHistory.length <= 1) return; // keep at least 1 entry

    const updatedHistory = loanSetup.rateHistory.filter((_, idx) => idx !== index);
    const updatedSetup: LoanSetup = {
      ...loanSetup,
      rateHistory: updatedHistory,
      currentRate: updatedHistory[updatedHistory.length - 1]?.rate || loanSetup.currentRate
    };

    await setDocument(user.uid, 'loanSetup', updatedSetup);
  };

  // Prepare chart data format
  const chartData = schedule.map((row: any, idx: number) => {
    const withoutRow = amortizationWithout?.schedule[idx] || amortizationWithout?.schedule[amortizationWithout.schedule.length - 1];
    return {
      month: row.month,
      withPrepayment: row.closingBalance,
      withoutPrepayment: withoutRow ? withoutRow.closingBalance : 0,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary tracking-wider uppercase">Home Loan Operating System</span>
          <h2 className="text-2xl font-bold mt-1 text-foreground">{loanSetup.loanName} ({loanSetup.bankName})</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Reducing balance calculation from disbursement date {formatDate(loanSetup.disbursementDate)}.</p>
        </div>
      </div>

      {/* Negative Amortization Alert */}
      {isNegativeAmortization && (
        <Card className="border-expense-500/30 bg-expense-500/5 text-expense-700 dark:text-expense-400 rounded-2xl p-4 flex gap-3.5 items-start">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-expense-500" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Negative Amortization Warning</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your interest rate has risen such that the monthly interest accrued exceeds your EMI amount. 
              Increase your EMI in Settings or make a prepayment to prevent your outstanding balance from increasing.
            </p>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Outstanding"
          value={formatCurrency(currentOutstanding)}
          subtitle="Computed current balance"
          icon={TrendingUp}
          color="loan"
        />
        <StatCard
          title="Interest Rate"
          value={formatPercent(loanSetup.currentRate)}
          subtitle="Floating rate active"
          icon={Percent}
          color="loan"
        />
        <StatCard
          title="Monthly EMI"
          value={formatCurrency(loanSetup.emi)}
          subtitle="Fixed monthly debit"
          icon={Home}
          color="loan"
        />
        <StatCard
          title="Remaining Tenure"
          value={`${Math.floor(remainingMonths / 12)}y ${remainingMonths % 12}m`}
          subtitle={`At disbursement: ${loanSetup.originalTenureMonths}m`}
          icon={Calendar}
          color="loan"
        />
        <StatCard
          title="Closure Date"
          value={closureDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          subtitle="Estimated loan payoff"
          icon={Sparkles}
          color="income"
        />
        <StatCard
          title="Interest Saved"
          value={formatCurrency(totalInterestSaved)}
          subtitle="Saved from prepayments"
          icon={Landmark}
          color="networth"
        />
      </div>

      {/* Projection Chart Card */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Principal Reduction Path</CardTitle>
          <CardDescription className="text-xs">With prepayments (orange) vs original scheduled amortization (gray)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <LoanOutstandingChart data={chartData} />
        </CardContent>
      </Card>

      {/* Amortization and Rate Revisions Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Toggle details (Schedule / History) */}
        <Card className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <CardHeader className="border-b pb-3 flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'schedule' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('schedule')}
                size="sm"
                className="rounded-xl font-semibold"
              >
                Amortization Schedule
              </Button>
              <Button
                variant={activeTab === 'history' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('history')}
                size="sm"
                className="rounded-xl font-semibold"
              >
                Prepayments List ({loanHistory.length})
              </Button>
            </div>

            {activeTab === 'history' && (
              <Dialog open={prepayDialogOpen} onOpenChange={setPrepayDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl gap-1 font-semibold text-xs ml-auto">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Prepayment</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border border-border">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-foreground">Log Past Prepayment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePrepaySubmit(onAddPrepayment)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="prepayDate">Prepayment Date</Label>
                      <Input id="prepayDate" type="date" {...registerPrepay('date')} />
                      {prepayErrors.date && <p className="text-xs text-expense-500">{prepayErrors.date.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Prepayment Amount</Label>
                      <Controller
                        control={prepayControl}
                        name="prepaymentAmount"
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="e.g. 50,000"
                          />
                        )}
                      />
                      {prepayErrors.prepaymentAmount && <p className="text-xs text-expense-500">{prepayErrors.prepaymentAmount.message}</p>}
                    </div>
                    <Button type="submit" className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-primary/20 mt-4">
                      Save Prepayment
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="pt-5 p-0">
            {activeTab === 'schedule' ? (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50 dark:bg-muted/10">
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Opening Bal</TableHead>
                      <TableHead className="text-right">EMI Paid</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Prepayment</TableHead>
                      <TableHead className="text-right">Closing Bal</TableHead>
                      <TableHead className="text-right">Rate %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((row: any) => (
                      <TableRow key={row.month} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground">{row.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.openingBalance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.emi)}</TableCell>
                        <TableCell className="text-right text-expense-600 dark:text-expense-400">{formatCurrency(row.interestComponent)}</TableCell>
                        <TableCell className="text-right text-income-600 dark:text-income-400">{formatCurrency(row.principalComponent)}</TableCell>
                        <TableCell className="text-right font-bold text-income-600 dark:text-income-400">
                          {row.prepayment > 0 ? formatCurrency(row.prepayment) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{formatCurrency(row.closingBalance)}</TableCell>
                        <TableCell className="text-right">{row.rate.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="px-6 py-4">
                {computedPrepayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No prepayments logged yet.</p>
                ) : (
                  <div className="space-y-3.5">
                    {computedPrepayments.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs font-semibold bg-muted/40 p-4 border rounded-2xl">
                        <div className="space-y-1">
                          <p className="text-foreground">Prepayment of {formatCurrency(item.prepaymentAmount)}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">Logged on {formatDate(item.date)}</p>
                        </div>
                        <div className="text-right space-y-1 flex items-center gap-3">
                          <div>
                            <p className="text-income-600 dark:text-income-400">Tenure reduced by {item.specificTenure} mos</p>
                            <p className="text-[10px] text-muted-foreground font-normal">Interest saved: {formatCurrency(item.specificSaved)}</p>
                          </div>
                          {item.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeletePrepayment(item.id)}
                              className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Toggle details (Rates revisions list) */}
        <Card className="rounded-2xl border border-border bg-card flex flex-col">
          <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold">Interest Revisions</CardTitle>
              <CardDescription className="text-xs">Float rate changes logged</CardDescription>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl gap-1 font-semibold text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Revision</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-foreground">Log Floating Rate Change</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAddRate)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    <Input id="effectiveDate" type="date" {...register('effectiveDate')} />
                    {errors.effectiveDate && <p className="text-xs text-expense-500">{errors.effectiveDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">New Interest Rate (%)</Label>
                    <Input id="rate" type="number" step="0.01" {...register('rate')} />
                    {errors.rate && <p className="text-xs text-expense-500">{errors.rate.message}</p>}
                  </div>
                  <Button type="submit" className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-primary/20 mt-4">
                    Save Rate Revision
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="pt-5 flex-1 overflow-y-auto">
            <div className="space-y-3.5">
              {loanSetup.rateHistory.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold bg-muted/30 p-3 rounded-xl border">
                  <div>
                    <p className="text-foreground">{item.rate.toFixed(2)}%</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Effective {formatDate(item.effectiveDate)}</p>
                  </div>
                  {idx > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteRate(idx)}
                      className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
export default LoanPage;
