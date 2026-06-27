/**
 * FinPilot — Rule-Based Financial Advisor Engine ("Smart Planner")
 *
 * This is NOT an AI/LLM system. It applies deterministic, priority-ordered
 * allocation rules to the user's monthly surplus and generates plain-English
 * recommendations.
 *
 * Priority order:
 * 1. Essential Expenses — already deducted (not part of surplus)
 * 2. Emergency Fund — if corpus < target, allocate towards shortfall
 * 3. Investments (SIP) — % of net income based on risk profile
 * 4. Home Loan Prepayment — allocate remaining surplus
 * 5. Buffer — retain a safety margin
 */

import type { AdvisorInput, AdvisorAllocation } from '@/types';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum buffer to retain (₹) */
const MIN_BUFFER_AMOUNT = 5_000;

/** Buffer as a percentage of net income (whichever is higher) */
const BUFFER_INCOME_PERCENT = 0.03;

/** Maximum portion of surplus that can go to emergency fund in one month */
const EMERGENCY_SURPLUS_CAP = 0.30;

/** SIP allocation ranges by risk profile (as % of net income) */
const SIP_RANGES: Record<AdvisorInput['riskProfile'], { min: number; max: number }> = {
  conservative: { min: 0.10, max: 0.15 },
  balanced:     { min: 0.15, max: 0.25 },
  aggressive:   { min: 0.25, max: 0.35 },
};

/**
 * When investmentPreference is set, shift SIP allocation within the range.
 * sip-first → use max of range
 * prepayment-first → use min of range
 * balanced → use midpoint
 */
function getSIPPercent(input: AdvisorInput): number {
  const range = SIP_RANGES[input.riskProfile];

  switch (input.investmentPreference) {
    case 'sip-first':
      return range.max;
    case 'prepayment-first':
      return range.min;
    case 'balanced':
    default:
      return (range.min + range.max) / 2;
  }
}

// ─── Main Engine ────────────────────────────────────────────────────────────

/**
 * Generate a rule-based allocation recommendation for the user's
 * monthly surplus.
 *
 * The function processes allocations in strict priority order,
 * never exceeding the available surplus.
 */
