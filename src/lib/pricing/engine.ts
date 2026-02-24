/**
 * Børsbar — Pricing Engine
 *
 * Core pricing engine that coordinates price recalculation
 * after sales, time-based decay, and market events.
 */

import { clamp } from "@/lib/utils";
import type { StepBasedConfig, CurveBasedConfig } from "@/lib/validators";

// ─── Types ─────────────────────────────────────────────

export interface DrinkPriceState {
  id: string;
  basePrice: number; // øre
  minPrice: number; // øre
  maxPrice: number; // øre
  currentPrice: number; // øre
  recentSalesCount: number; // sales in current window
  lastSaleAt: Date | null;
}

export interface PriceUpdate {
  drinkId: string;
  oldPrice: number;
  newPrice: number;
}

// ─── Step-Based Pricing ────────────────────────────────

/**
 * Step-based pricing algorithm.
 *
 * - Every N sales of a drink → price goes up by stepAmount
 * - Every M seconds without a sale → price goes down by decayAmount
 * - Price is always clamped to [minPrice, maxPrice]
 */
export function calculateStepBasedPrice(
  drink: DrinkPriceState,
  config: StepBasedConfig,
  action: "sale" | "decay"
): number {
  let newPrice = drink.currentPrice;

  if (action === "sale") {
    // Check if this sale triggers a step up
    if (drink.recentSalesCount > 0 && drink.recentSalesCount % config.salesPerStepUp === 0) {
      newPrice += config.stepAmount;
    }
  } else if (action === "decay") {
    // Check if enough time has passed since last sale
    if (drink.lastSaleAt) {
      const secondsSinceLastSale = (Date.now() - drink.lastSaleAt.getTime()) / 1000;
      if (secondsSinceLastSale >= config.decayIntervalSec) {
        newPrice -= config.decayAmount;
      }
    }
  }

  return clamp(newPrice, drink.minPrice, drink.maxPrice);
}

// ─── Curve-Based Pricing ───────────────────────────────

/**
 * Curve-based pricing algorithm.
 *
 * Uses a demand ratio based on recent sales vs average, with
 * exponential smoothing and volatility caps.
 */
export function calculateCurveBasedPrice(
  drink: DrinkPriceState,
  config: CurveBasedConfig,
  averageSalesInWindow: number
): number {
  // Calculate demand ratio
  const demandRatio =
    averageSalesInWindow > 0
      ? drink.recentSalesCount / averageSalesInWindow
      : 1;

  // Calculate target price based on demand
  const targetPrice = drink.basePrice * Math.pow(demandRatio, config.sensitivity);

  // Apply exponential smoothing
  let newPrice =
    drink.currentPrice * (1 - config.smoothing) + targetPrice * config.smoothing;

  // Apply volatility cap (max % change per tick)
  const maxChange = drink.currentPrice * config.volatilityCap;
  const priceDelta = newPrice - drink.currentPrice;
  if (Math.abs(priceDelta) > maxChange) {
    newPrice = drink.currentPrice + Math.sign(priceDelta) * maxChange;
  }

  // Round to nearest 100 øre (1 NOK)
  newPrice = Math.round(newPrice / 100) * 100;

  return clamp(newPrice, drink.minPrice, drink.maxPrice);
}

// ─── Market Events ─────────────────────────────────────

export interface MarketEventConfig {
  type: string;
  modifier: number; // e.g., 0.7 for -30%
}

/**
 * Apply a market event modifier to a drink's current price.
 */
export function applyMarketEvent(
  currentPrice: number,
  basePrice: number,
  minPrice: number,
  maxPrice: number,
  event: MarketEventConfig
): number {
  let newPrice: number;

  switch (event.type) {
    case "HAPPY_HOUR":
    case "BULL_RUN":
      // Apply percentage modifier
      newPrice = Math.round(currentPrice * event.modifier);
      break;
    case "MARKET_CRASH":
      // Reset to base price
      newPrice = basePrice;
      break;
    case "SPOTLIGHT":
      // Set to minimum price
      newPrice = minPrice;
      break;
    case "CHAOS":
      // Randomize within range
      newPrice = Math.round(
        minPrice + Math.random() * (maxPrice - minPrice)
      );
      break;
    default:
      newPrice = Math.round(currentPrice * event.modifier);
  }

  // Round to nearest 100 øre
  newPrice = Math.round(newPrice / 100) * 100;

  return clamp(newPrice, minPrice, maxPrice);
}
