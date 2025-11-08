import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert chips to money using multiplier
 */
export function chipsToMoney(chips: number, multiplier: number): number {
  return chips / multiplier
}

/**
 * Convert money to chips using multiplier
 */
export function moneyToChips(money: number, multiplier: number): number {
  return money * multiplier
}

/**
 * Format money as currency
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format chips
 */
export function formatChips(chips: number): string {
  return new Intl.NumberFormat('en-US').format(chips)
}

