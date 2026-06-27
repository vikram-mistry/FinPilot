import React from 'react';
import { useDocument, useCollection } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { buildDailyAmortization } from '@/lib/loanCalculator';
import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Coins, TrendingUp, Landmark, Shield, AlertTriangle } from 'lucide-react';
import type { Profile, LoanSetup, EmergencyFund, InvestmentSetup, LoanHistoryEntry } from '@/types';

export function NetWorthPage() {
  const user = useAuthStore((s) => s.user);

  // Load Firestore configurations
  const { data: profile } = useDocument<Profile>('profile');
  const { data: loanSetup } = useDocument<LoanSetup>('loanSetup');
  const { data: emergencyFund } = useDocument<EmergencyFund>('emergencyFund');
  const { data: investmentSetup } = useDocument<InvestmentSetup>('investmentSetup');
  const { data: loanHistory = [] } = useCollection<any>('loanHistory');

  // Load current stats
  const mf = investmentSetup?.mutualFundValue || 0;
  const epf = investmentSetup?.epfValue || 0;
  const nps = investmentSetup?.npsValue || 0;
  const other = investmentSetup?.otherInvestments || 0;
  const totalInvestments = mf + epf + nps + other;
  
  const currentEmergency = emergencyFund?.currentCorpus || 0;
  const totalAssets = totalInvestments + currentEmergency;

  let currentLoanOutstanding = 0;
  let schedule: any[] = [];
  if (loanSetup) {
    try {
      const result = buildDailyAmortization(loanSetup, loanHistory);
      currentLoanOutstanding = result.currentOutstanding;
      schedule = result.schedule;
    } catch (err) {
      console.error(err);
    }
  }

  const netWorth = totalAssets - currentLoanOutstanding;

  // Reconstruct past 6 months for Net Worth chart
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const past6Months: string[] = [];
  const tempDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tempDate.getFullYear(), tempDate.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    past6Months.push(`${yyyy}-${mm}`);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = past6Months.map((m) => {
    const [yr, mo] = m.split('-');
    const label = `${monthNames[Number(mo) - 1]} ${yr?.substring(2)}`;
    
    // Find liability closing balance for that month
    let liability = 0;
    if (loanSetup) {
      const row = schedule.find((s) => s.month === m);
      if (row) {
        liability = row.closingBalance;
      } else if (m < loanSetup.disbursementDate.substring(0, 7)) {
        liability = 0;
      } else {
        liability = currentLoanOutstanding;
      }
    }

    // Reconstruct asset growth (subtracting SIP increments backwards)
    const [curYr, curMo] = currentMonth.split('-');
    const diffMonths = (Number(curYr) - Number(yr)) * 12 + (Number(curMo) - Number(mo));
    const sip = investmentSetup?.monthlySIP || 0;
    
    const reconstructedInvestments = Math.max(0, totalInvestments - (sip * diffMonths));
    // Estimate emergency fund back-compounding (assuming 10% monthly savings additions)
    const emergencyMonthlyIncrement = (emergencyFund?.monthlyExpenses || 50000) * 0.1;
    const reconstructedEmergency = Math.max(0, currentEmergency - (emergencyMonthlyIncrement * diffMonths));
    const assets = reconstructedInvestments + reconstructedEmergency;

    return {
      month: label,
      assets,
      liabilities: liability,
      netWorth: assets - liability,
    };
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <span className="text-xs font-bold text-primary tracking-wider uppercase">Balance Sheet</span>
        <h2 className="text-2xl font-bold mt-1 text-foreground">Net Worth Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Aggregated review of total liquid/non-liquid assets minus outstanding liabilities.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Net Worth"
          value={formatCurrency(netWorth)}
          subtitle="Assets minus Liabilities"
          icon={TrendingUp}
          color="networth"
        />
        <StatCard
          title="Total Assets"
          value={formatCurrency(totalAssets)}
          subtitle="Investments + Emergency Corpus"
          icon={Coins}
          color="emergency"
        />
        <StatCard
          title="Total Liabilities"
          value={formatCurrency(currentLoanOutstanding)}
          subtitle="Outstanding Home Loan principal"
          icon={Landmark}
          color="loan"
        />
      </div>

      {/* Chart Panel */}
      <Card className="rounded-2xl border border-border bg-card">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Assets vs. Liabilities Trend</CardTitle>
          <CardDescription className="text-xs">Visual tracking of net worth growth (turquoise line) over past 6 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <NetWorthChart data={chartData} />
        </CardContent>
      </Card>

      {/* Breakdown Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets Breakdown Card */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold text-income-600 dark:text-income-400 flex items-center gap-1.5">
              <Coins className="w-5 h-5" />
              <span>Asset Portfolio Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-xs font-semibold">
            <div className="flex justify-between items-center bg-muted/20 p-4 border rounded-2xl">
              <span>Mutual Funds Portfolio</span>
              <span className="font-bold text-foreground">{formatCurrency(mf)}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/20 p-4 border rounded-2xl">
              <span>EPF Balance</span>
              <span className="font-bold text-foreground">{formatCurrency(epf)}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/20 p-4 border rounded-2xl">
              <span>NPS Corpus</span>
              <span className="font-bold text-foreground">{formatCurrency(nps)}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/20 p-4 border rounded-2xl">
              <span>Other Investments</span>
              <span className="font-bold text-foreground">{formatCurrency(other)}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/20 p-4 border rounded-2xl">
              <span>Emergency Corpus</span>
              <span className="font-bold text-foreground">{formatCurrency(currentEmergency)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities Breakdown Card */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold text-expense-600 dark:text-expense-400 flex items-center gap-1.5">
              <Landmark className="w-5 h-5" />
              <span>Liabilities Portfolio Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-xs font-semibold">
            {loanSetup ? (
              <div className="flex justify-between items-center bg-muted/20 p-4 border rounded-2xl">
                <div>
                  <p className="text-foreground">SBI Home Loan</p>
                  <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Disbursed on {loanSetup.disbursementDate}</p>
                </div>
                <span className="font-bold text-foreground">{formatCurrency(currentLoanOutstanding)}</span>
              </div>
            ) : (
              <div className="text-center py-12">
                <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground mt-3">No active home loans logged.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default NetWorthPage;
