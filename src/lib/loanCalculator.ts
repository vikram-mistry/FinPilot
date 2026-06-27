/**
 * FinPilot — SBI Daily Reducing Balance Amortization Engine
 *
 * This is the most critical calculation module in the app.
 *
 * Interest formula (SBI daily reducing balance):
 *   Interest = Outstanding × Rate × Days / (365 × 100)
 *   Use 366 instead of 365 if the period spans Feb 29 of a leap year.
 *
 * The engine builds a month-by-month amortization schedule from the
 * disbursement date, applying rate changes and prepayments at the
 * correct points. A parallel "no-prepayment" schedule is also computed
 * so the UI can show interest saved and tenure reduction.
 */

import type {
  LoanSetup,
  LoanHistoryEntry,
  RateHistoryEntry,
  AmortizationRow,
  AmortizationResult,
} from '@/types';

// ─── Date Helpers ───────────────────────────────────────────────────────────

/** True if the given year is a Gregorian leap year. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Count the exact number of calendar days between two dates.
 * The result is always >= 0 (absolute difference).
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 86_400_000;
  // Use UTC to avoid DST shifts
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.abs(Math.round((utcEnd - utcStart) / msPerDay));
}

/**
 * Check if the period [start, end) spans Feb 29 of any leap year.
 * Used to decide the denominator (365 vs 366).
 */
export function spansLeapDay(start: Date, end: Date): boolean {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    if (!isLeapYear(year)) continue;

    const leapDay = new Date(year, 1, 29); // Feb 29
    if (leapDay >= start && leapDay < end) {
      return true;
    }
  }
  return false;
}

/**
 * Get the interest-day denominator for a period.
 * SBI uses 365 normally, 366 if the period contains a leap day.
 */
function getDayDenominator(start: Date, end: Date): number {
  return spansLeapDay(start, end) ? 366 : 365;
}

// ─── Rate Lookup ────────────────────────────────────────────────────────────

/**
 * Find the applicable annual interest rate for a given date.
 * Returns the rate from the most recent `rateHistory` entry where
 * `effectiveDate <= date`. Entries must be sorted chronologically.
 */
export function getRateForDate(rateHistory: RateHistoryEntry[], date: Date): number {
  if (rateHistory.length === 0) {
    throw new Error('Rate history is empty — at least one entry is required');
  }

  // Sort defensively (the data *should* already be sorted)
  const sorted = [...rateHistory].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
  );

  let applicableRate = sorted[0]!.rate; // fallback: earliest rate

  for (const entry of sorted) {
    if (new Date(entry.effectiveDate) <= date) {
      applicableRate = entry.rate;
    } else {
      break;
    }
  }

  return applicableRate;
}

// ─── Prepayment Lookup ──────────────────────────────────────────────────────

/**
 * Sum all prepayments that fall within the given month.
 * A prepayment matches if its date's YYYY-MM equals `formatYYYYMM(date)`.
 */
