/**
 * Børsbar — Type Definitions
 */

// ─── API Response Types ────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Drink with computed fields ────────────────────────

export interface DrinkWithChange {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  priceChangePercent: number;
  priceDirection: "up" | "down" | "stable";
  sortOrder: number;
  isActive: boolean;
}

// ─── POS Types ─────────────────────────────────────────

export interface CartItem {
  drinkId: string;
  drinkName: string;
  quantity: number;
  pricePerUnit: number; // price at time of adding to cart
}

export interface Cart {
  guestId: string;
  guestName: string;
  items: CartItem[];
  total: number;
}

// ─── Settlement Types ──────────────────────────────────

export interface GuestSettlement {
  guestId: string;
  guestName: string;
  totalOwed: number; // in øre
  purchases: {
    drinkName: string;
    quantity: number;
    pricePaid: number; // in øre
    timestamp: Date;
  }[];
}

// ─── Pricing Config ────────────────────────────────────

export interface StepBasedPricingConfig {
  stepAmount: number;
  salesPerStepUp: number;
  decayIntervalSec: number;
  decayAmount: number;
}

export interface CurveBasedPricingConfig {
  windowSizeSec: number;
  sensitivity: number;
  smoothing: number;
  volatilityCap: number;
}

// ─── Real-time Events ──────────────────────────────────

export interface PriceUpdateEvent {
  eventId: string;
  drinks: {
    id: string;
    currentPrice: number;
    previousPrice: number;
  }[];
  timestamp: string;
}

export interface MarketEventBroadcast {
  eventId: string;
  type: string;
  name: string;
  modifier: number;
  durationSec: number;
  triggeredAt: string;
  expiresAt: string;
}
