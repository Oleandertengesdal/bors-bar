import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price from øre (integer) to NOK display string.
 * Example: 4500 → "45,00 kr" (Norwegian) or "45.00 kr" (English)
 */
export function formatPrice(priceInOre: number, locale: string = "nb-NO"): string {
  const priceInNOK = priceInOre / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInNOK);
}

/**
 * Calculate percentage price change from base.
 */
export function priceChangePercent(currentPrice: number, basePrice: number): number {
  if (basePrice === 0) return 0;
  return ((currentPrice - basePrice) / basePrice) * 100;
}

/**
 * Generate a random 4-digit PIN, avoiding collisions with existing PINs.
 */
export function generatePin(existingPins: Set<string>): string {
  let pin: string;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existingPins.has(pin));
  return pin;
}

/**
 * Generate a unique QR code token.
 */
export function generateQrToken(): string {
  return crypto.randomUUID();
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
