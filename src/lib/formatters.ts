/**
 * FinPilot — Formatting Utilities
 *
 * All formatters follow Indian numbering conventions (lakhs / crores).
 * Currency symbol: ₹ (INR).
 */

// ─── Indian locale formatter ────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrFormatterWithDecimals = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ─── Currency ───────────────────────────────────────────────────────────────

/**
 * Format a number as Indian currency with ₹ symbol.
 * Uses the Indian grouping system (e.g. ₹1,23,456).
 *
 * Amounts >= ₹100 are shown without decimals.
 * Amounts < ₹100 include 2 decimal places.
 */
export function formatCurrency(amount: number): string {
  if (Math.abs(amount) < 100) {
    return inrFormatterWithDecimals.format(amount);
  }
  return inrFormatter.format(amount);
}

/**
 * Compact Indian currency notation:
 * - < 1,000      → ₹750
 * - < 1,00,000   → ₹45,000
 * - < 1,00,00,000 → ₹1.23L  (lakhs)
 * - >= 1,00,00,000 → ₹4.5Cr  (crores)
 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_00_00_000) {
    const crores = abs / 1_00_00_000;
    return `${sign}₹${crores.toFixed(crores >= 10 ? 1 : 2)}Cr`;
  }
  if (abs >= 1_00_000) {
    const lakhs = abs / 1_00_000;
    return `${sign}₹${lakhs.toFixed(lakhs >= 10 ? 1 : 2)}L`;
  }
  return formatCurrency(amount);
}

// ─── Date / Month ───────────────────────────────────────────────────────────

/**
 * Format a date string or Date object to "27 Jun 2026" style.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFormatter.format(d);
}

/**
 * Convert a "YYYY-MM" string to a human-readable month label.
 * e.g. "2026-06" → "June 2026"
 */
export function formatMonth(yyyymm: string): string {
  const [yearStr, monthStr] = yyyymm.split('-');
  const monthIndex = parseInt(monthStr ?? '0', 10) - 1;
  const year = yearStr ?? yyyymm;

  if (monthIndex < 0 || monthIndex > 11) {
    return yyyymm; // fallback: return as-is if parsing fails
  }

  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

// ─── Numbers ────────────────────────────────────────────────────────────────

/**
 * Format a decimal as a percentage string, e.g. 0.183 → "18.3%"
 * If the value is already in percent form (> 1 implies already percent),
 * pass it directly: 8.45 → "8.45%".
 */
export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

// ─── YYYY-MM Utilities ──────────────────────────────────────────────────────

/**
 * Returns the current month as "YYYY-MM".
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Generate an inclusive array of "YYYY-MM" strings between `start` and `end`.
 * Both `start` and `end` must be in "YYYY-MM" format.
 *
 * @example getMonthRange('2025-10', '2026-02')
 * // → ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
 */
export function getMonthRange(start: string, end: string): string[] {
  const result: string[] = [];
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);

  if (
    startYear === undefined || startMonth === undefined ||
    endYear === undefined || endMonth === undefined
  ) {
    return result;
  }

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return result;
}

// ─── Input Parsing ──────────────────────────────────────────────────────────

/**
 * Parse a user-entered currency string back to a number.
 * Strips ₹, commas, spaces, L/Cr suffixes.
 *
 * @example parseCurrencyInput('₹1,23,456')  // → 123456
 * @example parseCurrencyInput('4.5L')        // → 450000
 * @example parseCurrencyInput('1.2Cr')       // → 12000000
 */
export function parseCurrencyInput(value: string): number {
  const trimmed = value.trim();

  // Handle lakh/crore suffixes (case-insensitive)
  const croreMatch = trimmed.match(/^[₹\s]*([\d.]+)\s*[Cc][Rr]?$/);
  if (croreMatch?.[1]) {
    return parseFloat(croreMatch[1]) * 1_00_00_000;
  }

  const lakhMatch = trimmed.match(/^[₹\s]*([\d.]+)\s*[Ll]$/);
  if (lakhMatch?.[1]) {
    return parseFloat(lakhMatch[1]) * 1_00_000;
  }

  // Strip everything except digits, dots, and minus sign
  const cleaned = trimmed.replace(/[₹,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}
