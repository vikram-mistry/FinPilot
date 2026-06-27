import React, { useState } from 'react';
import { useDocument, useCollection } from '@/hooks/useFirestore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildDailyAmortization } from '@/lib/loanCalculator';
import { StatCard } from '@/components/ui/stat-card';
import { Scale, Sparkles, TrendingUp, Landmark, Shield, AlertTriangle, ArrowRight } from 'lucide-react';
import type { LoanSetup, EmergencyFund, InvestmentSetup, LoanHistoryEntry } from '@/types';

export function ScenarioSimulator() {
  const user = useAuthStore((s) => s.user);

  // Load Firestore Details
  const { data: loanSetup } = useDocument<LoanSetup>('loanSetup');
  const { data: emergencyFund } = useDocument<EmergencyFund>('emergencyFund');
  const { data: investmentSetup } = useDocument<InvestmentSetup & { cagrRate?: number }>('investmentSetup');
  const { data: loanHistory = [] } = useCollection<any>('loanHistory');
  const { data: monthlyRecords = [] } = useCollection<any>('monthlyRecords');

  // Find latest record for realistic net income and base expenses
  const latestRecord = monthlyRecords.length > 0 
    ? [...monthlyRecords].sort((a, b) => b.id.localeCompare(a.id))[0]
    : null;

  const netIncome = latestRecord 
    ? (latestRecord.salaryIncome || 0) + (latestRecord.bonusIncome || 0) + (latestRecord.otherIncome || 0) - (latestRecord.sodexoDeduction || 0) - (latestRecord.otherDeductions || 0)
    : 182242; // Fallback to user's June salary

  const baseExpenses = latestRecord
    ? (latestRecord.fixedExpenses || 50000) + (latestRecord.variableExpenses || 20000)
    : 70000;

  // Baseline variables
  const baseSip = investmentSetup?.monthlySIP || 25000;
  const basePrepay = 0;
  const baseBonus = 0;
  const baseExpenseChange = 0;
  const cagr = investmentSetup?.cagrRate || 12;
  const totalPortfolio = (investmentSetup?.mutualFundValue || 0) + 
                         (investmentSetup?.epfValue || 0) + 
                         (investmentSetup?.npsValue || 0) + 
                         (investmentSetup?.otherInvestments || 0);
  const currentEmergency = emergencyFund?.currentCorpus || 0;

  // Scenario A States
  const [sipA, setSipA] = useState(baseSip);
  const [prepayA, setPrepayA] = useState(basePrepay);
  const [bonusA, setBonusA] = useState(baseBonus);
  const [expenseA, setExpenseA] = useState(baseExpenseChange);

  // Scenario B States
  const [sipB, setSipB] = useState(baseSip + 10000);
  const [prepayB, setPrepayB] = useState(basePrepay + 5000);
  const [bonusB, setBonusB] = useState(baseBonus + 50000);
  const [expenseB, setExpenseB] = useState(baseExpenseChange);

  // Run Simulation for a Scenario
  const runSimulation = (sipVal: number, prepayVal: number, bonusVal: number, expChange: number) => {
    // 1. Home Loan Simulation
    let loanClosure = 'N/A';
    let totalInterest = 0;
    let interestSaved = 0;

    if (loanSetup) {
      const simulatedHistory = [...loanHistory];

      // Add simulated future bonus prepayment (assumed month 3)
      if (bonusVal > 0) {
        const bonusDate = new Date();
        bonusDate.setMonth(bonusDate.getMonth() + 3);
        simulatedHistory.push({
          date: bonusDate.toISOString().substring(0, 10),
          prepaymentAmount: bonusVal,
        });
      }

      // Add simulated future monthly prepayments (next 240 months)
      if (prepayVal > 0) {
        const startDate = new Date();
        for (let i = 1; i <= 240; i++) {
          const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 20);
          simulatedHistory.push({
            date: d.toISOString().substring(0, 10),
            prepaymentAmount: prepayVal,
          });
        }
      }

      try {
        const result = buildDailyAmortization(loanSetup, simulatedHistory);
        loanClosure = result.schedule[result.schedule.length - 1]?.month || 'N/A';
        totalInterest = result.totalInterestPaid;
        interestSaved = result.interestSaved;
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Portfolio value at 10 years (120 months) compounding
    const cagrMonthly = cagr / 12 / 100;
    const baseGrowth = totalPortfolio * Math.pow(1 + cagrMonthly, 120);
    let sipGrowth = 0;
    if (cagrMonthly > 0) {
      sipGrowth = sipVal * ((Math.pow(1 + cagrMonthly, 120) - 1) / cagrMonthly) * (1 + cagrMonthly);
    }
    const portfolio10Yr = Math.round(baseGrowth + sipGrowth);

    // 3. Emergency Fund Completion Date
    const monthlyExpenses = Math.max(1000, (emergencyFund?.monthlyExpenses || 50000) + expChange);
    const targetEmergency = monthlyExpenses * (emergencyFund?.targetMonths || 6);
    
    // Monthly savings allocated is what's left of Net Income after expenses, SIP, and debt prepayments
    const leftoverSurplus = netIncome - (baseExpenses + expChange) - sipVal - prepayVal;
    let emergencyCompletionLabel = '';
    
    if (currentEmergency >= targetEmergency) {
      emergencyCompletionLabel = 'Fully Funded';
    } else if (leftoverSurplus <= 0) {
      emergencyCompletionLabel = 'Never (No Surplus)';
    } else {
      const months = Math.ceil((targetEmergency - currentEmergency) / leftoverSurplus);
      emergencyCompletionLabel = months > 240 ? '20+ Years' : `${months} mos`;
    }

    return {
      loanClosure,
      totalInterest,
      interestSaved,
      portfolio10Yr,
      emergencyCompletionLabel,
    };
  };

  const resultsA = runSimulation(sipA, prepayA, bonusA, expenseA);
  const resultsB = runSimulation(sipB, prepayB, bonusB, expenseB);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <span className="text-xs font-bold text-primary tracking-wider uppercase">Strategic Calculator</span>
        <h2 className="text-2xl font-bold mt-1 text-foreground flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary animate-pulse" />
          <span>Scenario Simulator</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Model two hypothetical portfolios side-by-side to understand the trade-offs of investing vs. debt prepayments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario A Inputs Card */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-sm font-extrabold text-foreground uppercase tracking-wider">Scenario A</CardTitle>
            <CardDescription className="text-xs">Configure parameters for baseline Scenario A</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* SIP */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>Monthly SIP Amount</Label>
                <span className="text-primary font-bold">{formatCurrency(sipA)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={String(baseSip * 3)}
                step="2500"
                value={sipA}
                onChange={(e) => setSipA(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* Prepayments */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>Monthly Home Loan Prepay</Label>
                <span className="text-primary font-bold">{formatCurrency(prepayA)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={prepayA}
                onChange={(e) => setPrepayA(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* One-time Bonus Injection */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>One-Time Bonus Injection</Label>
                <span className="text-primary font-bold">{formatCurrency(bonusA)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="10000"
                value={bonusA}
                onChange={(e) => setBonusA(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* Expense Changes */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>Expense Budget Adjustment</Label>
                <span className="text-primary font-bold">{expenseA >= 0 ? '+' : ''}{formatCurrency(expenseA)}</span>
              </div>
              <input
                type="range"
                min="-20000"
                max="50000"
                step="1000"
                value={expenseA}
                onChange={(e) => setExpenseA(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Scenario B Inputs Card */}
        <Card className="rounded-2xl border border-border bg-card">
          <CardHeader className="pb-3 border-b bg-primary/5">
            <CardTitle className="text-sm font-extrabold text-primary uppercase tracking-wider">Scenario B</CardTitle>
            <CardDescription className="text-xs">Configure parameters for comparison Scenario B</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* SIP */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>Monthly SIP Amount</Label>
                <span className="text-primary font-bold">{formatCurrency(sipB)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={String(baseSip * 3)}
                step="2500"
                value={sipB}
                onChange={(e) => setSipB(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* Prepayments */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>Monthly Home Loan Prepay</Label>
                <span className="text-primary font-bold">{formatCurrency(prepayB)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={prepayB}
                onChange={(e) => setPrepayB(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* One-time Bonus Injection */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>One-Time Bonus Injection</Label>
                <span className="text-primary font-bold">{formatCurrency(bonusB)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="10000"
                value={bonusB}
                onChange={(e) => setBonusB(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* Expense Changes */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <Label>Expense Budget Adjustment</Label>
                <span className="text-primary font-bold">{expenseB >= 0 ? '+' : ''}{formatCurrency(expenseB)}</span>
              </div>
              <input
                type="range"
                min="-20000"
                max="50000"
                step="1000"
                value={expenseB}
                onChange={(e) => setExpenseB(Number(e.target.value))}
                className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Output Comparison Table Card */}
        <Card className="rounded-2xl border border-border bg-card flex flex-col justify-between">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Strategic Outcomes</CardTitle>
            <CardDescription className="text-xs">Comparative metrics calculated instantly side-by-side</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 flex-1 space-y-4">
            
            {/* Loan Closure Date */}
            <div className="bg-muted/20 border p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Landmark className="w-4 h-4 text-orange-500" />
                <span>Estimated Loan Closure</span>
              </div>
              <div className="flex justify-between items-center text-sm font-extrabold">
                <span className="text-foreground">{resultsA.loanClosure}</span>
                <ArrowRight className="w-4.5 h-4.5 text-muted-foreground" />
                <span className="text-primary">{resultsB.loanClosure}</span>
              </div>
            </div>

            {/* Total Interest Paid */}
            <div className="bg-muted/20 border p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <AlertTriangle className="w-4 h-4 text-expense-500" />
                <span>Total Interest Paid</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-foreground">{formatCurrency(resultsA.totalInterest)}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-primary">{formatCurrency(resultsB.totalInterest)}</span>
              </div>
              {resultsB.totalInterest < resultsA.totalInterest && (
                <p className="text-[10px] font-bold text-income-600 dark:text-income-400">
                  Scenario B saves {formatCurrency(resultsA.totalInterest - resultsB.totalInterest)} in interest!
                </p>
              )}
            </div>

            {/* 10-Year Portfolio Value */}
            <div className="bg-muted/20 border p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <span>10-Yr Portfolio Value</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-foreground">{formatCurrency(resultsA.portfolio10Yr)}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-primary">{formatCurrency(resultsB.portfolio10Yr)}</span>
              </div>
              {resultsB.portfolio10Yr > resultsA.portfolio10Yr && (
                <p className="text-[10px] font-bold text-income-600 dark:text-income-400">
                  Scenario B yields {formatCurrency(resultsB.portfolio10Yr - resultsA.portfolio10Yr)} more wealth!
                </p>
              )}
            </div>

            {/* Emergency Completion */}
            <div className="bg-muted/20 border p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Shield className="w-4 h-4 text-primary" />
                <span>Safety Fund Completion</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-foreground">
                  {resultsA.emergencyCompletionLabel}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-primary">
                  {resultsB.emergencyCompletionLabel}
                </span>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-muted/10 border-t p-4 text-[10px] text-muted-foreground text-center font-medium leading-relaxed rounded-b-2xl">
            This projection uses monthly compounding at {cagr}% CAGR. Loan closure dates follow SBI reducing balance schedules with float revisions logged.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
export default ScenarioSimulator;