export function generateAllocation(input: AdvisorInput): AdvisorAllocation {
  const recommendations: string[] = [];
  let remainingSurplus = Math.max(0, input.monthlySurplus);
  const totalSurplus = remainingSurplus;

  // ── 1. Buffer (reserved first, applied last in the output) ──────────

  const bufferAmount = Math.max(MIN_BUFFER_AMOUNT, input.netIncome * BUFFER_INCOME_PERCENT);
  const allocatedBuffer = Math.min(bufferAmount, remainingSurplus);
  remainingSurplus -= allocatedBuffer;

  // ── 2. Emergency Fund ───────────────────────────────────────────────

  let emergencyContribution = 0;
  const emergencyShortfall = input.emergencyTarget - input.currentEmergencyCorpus;

  if (emergencyShortfall > 0) {
    const maxEmergencyAlloc = Math.min(
      remainingSurplus * EMERGENCY_SURPLUS_CAP,
      emergencyShortfall,
      remainingSurplus,
    );
    emergencyContribution = Math.max(0, Math.round(maxEmergencyAlloc));
    remainingSurplus -= emergencyContribution;

    const currentMonths = input.currentEmergencyCorpus > 0
      ? Math.floor(input.currentEmergencyCorpus / (input.totalExpenses || 1))
      : 0;
    const targetMonths = input.emergencyTarget > 0 && input.totalExpenses > 0
      ? Math.round(input.emergencyTarget / input.totalExpenses)
      : 0;

    recommendations.push(
      `Your emergency fund covers only ${currentMonths} month${currentMonths !== 1 ? 's' : ''}. ` +
      `Target is ${targetMonths} months. Contributing ${formatCurrency(emergencyContribution)} this month.`,
    );
  } else {
    recommendations.push(
      '✅ Emergency fund is fully funded. Great job!',
    );
  }

  // ── 3. Investments (SIP) ────────────────────────────────────────────

  const sipPercent = getSIPPercent(input);
  const idealSIP = Math.round(input.netIncome * sipPercent);
  let sipAmount = Math.min(idealSIP, remainingSurplus);

  // If preference is sip-first, try to allocate more
  if (input.investmentPreference === 'sip-first') {
    sipAmount = Math.min(idealSIP, remainingSurplus);
  }

  sipAmount = Math.max(0, sipAmount);
  remainingSurplus -= sipAmount;

  const sipPercentActual = input.netIncome > 0
    ? ((sipAmount / input.netIncome) * 100).toFixed(1)
    : '0';

  recommendations.push(
    `Investing ${formatCurrency(sipAmount)} in SIPs (${sipPercentActual}% of net income). ` +
    `Recommended range for ${input.riskProfile} profile: ` +
    `${(SIP_RANGES[input.riskProfile].min * 100).toFixed(0)}–` +
    `${(SIP_RANGES[input.riskProfile].max * 100).toFixed(0)}%.`,
  );

  // ── 4. Home Loan Prepayment ─────────────────────────────────────────

  let prepaymentAmount = 0;

  if (input.loanOutstanding > 0 && remainingSurplus > 0) {
    // For prepayment-first preference, allocate all remaining surplus
    // For balanced, split remaining surplus roughly 50/50 with additional SIP
    if (input.investmentPreference === 'prepayment-first') {
      prepaymentAmount = Math.round(remainingSurplus);
    } else if (input.investmentPreference === 'balanced') {
      const half = Math.round(remainingSurplus / 2);
      prepaymentAmount = half;
      // Give the other half as additional SIP
      sipAmount += (remainingSurplus - half);
    } else {
      // sip-first: smaller prepayment
      prepaymentAmount = Math.round(remainingSurplus * 0.3);
    }

    prepaymentAmount = Math.min(prepaymentAmount, remainingSurplus);
    remainingSurplus -= prepaymentAmount;

    if (prepaymentAmount > 0) {
      // Rough estimate of months saved
      const monthlyInterest = input.loanOutstanding > 0
        ? (input.loanOutstanding * input.loanRate) / (12 * 100)
        : 0;
      const estimatedMonthsSaved = monthlyInterest > 0
        ? Math.round(prepaymentAmount / monthlyInterest)
        : 0;

      // Rough estimate of interest saved
      const estimatedInterestSaved = prepaymentAmount * input.loanRate * input.loanTenureMonths / (12 * 100 * 2);

      if (estimatedInterestSaved > 0) {
        recommendations.push(
          `Prepaying ${formatCurrency(prepaymentAmount)} towards your home loan. ` +
          `This could save approximately ${formatCurrencyCompact(estimatedInterestSaved)} in interest.`,
        );
      } else {
        recommendations.push(
          `Prepaying ${formatCurrency(prepaymentAmount)} towards your home loan.`,
        );
      }
    }
  } else if (input.loanOutstanding <= 0) {
    // No loan — redirect surplus to investments
    sipAmount += remainingSurplus;
    remainingSurplus = 0;
    recommendations.push(
      '🎉 No outstanding loans! All surplus is directed to investments.',
    );
  }

  // ── 5. Remaining surplus goes to buffer ─────────────────────────────

  const finalBuffer = allocatedBuffer + remainingSurplus;

  if (finalBuffer > MIN_BUFFER_AMOUNT * 2) {
    recommendations.push(
      `Retaining ${formatCurrency(finalBuffer)} as buffer for unexpected expenses.`,
    );
  }

  // ── Summary recommendation ──────────────────────────────────────────

  if (totalSurplus <= 0) {
    recommendations.unshift(
      '⚠️ No surplus this month. Review your expenses to find savings opportunities.',
    );
  }

  return {
    emergencyContribution,
    sipAmount,
    prepaymentAmount,
    bufferAmount: finalBuffer,
    totalSurplus,
    recommendations,
  };
}
