import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocument, useCollection, setDocument, addDocument, deleteDocument } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { Shield, TrendingUp, Plus, Trash2, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import type { EmergencyFund, EmergencyHistoryEntry } from '@/types';

const historySchema = z.object({
  date: z.string().min(1, { message: 'Date is required' }),
  type: z.enum(['contribution', 'withdrawal']),
  amount: z.number().min(1, { message: 'Amount must be positive' }),
  description: z.string().min(2, { message: 'Description is required' }),
});

export function EmergencyFundPage() {
  const user = useAuthStore((s) => s.user);

  // Load Firestore details
  const { data: emergencyFund, loading: fundLoading } = useDocument<EmergencyFund>('emergencyFund');
  const { data: history = [], loading: historyLoading } = useCollection<EmergencyHistoryEntry>('emergencyHistory');

  const [dialogOpen, setDialogOpen] = useState(false);

  // Log Form Hook
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<{ date: string; type: 'contribution' | 'withdrawal'; amount: number; description: string }>({
    resolver: zodResolver(historySchema),
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
      type: 'contribution',
      amount: 10000,
      description: '',
    },
  });

  if (fundLoading || historyLoading) {
    return <div className="text-center py-20">Loading Emergency Fund Details...</div>;
  }

  // Fallback defaults
  const currentCorpus = emergencyFund?.currentCorpus || 0;
  const monthlyExpenses = emergencyFund?.monthlyExpenses || 50000;
  const targetMonths = emergencyFund?.targetMonths || 6;
  const targetAmount = monthlyExpenses * targetMonths;
  const progressPct = targetAmount > 0 ? Math.min(100, (currentCorpus / targetAmount) * 100) : 0;
  const coverageMonths = monthlyExpenses > 0 ? currentCorpus / monthlyExpenses : 0;

  // Milestone checkmarks
  const milestones = [
    { label: 'Starter Fund (1 Mo)', months: 1, text: 'Initial cushion' },
    { label: 'Basic Safety (3 Mos)', months: 3, text: 'Covers minor shocks' },
    { label: 'Standard Shield (6 Mos)', months: 6, text: 'Solid peace of mind' },
    { label: 'Bulletproof (9+ Mos)', months: 9, text: 'Ultimate financial fortress' },
  ];

  // Submit new log entry
  const onSubmitLog = async (data: { date: string; type: 'contribution' | 'withdrawal'; amount: number; description: string }) => {
    if (!user) return;

    try {
      // 1. Log to history collection
      await addDocument(user.uid, 'emergencyHistory', data);

      // 2. Adjust main corpus
      const adjustment = data.type === 'contribution' ? data.amount : -data.amount;
      const updatedCorpus = Math.max(0, currentCorpus + adjustment);

      await setDocument(user.uid, 'emergencyFund', {
        ...emergencyFund,
        currentCorpus: updatedCorpus,
        monthlyExpenses,
        targetMonths,
      });

      reset({
        date: new Date().toISOString().substring(0, 10),
        type: 'contribution',
        amount: 10000,
        description: '',
      });
      setDialogOpen(false);
    } catch (err) {
      console.error('Failed to log emergency action:', err);
    }
  };

  // Delete log entry
  const onDeleteLog = async (item: EmergencyHistoryEntry) => {
    if (!user || !item.id) return;

    try {
      // 1. Delete from history
      await deleteDocument(user.uid, `emergencyHistory/${item.id}`);

      // 2. Reverse main corpus adjustment
      const reversalAdjustment = item.type === 'contribution' ? -item.amount : item.amount;
      const updatedCorpus = Math.max(0, currentCorpus + reversalAdjustment);

      await setDocument(user.uid, 'emergencyFund', {
        ...emergencyFund,
        currentCorpus: updatedCorpus,
        monthlyExpenses,
        targetMonths,
      });
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  // Get status details
  const getStatusText = () => {
    if (coverageMonths >= targetMonths) return { label: 'Fully Shielded', color: 'text-income-500 bg-income-500/10 border-income-500/20' };
    if (coverageMonths >= 3) return { label: 'Moderate Protection', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' };
    return { label: 'Vulnerable', color: 'text-expense-500 bg-expense-500/10 border-expense-500/20' };
  };

  const status = getStatusText();

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-xs font-bold text-primary tracking-wider uppercase">Risk Management</span>
          <h2 className="text-2xl font-bold mt-1 text-foreground">Emergency Fund</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your liquid buffer, track coverage milestones, and log contributions.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl py-5 shadow-lg shadow-primary/20 gap-1.5 font-bold text-xs bg-primary text-white hover:bg-primary/95">
              <Plus className="w-4 h-4" />
              <span>Log Action</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">Log Fund Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitLog)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Transaction Type</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contribution">Deposit (Contribution)</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal (Emergency Use)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-expense-500">{errors.date.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="e.g. Saved from salary, Car repairs, Medical bill" {...register('description')} />
                {errors.description && <p className="text-xs text-expense-500">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="e.g. 10,000"
                    />
                  )}
                />
                {errors.amount && <p className="text-xs text-expense-500">{errors.amount.message}</p>}
              </div>

              <Button type="submit" className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-primary/20 mt-4">
                Confirm Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Current Corpus"
          value={formatCurrency(currentCorpus)}
          subtitle={`Covers ~${coverageMonths.toFixed(1)} months`}
          icon={Shield}
          color="emergency"
        />
        <StatCard
          title="Target Corpus"
          value={formatCurrency(targetAmount)}
          subtitle={`${targetMonths} months of standard expenses`}
          icon={TrendingUp}
          color="networth"
        />
        <Card className="rounded-2xl border border-border bg-card flex flex-col justify-center p-5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Safety Status</span>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground">{progressPct.toFixed(0)}%</span>
            <span className="text-xs text-muted-foreground">funded</span>
          </div>
          <div className="w-full bg-muted/40 dark:bg-muted/10 h-2 rounded-full mt-3.5 overflow-hidden">
            <div className="bg-emergency-500 h-full rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Milestones Column */}
        <Card className="lg:col-span-1 rounded-2xl border border-border bg-card">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Safety Milestones</CardTitle>
            <CardDescription className="text-xs">Milestone checkmarks based on coverage length</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {milestones.map((m) => {
              const reached = coverageMonths >= m.months;
              return (
                <div
                  key={m.months}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                    reached
                      ? 'border-emergency-500/20 bg-emergency-50/5 text-foreground'
                      : 'border-border bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      reached ? 'bg-emergency-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">{m.label}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.text}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Log List Column */}
        <Card className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Transaction History</CardTitle>
            <CardDescription className="text-xs">Chronological logs of deposits and withdrawals</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 p-0 max-h-[400px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground mt-3">No transactions logged yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((item) => {
                    const isDeposit = item.type === 'contribution';
                    return (
                      <div key={item.id} className="flex justify-between items-center px-6 py-4 hover:bg-muted/10">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isDeposit ? 'bg-income-500/10 text-income-500' : 'bg-expense-500/10 text-expense-500'
                            }`}
                          >
                            {isDeposit ? <ArrowUpRight className="w-4.5 h-4.5" /> : <ArrowDownRight className="w-4.5 h-4.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{item.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.date)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5">
                          <span className={`text-xs font-bold ${isDeposit ? 'text-income-600 dark:text-income-400' : 'text-expense-600 dark:text-expense-400'}`}>
                            {isDeposit ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteLog(item)}
                            className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl w-8 h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default EmergencyFundPage;
