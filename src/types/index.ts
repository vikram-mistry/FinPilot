// ── FinPilot Type Definitions ──

import { Timestamp } from 'firebase/firestore';

// ── Auth ──
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ── Profile ──
export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type Currency = 'INR' | 'USD' | 'EUR' | string;

export interface Profile {
  name: string;
  currency: Currency;
  salaryDate: number;
  riskProfile: RiskProfile;
  onboardingComplete: boolean;
}

// ── Home Loan ──
export interface RateChange {
  effectiveDate: string; // YYYY-MM-DD
  rate: number;          // annual %
}
export type RateHistoryEntry = RateChange;

export interface LoanSetup {
  loanName: string;
  bankName: string;
  originalAmount: number;
  disbursementDate: string; // YYYY-MM-DD
  emi: number;
  rateType: 'fixed' | 'floating';
  rateHistory: RateChange[];
  currentRate: number;
  originalTenureMonths: number;
}

export interface LoanHistory {
  id?: string;
  date: string;           // YYYY-MM-DD
  prepaymentAmount: number;
  outstandingBefore?: number;
  outstandingAfter?: number;
  tenureReducedByMonths?: number;
  cumulativeInterestSaved?: number;
}
export type LoanHistoryEntry = LoanHistory;

export interface AmortizationRow {
  month: string;          // YYYY-MM
  openingBalance: number;
  emi: number;
  interestComponent: number;
  principalComponent: number;
  prepayment: number;
  closingBalance: number;
  rate: number;
  daysInPeriod?: number;  // added for reducing calculation
}

export interface AmortizationResult {
  schedule: AmortizationRow[];
  totalInterestPaid: number;
  totalInterestWithoutPrepayments: number;
  closureDate: Date;
  closureDateWithoutPrepayments: Date;
  totalPrepayments: number;
  interestSaved: number;
  remainingTenureMonths: number;
  currentOutstanding: number;
}

// ── Emergency Fund ──
export interface EmergencyFund {
  currentCorpus: number;
  targetMonths: number;
  monthlyExpenses: number;
}

export interface EmergencyHistoryEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  type: 'contribution' | 'withdrawal';
  amount: number;
  description: string;
}

// ── Investment Setup ──
export interface InvestmentSetup {
  mutualFundValue: number;
  monthlySIP: number;
  epfValue: number;
  npsValue: number;
  otherInvestments: number;
}

export interface InvestmentGoal {
  id?: string;
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM
  allocatedAmount: number;
  notes?: string;
}

// ── Recurring Expenses ──
export type ExpenseCategory = string;

export interface RecurringExpense {
  id?: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  active: boolean;
  pausedUntil: Timestamp | null;
  startMonth: string;    // YYYY-MM
  stopMonth: string | null;
}

// ── One-Time Expenses ──
export type OneTimeCategory =
  | 'medical'
  | 'electronics'
  | 'travel'
  | 'festival'
  | 'repairs'
  | 'custom';

export interface OneTimeExpense {
  category: OneTimeCategory;
  description: string;
  amount: number;
}

// ── Monthly Records ──
export interface RecurringExpenseSnapshot {
  name: string;
  amount: number;
  category: ExpenseCategory;
  originalAmount?: number;
  overrideAmount?: number;
}

export interface MonthlyRecord {
  salaryIncome: number;
  bonusIncome: number;
  otherIncome: number;
  sodexoDeduction: number;
  otherDeductions: number;
  oneTimeExpenses: OneTimeExpense[];
  recurringExpensesSnapshot: RecurringExpenseSnapshot[];
  plannedSIP: number;
  actualSIP: number;
  plannedPrepayment: number;
  actualPrepayment: number;
  plannedEmergencyContribution: number;
  actualEmergencyContribution: number;
  finalized: boolean;
  createdAt: any | null; // Allow general Dates/Timestamps
  updatedAt: any | null;
}

// ── Advisor ──
export type InvestmentPreference = 'sip-first' | 'prepayment-first' | 'balanced';

export interface AdvisorInput {
  netIncome: number;
  totalExpenses: number;
  currentEmergencyCorpus: number;
  emergencyTarget: number;
  currentInvestments: number;
  monthlySIP?: number;
  loanOutstanding: number;
  loanRate: number;
  loanTenureMonths: number;
  monthlySurplus: number;
  riskProfile: RiskProfile;
  investmentPreference: InvestmentPreference;
  priorityOrder?: string[];
}

export interface AdvisorAllocation {
  emergencyContribution: number;
  sipAmount: number;
  prepaymentAmount: number;
  bufferAmount: number;
  totalSurplus: number;
  recommendations: string[];
}
export type AllocationResult = AdvisorAllocation;

// ── Settings ──
export interface AppSettings {
  emergencyTargetMonths: number;
  riskProfile: RiskProfile;
  investmentPreference: InvestmentPreference;
  advisorPriorities: string[];
  theme: 'light' | 'dark' | 'system';
  salaryDate: number;
  currency: string;
}
export type Settings = AppSettings;

// ── Net Worth ──
export interface NetWorthSnapshot {
  mutualFunds: number;
  epf: number;
  nps: number;
  savings: number;
  fixedDeposits: number;
  otherAssets: number;
  homeLoan: number;
  personalLoan: number;
  creditCard: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  month: string;
}

// ── Goals ──
export interface Goal {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
}
