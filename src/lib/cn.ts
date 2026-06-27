import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 * Combines `clsx` (conditional class joining) with `twMerge`
 * (Tailwind-specific deduplication) so that later utilities
 * correctly override earlier ones, e.g. `cn('px-4', 'px-6')` → `'px-6'`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
