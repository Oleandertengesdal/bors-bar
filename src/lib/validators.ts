import { z } from "zod/v4";

// ─── Drink Schemas ─────────────────────────────────────

export const createDrinkSchema = z.object({
  name: z.string().min(1, "Drink name is required").max(100),
  category: z.string().default("other"),
  imageUrl: z.url().optional(),
  basePrice: z.int().min(100, "Price must be at least 1 NOK (100 øre)"),
  minPrice: z.int().min(100, "Min price must be at least 1 NOK"),
  maxPrice: z.int().min(100, "Max price must be at least 1 NOK"),
  sortOrder: z.int().default(0),
});

export const updateDrinkSchema = createDrinkSchema.partial();

// ─── Guest Schemas ─────────────────────────────────────

export const createGuestSchema = z.object({
  name: z.string().min(1, "Guest name is required").max(200),
  cardId: z.string().optional(),
  email: z.email().optional(),
});

export const guestSelfRegisterSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  cardId: z.string().optional(),
  email: z.email().optional(),
});

// ─── Sale Schemas ──────────────────────────────────────

export const createSaleSchema = z.object({
  guestId: z.string().min(1),
  items: z
    .array(
      z.object({
        drinkId: z.string().min(1),
        quantity: z.int().min(1).default(1),
      })
    )
    .min(1, "At least one item is required"),
});

// ─── Event Schemas ─────────────────────────────────────

export const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(200),
  description: z.string().max(1000).optional(),
  pricingMode: z.enum(["STEP_BASED", "CURVE_BASED"]).default("STEP_BASED"),
  pricingConfig: z.record(z.string(), z.unknown()).default({}),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),
});

export const updateEventSchema = createEventSchema.partial();

// ─── Market Event Schemas ──────────────────────────────

export const triggerMarketEventSchema = z.object({
  type: z.enum([
    "HAPPY_HOUR",
    "MARKET_CRASH",
    "BULL_RUN",
    "SPOTLIGHT",
    "CHAOS",
    "CUSTOM",
  ]),
  name: z.string().optional(),
  modifier: z.number().min(0.1).max(5.0).default(1.0),
  durationSec: z.int().min(10).max(3600).default(300),
});

// ─── Pricing Config Schemas ────────────────────────────

export const stepBasedConfigSchema = z.object({
  stepAmount: z.int().min(1).default(500), // 5 NOK default
  salesPerStepUp: z.int().min(1).default(3),
  decayIntervalSec: z.int().min(10).default(60),
  decayAmount: z.int().min(1).default(200), // 2 NOK default
});

export const curveBasedConfigSchema = z.object({
  windowSizeSec: z.int().min(60).default(300),
  sensitivity: z.number().min(0.1).max(5.0).default(1.5),
  smoothing: z.number().min(0.01).max(1.0).default(0.3),
  volatilityCap: z.number().min(0.01).max(1.0).default(0.25),
});

// ─── Type Exports ──────────────────────────────────────

export type CreateDrinkInput = z.infer<typeof createDrinkSchema>;
export type UpdateDrinkInput = z.infer<typeof updateDrinkSchema>;
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type GuestSelfRegisterInput = z.infer<typeof guestSelfRegisterSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TriggerMarketEventInput = z.infer<typeof triggerMarketEventSchema>;
export type StepBasedConfig = z.infer<typeof stepBasedConfigSchema>;
export type CurveBasedConfig = z.infer<typeof curveBasedConfigSchema>;
