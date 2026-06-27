import React from 'react';
import { useDocument, useCollection } from '@/hooks/useFirestore';
import { getCurrentMonth, formatCurrency, formatPercent } from '@/lib/formatters';
import { buildDailyAmortization } from '@/lib/loanCalculator';
import { StatCard } from '@/components/ui/stat-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Progress } from '@/components/ui/progress';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  ShieldAlert, 
  TrendingUp, 
  Home, 
  Sparkles,
  Calendar,
  Zap,
  Activity
} from 'lucide-react';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { ExpenseBreakdown } from '@/components/charts/ExpenseBreakdown';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { Profile, LoanSetup, EmergencyFund, InvestmentSetup, MonthlyRecord, LoanHistoryEntry, RecurringExpense } from '@/types';

export function DashboardPage() {
  const currentMonth = getCurrentMonth();
  
  // Load User Data
  const { data: profile, loading: profileLoading } = useDocument<Profile>('profile');
  const { data: loanSetup, loading: loanLoading } = useDocument<LoanSetup>('loanSetup');
  const { data: emergencyFund, loading: emergencyLoading } = useDocument<EmergencyFund>('emergencyFund');
  const { data: investmentSetup, loading: investmentLoading } = useDocument<InvestmentSetup>('investmentSetup');
  const { data: monthlyRecord, loading: recordLoading } = useDocument<MonthlyRecord>(`monthlyRecords/${currentMonth}`);
  const { data: monthlyRecords = [], loading: recordsLoading } = useCollection<MonthlyRecord>('monthlyRecords');
  const { data: loanHistory, loading: historyLoading } = useCollection<LoanHistoryEntry>('loanHistory');
  const { data: recurringExpenses, loading: recurringLoading } = useCollection<RecurringExpense>('recurringExpenses');

  const loading = profileLoading || loanLoading || emergencyLoading || investmentLoading || recordLoading || historyLoading || recurringLoading || recordsLoading;

  if (loading) {
    return <LoadingSkeleton variant="card" className="h-[400px] w-full" />;
  }

  if (!profile) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No Profile Found"
        description="Please check settings or reload the application to complete setup."
      />
    );
  }

  // ── Calculate Cash Flow ───────────────────────────────────────────────────
  const activeRecurringSum = recurringExpenses
    .filter(r => r.active)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const oneTimeExpensesSum = monthlyRecord?.oneTimeExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  
  const totalIncome = (monthlyRecord?.salaryIncome || profile.salaryDate > 0 ? (monthlyRecord?.salaryIncome || 120000) : 120000) +
                      (monthlyRecord?.bonusIncome || 0) +
                      (monthlyRecord?.otherIncome || 0);

  const deductions = (monthlyRecord?.sodexoDeduction || 0) + (monthlyRecord?.otherDeductions || 0);
  const netIncome = Math.max(0, totalIncome - deductions);
  
  const totalExpenses = activeRecurringSum + oneTimeExpensesSum;
  const surplus = Math.max(0, netIncome - totalExpenses);

  // ── Calculate Loan Outstanding ────────────────────────────────────────────
  let currentLoanOutstanding = 0;
  let remainingTenureMonths = 0;
  let totalInterestSaved = 0;
  let estimatedClosureDate = 'N/A';

  if (loanSetup) {
    try {
      const amortization = buildDailyAmortization(loanSetup, loanHistory || []);
      currentLoanOutstanding = amortization.currentOutstanding;
      remainingTenureMonths = amortization.remainingTenureMonths;
      totalInterestSaved = amortization.interestSaved;
      
      const closureDate = amortization.closureDate;
      estimatedClosureDate = closureDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    } catch (err) {
      console.error('Error generating amortization schedule for dashboard:', err);
    }
  }

  // ── Calculate Investments ─────────────────────────────────────────────────
  const mutualFundValue = investmentSetup?.mutualFundValue || 0;
  const epfValue = investmentSetup?.epfValue || 0;
  const npsValue = investmentSetup?.npsValue || 0;
  const otherValue = investmentSetup?.otherInvestments || 0;
  const totalInvestments = mutualFundValue + epfValue + npsValue + otherValue;

  // ── Calculate Emergency Corpus ────────────────────────────────────────────
  const currentEmergency = emergencyFund?.currentCorpus || 0;
  const targetExpenses = emergencyFund?.monthlyExpenses || 50000;
  const targetMonths = emergencyFund?.targetMonths || 9;
  const targetEmergencyCorpus = targetExpenses * targetMonths;
  const emergencyPct = targetEmergencyCorpus > 0 ? Math.min(100, (currentEmergency / targetEmergencyCorpus) * 100) : 0;
  
  let readinessLabel: 'Critical' | 'Low' | 'Good' | 'Excellent' = 'Critical';
  const coverageMonths = targetExpenses > 0 ? currentEmergency / targetExpenses : 0;
  if (coverageMonths >= 9) readinessLabel = 'Excellent';
  else if (coverageMonths >= 6) readinessLabel = 'Good';
  else if (coverageMonths >= 3) readinessLabel = 'Low';

  // ── Net Worth ─────────────────────────────────────────────────────────────
  const netWorth = totalInvestments + currentEmergency - currentLoanOutstanding;

  // ── Smart Financial Health Score ─────────────────────────────────────────
  const savingsRate = netIncome > 0 ? (surplus / netIncome) * 100 : 0;
  const debtRatio = netIncome > 0 ? ((loanSetup?.emi || 0) / netIncome) * 100 : 0;
  const sipRate = netIncome > 0 ? (((investmentSetup?.monthlySIP || 0) + (monthlyRecord?.actualSIP || 0)) / netIncome) * 100 : 0;
  
  const scoreSavings = Math.min(100, savingsRate * 2.5); // 40% savings rate = full score
  const scoreEmergency = Math.min(100, (coverageMonths / 9) * 100); // 9 months coverage = full score
  const scoreDebt = Math.max(0, 100 - debtRatio * 2.5); // 40% debt to income = 0 score
  const scoreSip = Math.min(100, sipRate * 4); // 25% SIP rate = full score

  const healthScore = Math.round(
    scoreSavings * 0.3 + 
    scoreEmergency * 0.3 + 
    scoreDebt * 0.2 + 
    scoreSip * 0.2
  );

  // ── Charts Prep ──────────────────────────────────────────────────────────
  const past6Months: string[] = [];
  const tempDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    past6Months.push(`${yyyy}-${mm}`);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const cashFlowHistory = past6Months.map((m) => {
    const [yr, mo] = m.split('-');
    const monthIndex = Number(mo) - 1;
    const label = `${monthNames[monthIndex]} ${yr?.substring(2)}`;
    
    const rec = monthlyRecords.find((r: any) => r.id === m);
    const monthPrepayments = loanHistory
      .filter((h: any) => h.date.substring(0, 7) === m)
      .reduce((sum: number, h: any) => sum + h.prepaymentAmount, 0);

    if (rec) {
      const inc = (rec.salaryIncome || 0) + (rec.bonusIncome || 0) + (rec.otherIncome || 0) - (rec.sodexoDeduction || 0) - (rec.otherDeductions || 0);
      const exp = (rec.recurringExpensesSnapshot || []).reduce((sum: number, r: any) => sum + r.amount, 0) + 
                  (rec.oneTimeExpenses || []).reduce((sum: number, o: any) => sum + o.amount, 0) +
                  monthPrepayments;
      return { month: label, income: inc, expenses: exp };
    }
    
    if (m === currentMonth) {
      return { month: label, income: netIncome, expenses: totalExpenses + monthPrepayments };
    }
    
    return { month: label, income: 0, expenses: monthPrepayments };
  });

  const categories = ['EMI', 'Food & Dining', 'Bills & Utilities', 'Discretionary', 'SIP', 'Other'];
  const expenseBreakdownData = categories.map((cat, i) => {
    let amt = 0;
    if (cat === 'EMI' && loanSetup) amt = loanSetup.emi;
    else if (cat === 'SIP') amt = investmentSetup?.monthlySIP || 0;
    else {
      const found = recurringExpenses.filter(r => r.category === cat);
      amt = found.reduce((acc, curr) => acc + curr.amount, 0);
    }
    return {
      name: cat,
      value: amt || [8000, 12000, 5000, 15000, 10000, 7000][i] || 0,
      color: ['#f97316', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#94a3b8'][i] || '#cbd5e1'
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-primary tracking-wider uppercase">Overview Dashboard</span>
          <h2 className="text-2xl font-bold mt-1 text-foreground">Welcome back, {profile.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here is your financial status for the month of {currentMonth}.</p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Income"
          value={formatCurrency(netIncome)}
          subtitle="Monthly net salary"
          icon={ArrowUpRight}
          color="income"
        />
        <StatCard
          title="Expenses"
          value={formatCurrency(totalExpenses)}
          subtitle="Fixed + one-time commits"
          icon={ArrowDownRight}
          color="expense"
        />
        <StatCard
          title="Surplus"
          value={formatCurrency(surplus)}
          subtitle="Available for allocation"
          icon={Wallet}
          color="income"
        />
        <StatCard
          title="Emergency Fund"
          value={formatCurrency(currentEmergency)}
          subtitle={`Readiness: ${readinessLabel}`}
          icon={ShieldAlert}
          color="emergency"
        />
        <StatCard
          title="Total Investments"
          value={formatCurrency(totalInvestments)}
          subtitle={`SIP commitment: ${formatCurrency(investmentSetup?.monthlySIP || 0)}`}
          icon={TrendingUp}
          color="invest"
        />
        <StatCard
          title="Home Loan Bal"
          value={loanSetup ? formatCurrency(currentLoanOutstanding) : '₹0'}
          subtitle={loanSetup ? `EMI: ${formatCurrency(loanSetup.emi)}` : 'No active loan'}
          icon={Home}
          color="loan"
        />
      </div>

      {/* Main Analysis and Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cash Flow and Expenses Breakdown */}
        <Card className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-base font-bold">Monthly Cash Flow Trend</CardTitle>
              <CardDescription className="text-xs">Comparison of net income vs total monthly expenses</CardDescription>
            </div>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-6">
            <CashFlowChart data={cashFlowHistory} />
          </CardContent>
        </Card>

        {/* Financial Health Score & Allocation Donut */}
        <Card className="rounded-2xl border border-border bg-card flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base font-bold">Financial Health Score</CardTitle>
            <CardDescription className="text-xs">Based on savings, debt ratio, & emergency coverage</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center gap-6">
            <ProgressRing
              value={healthScore}
              max={100}
              size="lg"
              color={healthScore >= 75 ? '#22c55e' : healthScore >= 50 ? '#3b82f6' : '#ef4444'}
              label="Health Score"
            />
            <div className="grid grid-cols-2 gap-4 w-full text-center text-xs border-t pt-4">
              <div>
                <p className="text-muted-foreground">Savings Rate</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{savingsRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Debt-to-Income</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{debtRatio.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widgets & Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Net Worth Stat Card */}
        <Card className="rounded-2xl border border-border bg-card flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Net Worth Balance</span>
              <TrendingUp className="w-4.5 h-4.5 text-networth-500" />
            </CardTitle>
            <CardDescription className="text-xs">Calculated as (Assets - Liabilities)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Computed Net Worth</span>
              <h3 className="text-3xl font-extrabold text-foreground">{formatCurrency(netWorth)}</h3>
            </div>
            
            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-networth-600 dark:text-networth-400">Total Assets (Investments + Emergency)</span>
                <span className="text-foreground">{formatCurrency(totalInvestments + currentEmergency)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-t pt-2">
                <span className="text-expense-600 dark:text-expense-400">Total Liabilities (Home Loan)</span>
                <span className="text-foreground">{formatCurrency(currentLoanOutstanding)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Fund Completion */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Emergency Corpus Status</span>
              <ShieldAlert className="w-4.5 h-4.5 text-emergency-500" />
            </CardTitle>
            <CardDescription className="text-xs">Savings coverage against monthly expenses target</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs text-muted-foreground">Target coverage ({targetMonths} months)</span>
                <h4 className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(targetEmergencyCorpus)}</h4>
              </div>
              <span className="text-sm font-bold text-emergency-600 dark:text-emergency-400">{emergencyPct.toFixed(1)}%</span>
            </div>

            <Progress value={emergencyPct} className="h-2.5 bg-muted [&>div]:bg-emergency-500 rounded-full" />
            
            <div className="text-xs text-muted-foreground font-medium pt-2 border-t flex justify-between">
              <span>Current Savings: {formatCurrency(currentEmergency)}</span>
              <span>Coverage: {coverageMonths.toFixed(1)} Months</span>
            </div>
          </CardContent>
        </Card>

        {/* Home Loan ClosureCountdown */}
        {loanSetup ? (
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Home Loan Freedom Countdown</span>
                <Home className="w-4.5 h-4.5 text-loan-500" />
              </CardTitle>
              <CardDescription className="text-xs">Closure date projection incorporating prepayment</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <span className="text-xs text-muted-foreground">Estimated Closure Date</span>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{estimatedClosureDate}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-4 border-t">
                <div>
                  <p className="text-muted-foreground">Remaining Months</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{remainingTenureMonths} Mos</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interest Saved</p>
                  <p className="text-sm font-bold text-income-600 dark:text-income-400 mt-0.5">{formatCurrency(totalInterestSaved)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-dashed border-border bg-muted/10 flex items-center justify-center p-6 text-center text-xs text-muted-foreground">
            <div>
              <Home className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No active home loan setup</p>
              <p className="mt-1">Add details in settings to calculate daily reducing balance amortization.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Expenses breakdown category list */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-base font-bold">Category-Wise Expense Allocations</CardTitle>
          <CardDescription className="text-xs">Overview of recurring and commit obligations</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <ExpenseBreakdown data={expenseBreakdownData} />
            <div className="space-y-3">
              {expenseBreakdownData.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-foreground">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default DashboardPage;
