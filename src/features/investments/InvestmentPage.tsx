import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDocument, useCollection, setDocument, addDocument, deleteDocument } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { StatCard } from '@/components/ui/stat-card';
import { Coins, Plus, Trash2, TrendingUp, Calendar, Target, Award, PieChart, Sparkles } from 'lucide-react';
import { InvestmentGrowthChart } from '@/components/charts/InvestmentGrowthChart';
import type { InvestmentSetup, InvestmentGoal } from '@/types';

const setupSchema = z.object({
  mutualFundValue: z.number().min(0),
  monthlySIP: z.number().min(0),
  epfValue: z.number().min(0),
  npsValue: z.number().min(0),
  otherInvestments: z.number().min(0),
  cagrRate: z.number().min(1).max(50),
});

const goalSchema = z.object({
  name: z.string().min(2, { message: 'Goal name is required' }),
  targetAmount: z.number().min(1000, { message: 'Target amount must be at least 1,000' }),
  targetDate: z.string().min(7, { message: 'Target date must be YYYY-MM' }),
  allocatedAmount: z.number().min(0),
});

export function InvestmentPage() {
  const user = useAuthStore((s) => s.user);

  // Load Firestore Details
  const { data: investmentSetup, loading: setupLoading } = useDocument<InvestmentSetup & { cagrRate?: number }>('investmentSetup');
  const { data: goals = [], loading: goalsLoading } = useCollection<InvestmentGoal>('investmentGoals');

  const [goalOpen, setGoalOpen] = useState(false);
  const [topupGoal, setTopupGoal] = useState<InvestmentGoal | null>(null);
  const [topupAmount, setTopupAmount] = useState(10000);

  const getMonthsRemaining = (targetDateStr: string) => {
    const now = new Date();
    const [targetYr, targetMo] = targetDateStr.split('-');
    const targetDate = new Date(Number(targetYr || now.getFullYear()), Number(targetMo || (now.getMonth() + 1)) - 1, 1);
    const diffYears = targetDate.getFullYear() - now.getFullYear();
    const diffMonths = targetDate.getMonth() - now.getMonth();
    return Math.max(1, diffYears * 12 + diffMonths);
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topupGoal || !topupGoal.id) return;
    try {
      const updated = {
        ...topupGoal,
        allocatedAmount: topupGoal.allocatedAmount + topupAmount,
      };
      const { id, ...cleanGoal } = updated;
      await setDocument(user.uid, `investmentGoals/${topupGoal.id}`, cleanGoal);
      setTopupGoal(null);
      setTopupAmount(10000);
    } catch (err) {
      console.error('Failed to topup goal:', err);
    }
  };

  // Setup form Hook
  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty },
    reset,
  } = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    values: {
      mutualFundValue: investmentSetup?.mutualFundValue || 0,
      monthlySIP: investmentSetup?.monthlySIP || 0,
      epfValue: investmentSetup?.epfValue || 0,
      npsValue: investmentSetup?.npsValue || 0,
      otherInvestments: investmentSetup?.otherInvestments || 0,
      cagrRate: investmentSetup?.cagrRate || 12,
    },
  });

  // Goal Form Hook
  const {
    register: registerGoal,
    handleSubmit: handleGoalSubmit,
    control: goalControl,
    reset: resetGoal,
    formState: { errors: goalErrors },
  } = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: 500000,
      targetDate: new Date(new Date().getFullYear() + 5, new Date().getMonth()).toISOString().substring(0, 7),
      allocatedAmount: 10000,
    },
  });

  if (setupLoading || goalsLoading) {
    return <div className="text-center py-20">Loading Investments Portfolio...</div>;
  }

  const mf = investmentSetup?.mutualFundValue || 0;
  const epf = investmentSetup?.epfValue || 0;
  const nps = investmentSetup?.npsValue || 0;
  const other = investmentSetup?.otherInvestments || 0;
  const sip = investmentSetup?.monthlySIP || 0;
  const cagr = investmentSetup?.cagrRate || 12;

  const totalPortfolio = mf + epf + nps + other;

  // Calculate CAGR Compounding projection path
  // FV = P * (1 + r)^t + PMT * [((1 + r)^t - 1) / r]
  const cagrMonthly = cagr / 12 / 100;
  const chartData = Array.from({ length: 11 }, (_, year) => {
    const months = year * 12;
    // Base principal growth: P * (1 + r)^months
    const baseGrowth = totalPortfolio * Math.pow(1 + cagrMonthly, months);
    
    // SIP growth: PMT * [((1 + r)^months - 1) / r]
    let sipGrowth = 0;
    if (cagrMonthly > 0 && months > 0) {
      sipGrowth = sip * ((Math.pow(1 + cagrMonthly, months) - 1) / cagrMonthly) * (1 + cagrMonthly);
    }
    
    return {
      month: `Yr ${year}`,
      value: baseGrowth, // CAGR compounding of current portfolio
      projected: baseGrowth + sipGrowth, // compounding + continued SIP additions
    };
  });

  // Target Projections
  const future5Yr = Math.round(chartData[5]?.projected || 0);
  const future10Yr = Math.round(chartData[10]?.projected || 0);

  // Save investment changes
  const onSaveSetup = async (values: z.infer<typeof setupSchema>) => {
    if (!user) return;
    try {
      await setDocument(user.uid, 'investmentSetup', values);
      alert('Portfolio details updated successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  // Add new Investment Goal
  const onAddGoal = async (data: z.infer<typeof goalSchema>) => {
    if (!user) return;
    try {
      await addDocument(user.uid, 'investmentGoals', data);
      resetGoal();
      setGoalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Investment Goal
  const onDeleteGoal = async (id: string) => {
    if (!user) return;
    try {
      await deleteDocument(user.uid, `investmentGoals/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <span className="text-xs font-bold text-primary tracking-wider uppercase">Assets & Growth</span>
        <h2 className="text-2xl font-bold mt-1 text-foreground">Investments Portfolio</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track your asset allocation, compound SIP growth paths, and align portfolios to goals.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Portfolio"
          value={formatCurrency(totalPortfolio)}
          subtitle={`EPF + Mutual Funds + NPS + Other`}
          icon={Coins}
          color="networth"
        />
        <StatCard
          title="Monthly SIP"
          value={formatCurrency(sip)}
          subtitle={`Active recurring contributions`}
          icon={TrendingUp}
          color="emergency"
        />
        <StatCard
          title="Compounded Future (10 Yrs)"
          value={formatCurrency(future10Yr)}
          subtitle={`Projected at ${cagr}% CAGR`}
          icon={Sparkles}
          color="loan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Forms & Goals */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSaveSetup)} className="space-y-6">
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold">Portfolio Allocations</CardTitle>
                <CardDescription className="text-xs">Adjust your current invested assets and monthly contributions</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Mutual Funds Value</Label>
                  <Controller
                    control={control}
                    name="mutualFundValue"
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly SIP Amount</Label>
                  <Controller
                    control={control}
                    name="monthlySIP"
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>EPF Value</Label>
                  <Controller
                    control={control}
                    name="epfValue"
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>NPS Value</Label>
                  <Controller
                    control={control}
                    name="npsValue"
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Other Assets Value</Label>
                  <Controller
                    control={control}
                    name="otherInvestments"
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cagrRate">Assumed CAGR / XIRR (%)</Label>
                  <Input id="cagrRate" type="number" {...register('cagrRate', { valueAsNumber: true })} />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button type="submit" disabled={!isDirty} className="w-full rounded-xl py-5 font-bold shadow-md shadow-primary/10">
                  Save Portfolio Changes
                </Button>
              </CardFooter>
            </Card>
          </form>

          {/* Goal-Based tagger card */}
          {(() => {
            const allocatedSum = goals.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
            const unallocated = Math.max(0, totalPortfolio - allocatedSum);
            const targetSum = goals.reduce((acc, curr) => acc + curr.targetAmount, 0);
            const remainingGap = Math.max(0, targetSum - allocatedSum);

            return (
              <Card className="rounded-2xl border border-border bg-card">
                <CardHeader className="pb-3 border-b flex flex-row justify-between items-center flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">Goal-Based Wealth Allocations</CardTitle>
                    <CardDescription className="text-xs">Map portions of your portfolio to specific milestones</CardDescription>
                  </div>

                  <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl gap-1.5 font-semibold text-xs ml-auto">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Goal</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl border border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">Create Investment Goal</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleGoalSubmit(onAddGoal)} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="goalName">Goal Name</Label>
                          <Input id="goalName" placeholder="e.g. Retirement, Child Higher Ed" {...registerGoal('name')} />
                          {goalErrors.name && <p className="text-xs text-expense-500">{goalErrors.name.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="goalTarget">Target Date</Label>
                            <Input id="goalTarget" type="month" {...registerGoal('targetDate')} />
                            {goalErrors.targetDate && <p className="text-xs text-expense-500">{goalErrors.targetDate.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label>Allocated Amount (₹)</Label>
                            <Controller
                              control={goalControl}
                              name="allocatedAmount"
                              render={({ field }) => (
                                <CurrencyInput value={field.value} onChange={field.onChange} />
                              )}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Target Corpus Amount (₹)</Label>
                          <Controller
                            control={goalControl}
                            name="targetAmount"
                            render={({ field }) => (
                              <CurrencyInput value={field.value} onChange={field.onChange} />
                            )}
                          />
                          {goalErrors.targetAmount && <p className="text-xs text-expense-500">{goalErrors.targetAmount.message}</p>}
                        </div>
                        <Button type="submit" className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-primary/20 mt-4">
                          Create Goal
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-5 p-0">
                  {/* Wealth distribution indicator banner */}
                  <div className="mx-6 mb-5 bg-muted/20 border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground font-semibold">Total Invested Portfolio</span>
                      <p className="font-extrabold text-sm text-foreground">{formatCurrency(totalPortfolio)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground font-semibold">Total Allocated to Goals</span>
                      <p className="font-extrabold text-sm text-primary">{formatCurrency(allocatedSum)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground font-semibold">Remaining Goal Target Gap</span>
                      <p className="font-extrabold text-sm text-amber-600 dark:text-amber-400">
                        {formatCurrency(remainingGap)}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[350px] overflow-y-auto px-6 space-y-4 pb-6">
                    {goals.length === 0 ? (
                      <div className="text-center py-12">
                        <Target className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                        <p className="text-xs text-muted-foreground mt-3">No goals mapped yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {goals.map((g) => {
                          const progress = Math.min(100, (g.allocatedAmount / g.targetAmount) * 100);
                          const monthsLeft = getMonthsRemaining(g.targetDate);
                          const requiredMonthly = Math.max(0, (g.targetAmount - g.allocatedAmount) / monthsLeft);
                          
                          // Determine status based on whether active monthly SIP can cover the required monthly deposit
                          const isOnTrack = sip >= requiredMonthly;

                          return (
                            <div key={g.id} className="py-4 first:pt-0 last:pb-0">
                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Target className="w-4 h-4 text-primary" />
                                    <span>{g.name}</span>
                                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${
                                      isOnTrack 
                                        ? 'text-income-500 bg-income-500/10 border-income-500/20' 
                                        : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                    }`}>
                                      {isOnTrack ? 'On Track' : 'Needs Higher SIP'}
                                    </span>
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground font-semibold">
                                    Target: {formatCurrency(g.targetAmount)} by {g.targetDate} ({monthsLeft} months left)
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-foreground">{formatCurrency(g.allocatedAmount)}</span>
                                    <p className="text-[9px] text-muted-foreground">allocated</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setTopupGoal(g);
                                      setTopupAmount(10000);
                                    }}
                                    className="h-8 text-xs font-semibold px-3 rounded-xl border-primary/20 hover:bg-primary/5 text-primary ml-1"
                                  >
                                    Add Funds
                                  </Button>
                                  {g.id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onDeleteGoal(g.id!)}
                                      className="text-expense-500 hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 rounded-xl w-8 h-8"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1 bg-muted/40 h-2 rounded-full overflow-hidden">
                                  <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-primary tracking-tight shrink-0">{progress.toFixed(1)}%</span>
                              </div>

                              {/* Banking-style feedback message */}
                              <div className="mt-2.5 bg-muted/30 p-2.5 rounded-xl border text-[10px] text-muted-foreground leading-normal font-medium">
                                <span className="text-foreground font-bold">Required savings: </span>
                                <span>{formatCurrency(requiredMonthly)}/month. </span>
                                <span>Currently, your active monthly SIP is {formatCurrency(sip)}. </span>
                                {!isOnTrack && (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                                    ⚠️ Increase your monthly SIP by {formatCurrency(requiredMonthly - sip)} to meet this target on time.
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Allocate Funds (Topup) Dialog */}
                <Dialog open={!!topupGoal} onOpenChange={(open) => !open && setTopupGoal(null)}>
                  <DialogContent className="rounded-3xl border border-border">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold text-foreground">Add Funds to {topupGoal?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTopupSubmit} className="space-y-4 pt-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Log extra savings, monthly SIP allocation, or incremental lump sums directed towards this specific financial goal.
                      </p>
                      <div className="space-y-1.5">
                        <Label>Amount to Add (₹)</Label>
                        <CurrencyInput
                          value={topupAmount}
                          onChange={(val) => setTopupAmount(Number(val) || 0)}
                        />
                      </div>
                      <Button type="submit" disabled={topupAmount <= 0} className="w-full rounded-2xl py-6 font-bold shadow-lg shadow-primary/20 mt-4">
                        Save Contribution
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </Card>
            );
          })()}
        </div>

        {/* Right Sidebar Charts */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Compounded Growth Projections</CardTitle>
              <CardDescription className="text-xs">10-year path compounding at {cagr}%</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <InvestmentGrowthChart data={chartData} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold">Asset Allocation</CardTitle>
              <CardDescription className="text-xs">Current distribution of your investments</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {[
                { label: 'Mutual Funds', val: mf, color: 'bg-blue-500' },
                { label: 'EPF', val: epf, color: 'bg-emerald-500' },
                { label: 'NPS', val: nps, color: 'bg-orange-500' },
                { label: 'Other Investments', val: other, color: 'bg-slate-500' },
              ].map((item) => {
                const pct = totalPortfolio > 0 ? (item.val / totalPortfolio) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-foreground">{item.label}</span>
                      </div>
                      <div className="space-x-1.5">
                        <span className="text-muted-foreground text-[10px] font-normal">({pct.toFixed(0)}%)</span>
                        <span className="text-foreground font-bold">{formatCurrency(item.val)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default InvestmentPage;