export function getPrepaymentForMonth(
  prepayments: LoanHistoryEntry[],
  date: Date,
): number {
  const monthKey = formatYYYYMM(date);
  return prepayments
    .filter((p) => p.date.substring(0, 7) === monthKey)
    .reduce((sum, p) => sum + p.prepaymentAmount, 0);
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** Format a Date as "YYYY-MM". */
export function formatYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ─── Core Engine ────────────────────────────────────────────────────────────

interface BuildOptions {
  loan: LoanSetup;
  prepayments: LoanHistoryEntry[];
  /** If true, ignore all prepayments (for comparison schedule) */
  skipPrepayments?: boolean;
}

/**
 * Build a month-by-month amortization schedule using the SBI
 * daily reducing balance method.
 */
function buildSchedule(options: BuildOptions): {
  schedule: AmortizationRow[];
  totalInterest: number;
  totalPrepayments: number;
  closureDate: Date;
} {
  const { loan, prepayments, skipPrepayments = false } = options;

  const schedule: AmortizationRow[] = [];
  let outstanding = loan.originalAmount;
  let totalInterest = 0;
  let totalPrepaymentSum = 0;

  // Start from the first EMI date (one month after disbursement)
  const disbursement = new Date(loan.disbursementDate);
  let periodStart = new Date(disbursement);
  let closureDate = new Date(disbursement);

  // Safety: cap at 600 months (50 years) to prevent infinite loops
  const maxMonths = 600;
  let monthCount = 0;

  while (outstanding > 0.5 && monthCount < maxMonths) {
    monthCount++;

    // Period end = same day next month
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const days = daysBetween(periodStart, periodEnd);
    const denominator = getDayDenominator(periodStart, periodEnd);
    const rate = getRateForDate(loan.rateHistory, periodStart);

    // Interest = Outstanding × Rate × Days / (denominator × 100)
    const interest = (outstanding * rate * days) / (denominator * 100);

    // EMI cannot exceed remaining balance + interest
    const effectiveEmi = Math.min(loan.emi, outstanding + interest);

    const principal = effectiveEmi - interest;

    // Check for negative amortization
    if (principal < 0) {
      console.warn(
        `[LoanCalc] Negative amortization in ${formatYYYYMM(periodEnd)}: ` +
        `EMI (${loan.emi.toFixed(2)}) < Interest (${interest.toFixed(2)}). ` +
        `Outstanding will increase.`,
      );
    }

    // Apply prepayment (if any) after EMI
    const prepayment = skipPrepayments
      ? 0
      : getPrepaymentForMonth(prepayments, periodEnd);

    const closingBeforePrepay = Math.max(0, outstanding - principal);
    const closing = Math.max(0, closingBeforePrepay - prepayment);

    totalInterest += interest;
    totalPrepaymentSum += prepayment;

    schedule.push({
      month: formatYYYYMM(periodEnd),
      openingBalance: outstanding,
      emi: effectiveEmi,
      interestComponent: interest,
      principalComponent: principal,
      prepayment,
      closingBalance: closing,
      rate,
      daysInPeriod: days,
    });

    outstanding = closing;
    closureDate = periodEnd;
    periodStart = periodEnd;
  }

  return { schedule, totalInterest, totalPrepayments: totalPrepaymentSum, closureDate };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build the full amortization result for a loan, including both the
 * schedule with prepayments and the comparison schedule without.
 */
export function buildDailyAmortization(
  loan: LoanSetup,
  prepayments: LoanHistoryEntry[],
): AmortizationResult {
  // Schedule WITH prepayments
  const withPrepay = buildSchedule({ loan, prepayments });

  // Schedule WITHOUT prepayments (for comparison)
  const withoutPrepay = buildSchedule({ loan, prepayments, skipPrepayments: true });

  const interestSaved = withoutPrepay.totalInterest - withPrepay.totalInterest;

  // Determine current outstanding by looking up today in the schedule
  const currentOutstanding = getCurrentOutstandingFromSchedule(withPrepay.schedule);

  // Remaining tenure from today to closure
  const remainingTenure = getRemainingTenureFromSchedule(
    withPrepay.schedule,
    withPrepay.closureDate,
  );

  return {
    schedule: withPrepay.schedule,
    totalInterestPaid: withPrepay.totalInterest,
    totalInterestWithoutPrepayments: withoutPrepay.totalInterest,
    closureDate: withPrepay.closureDate,
    closureDateWithoutPrepayments: withoutPrepay.closureDate,
    totalPrepayments: withPrepay.totalPrepayments,
    interestSaved,
    remainingTenureMonths: remainingTenure,
    currentOutstanding,
  };
}

/**
 * Calculate the interest saved by comparing two amortization results
 * (one with prepayments, one without).
 */
export function calculateInterestSaved(
  withPrepayments: AmortizationResult,
  withoutPrepayments: AmortizationResult,
): number {
  return withoutPrepayments.totalInterestPaid - withPrepayments.totalInterestPaid;
}

/**
 * Look up the current outstanding principal by finding today's position
 * in the amortization schedule.
 */
export function getCurrentOutstanding(result: AmortizationResult): number {
  return getCurrentOutstandingFromSchedule(result.schedule);
}

/**
 * Calculate the number of months remaining from today until loan closure.
 */
export function getRemainingTenure(result: AmortizationResult): number {
  return getRemainingTenureFromSchedule(result.schedule, result.closureDate);
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function getCurrentOutstandingFromSchedule(schedule: AmortizationRow[]): number {
  if (schedule.length === 0) return 0;

  const todayKey = formatYYYYMM(new Date());

  // Find the row for the current month
  const currentRow = schedule.find((row) => row.month === todayKey);
  if (currentRow) {
    return currentRow.closingBalance;
  }

  // If today is before the first row, the loan hasn't started
  if (todayKey < schedule[0]!.month) {
    return schedule[0]!.openingBalance;
  }

  // If today is after the last row, the loan is fully paid
  const lastRow = schedule[schedule.length - 1]!;
  if (todayKey > lastRow.month) {
    return lastRow.closingBalance;
  }

  // Find the most recent row before today
  let closest = schedule[0]!;
  for (const row of schedule) {
    if (row.month <= todayKey) {
      closest = row;
    }
  }
  return closest.closingBalance;
}

function getRemainingTenureFromSchedule(
  schedule: AmortizationRow[],
  closureDate: Date,
): number {
  const now = new Date();
  if (now >= closureDate) return 0;

  const todayKey = formatYYYYMM(now);
  const closureKey = formatYYYYMM(closureDate);

  // Count remaining months
  let remaining = 0;
  let counting = false;
  for (const row of schedule) {
    if (row.month >= todayKey) {
      counting = true;
    }
    if (counting) {
      remaining++;
    }
    if (row.month >= closureKey) {
      break;
    }
  }

  return remaining;
}
