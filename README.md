# 📈 Børsbar — The Stock Market Bar

> A dynamic pricing platform for events where beverage prices fluctuate in real-time based on demand — just like a stock exchange.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Screens & Views](#screens--views)
- [Pricing Algorithm](#pricing-algorithm)
- [Guest Identification Methods](#guest-identification-methods)
- [Roadmap](#roadmap)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## Overview

**Børsbar** is a full-stack web application that turns any bar event into a stock market experience. Drink prices rise and fall based on real-time demand — buy a popular beer and its price goes up; ignore a drink and it drops to bargain levels.

The platform supports multiple organizations and events, handles guest registration via card scanners (NFC/RFID/QR), and provides a beautiful TV display showing live prices with stock-market-style animations.

### Who is this for?

- 🎓 Student organizations (linjeforeninger) hosting "børsbar" events
- 🏠 Pre-party organizers who want a fun twist
- 🎉 Any event where you want gamified dynamic pricing on beverages

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     EVENT FLOW                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. SETUP          Admin creates event, adds drinks,    │
│                    sets base prices & min prices,        │
│                    registers guests (or guests           │
│                    self-register via link)               │
│                                                         │
│  2. LIVE EVENT     Bartender scans guest card →          │
│                    selects drink(s) → checkout.          │
│                    Prices update in real-time on TV.     │
│                                                         │
│  3. SETTLEMENT     Event ends → admin gets a full       │
│                    breakdown of what each guest owes.    │
│                    Export to CSV or send Vipps requests. │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Features

### Core
- **Dynamic Pricing Engine** — Configurable algorithms (step-based or curve-based) that adjust prices based on sales volume and time
- **Minimum Price Floor** — Prices never drop below a configured "buying price" / cost price
- **Maximum Price Ceiling** — Optional cap to prevent extreme spikes
- **Real-time TV Display** — Full-screen stock-ticker view with live prices, sparkline charts, green/red arrows, and animations
- **POS Terminal** — Fast checkout screen with card scanner integration, drink selection, and guest identification
- **Guest Tabs** — Track what each guest has consumed; settle up after the event
- **Multi-tenant** — Multiple organizations can run independent events

### Guest Identification
- **Card Scanner** — NFC/RFID readers (e.g., Samfundet student cards) or USB barcode/QR scanners
- **QR Code** — Generate per-guest QR codes they can show from their phone
- **Name Search** — Autocomplete search by name as a fallback
- **PIN Code** — Optional 4-digit PIN per guest for quick manual entry

### Event Management
- **Drink Management** — Add/edit/remove beverages with categories, images, base price, min price, max price
- **Guest Pre-registration** — Share a link for guests to register before the event (card number + name)
- **Market Events** — Trigger "Happy Hour" (all prices drop), "Market Crash" (reset), "Surge" (random spike), or custom events
- **Live Controls** — Pause/resume the pricing engine, manually adjust prices, trigger market events

### Post-Event
- **Settlement Report** — Per-guest breakdown of all purchases and total owed
- **Export** — CSV/PDF export of all transactions
- **Analytics Dashboard** — Most popular drinks, peak hours, revenue over time, price history charts
- **Vipps Integration** (planned) — Deep-link to request payment per guest

### Technical
- **Hybrid/Offline Support** — PWA with service worker; queue sales locally if internet drops, sync when back online
- **i18n** — Norwegian (Bokmål) and English
- **Responsive** — TV display, tablet POS, and mobile guest view
- **Real-time Updates** — Supabase Realtime (WebSocket) for instant price broadcasts

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Landing │   Admin  │    TV    │   POS    │  Guest Mobile   │
│   Page   │Dashboard │ Display  │ Terminal │    (prices)     │
│  (SSR)   │  (Auth)  │  (Live)  │  (Auth)  │   (Public)     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────────────┘
     │          │          │          │          │
     └──────────┴──────────┴──────────┴──────────┘
                           │
              ┌────────────┴────────────┐
              │   Next.js 15 (Vercel)   │
              │   ┌──────────────────┐  │
              │   │   API Routes     │  │
              │   │  /api/drinks     │  │
              │   │  /api/sales      │  │
              │   │  /api/events     │  │
              │   │  /api/guests     │  │
              │   │  /api/pricing    │  │
              │   │  /api/auth       │  │
              │   └────────┬─────────┘  │
              │            │            │
              │   ┌────────┴─────────┐  │
              │   │  Pricing Engine  │  │
              │   │  (Server-side)   │  │
              │   └────────┬─────────┘  │
              └────────────┼────────────┘
                           │
              ┌────────────┴────────────┐
              │   Supabase (Cloud)      │
              │   ┌──────────────────┐  │
              │   │   PostgreSQL     │  │
              │   │   + Real-time    │  │
              │   │   subscriptions  │  │
              │   └──────────────────┘  │
              └─────────────────────────┘
```

### Data Flow for a Sale

```
Guest scans card → POS identifies guest → Bartender selects drink(s)
  → POST /api/sales → Pricing Engine recalculates all prices
  → Database updated → Supabase Realtime broadcasts new prices
  → TV Display + Guest Mobile view update instantly
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Full-stack React framework with SSR, API routes |
| **Language** | TypeScript 5 | Type safety across the entire codebase |
| **UI Library** | shadcn/ui + Radix UI | Accessible, customizable component library |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Database** | PostgreSQL (Supabase) | Relational database with real-time subscriptions |
| **ORM** | Prisma | Type-safe database access and migrations |
| **Auth** | NextAuth.js v5 (Auth.js) | Admin authentication (credentials + OAuth) |
| **Real-time** | Supabase Realtime | WebSocket-based live updates for price changes |
| **i18n** | next-intl | Internationalization for NO/EN |
| **Charts** | Recharts or Lightweight Charts | Price history sparklines and analytics |
| **PWA** | next-pwa / Serwist | Offline support and installability |
| **Validation** | Zod | Runtime type validation for API inputs |
| **State** | Zustand | Lightweight client-side state management |
| **Deployment** | Vercel + Supabase | Zero-config deployment with free tiers |
| **Testing** | Vitest + Playwright | Unit tests + E2E tests |

---

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Organization   │     │      User       │     │      Event      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id         UUID │◄────│ org_id      FK  │     │ id         UUID │
│ name       TEXT │     │ id         UUID │     │ org_id      FK  │──►
│ slug       TEXT │     │ email      TEXT │     │ name       TEXT │
│ created_at  TS  │     │ password   HASH │     │ status     ENUM │
│ settings  JSON  │     │ name       TEXT │     │   (draft/active/│
└─────────────────┘     │ role       ENUM │     │    paused/done) │
                        │   (admin/staff) │     │ pricing_mode    │
                        └─────────────────┘     │ pricing_config  │
                                                │ starts_at    TS │
                                                │ ends_at      TS │
                                                └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼──────────────────────┐
                        │                                │                      │
               ┌────────┴────────┐              ┌───────┴────────┐    ┌────────┴────────┐
               │     Drink       │              │     Guest      │    │  MarketEvent    │
               ├─────────────────┤              ├────────────────┤    ├─────────────────┤
               │ id         UUID │              │ id        UUID │    │ id         UUID │
               │ event_id    FK  │              │ event_id   FK  │    │ event_id    FK  │
               │ name       TEXT │              │ name      TEXT │    │ type       ENUM │
               │ category   TEXT │              │ card_id   TEXT │    │ modifier  FLOAT │
               │ image_url  TEXT │              │ pin       TEXT │    │ duration   INT  │
               │ base_price  INT │              │ email     TEXT │    │ triggered_at TS │
               │ min_price   INT │              │ qr_code   TEXT │    └─────────────────┘
               │ max_price   INT │              └───────┬────────┘
               │ current_price   │                      │
               │ sort_order  INT │                      │
               │ is_active  BOOL │                      │
               └────────┬────────┘                      │
                        │                               │
                        │         ┌─────────────────┐   │
                        └────────►│      Sale       │◄──┘
                                  ├─────────────────┤
                                  │ id         UUID │
                                  │ event_id    FK  │
                                  │ drink_id    FK  │
                                  │ guest_id    FK  │
                                  │ price_paid  INT │
                                  │ quantity    INT │
                                  │ created_at   TS │
                                  │ synced      BOOL│  ← for offline support
                                  └─────────────────┘

               ┌─────────────────┐
               │  PriceHistory   │
               ├─────────────────┤
               │ id         UUID │
               │ drink_id    FK  │
               │ price       INT │
               │ recorded_at  TS │
               └─────────────────┘
```

> **Note**: All prices are stored as integers in **øre** (1/100 of NOK) to avoid floating-point issues. Display as `price / 100` in the UI.

---

## Screens & Views

### 1. 🏠 Landing Page (`/`)
Public marketing page. Explains the concept, shows a live demo with simulated price movements, login button for admins.

### 2. 🔐 Admin Dashboard (`/dashboard`)
After login. Shows organization's events, create new event, manage settings.

### 3. ⚙️ Event Setup (`/dashboard/events/[id]/setup`)
Configure drinks, pricing algorithm, register guests, generate QR codes, set event times.

### 4. 📺 TV Display (`/event/[id]/display`)
**Full-screen, no interaction needed.** Shows:
- All drinks with current prices
- Price change indicators (▲ green / ▼ red)
- Sparkline mini-charts showing recent price history
- Scrolling ticker at the bottom
- Market events banners ("🔥 HAPPY HOUR — All prices -30%!")
- Optional: sound effects (NYSE bell on big changes)

### 5. 🛒 POS Terminal (`/event/[id]/pos`)
**Bartender-facing checkout screen.** Flow:
1. Scan guest card (or search by name / enter PIN)
2. Guest name appears on screen
3. Select drink(s) from grid with current prices
4. Review order → Confirm sale
5. Prices update, next guest

### 6. 📱 Guest Mobile View (`/event/[id]/prices`)
**Public, no login.** QR code posted at the venue. Guests see live prices on their phone. Optional: see their own tab.

### 7. 📊 Settlement & Analytics (`/dashboard/events/[id]/report`)
After event ends:
- Per-guest breakdown (name, items, total owed)
- Export CSV/PDF
- Analytics: popular drinks, peak times, revenue charts, price history

---

## Pricing Algorithm

The pricing engine supports two configurable modes:

### Mode 1: Step-Based (Simple)

```
Config: {
  step_amount: 5,       // Price changes by 5 NOK per step
  sales_per_step_up: 3, // Every 3 sales → price goes up
  decay_interval: 60,   // Every 60 seconds without a sale → price goes down
  decay_amount: 2,      // Goes down by 2 NOK per decay tick
}

Rules:
  - After N sales of drink X → price_X += step_amount
  - After M seconds with no sale of drink X → price_X -= decay_amount
  - price_X is clamped to [min_price, max_price]
```

### Mode 2: Curve-Based (Advanced)

```
Config: {
  window_size: 300,      // 5-minute rolling window
  sensitivity: 1.5,      // How reactive prices are to demand
  smoothing: 0.3,        // Exponential smoothing factor
  volatility_cap: 0.25,  // Max price change per tick (25%)
}

Formula:
  demand_ratio = sales_in_window / average_sales_in_window
  target_price = base_price * (demand_ratio ^ sensitivity)
  new_price = current_price * (1 - smoothing) + target_price * smoothing
  new_price = clamp(new_price, min_price, max_price)
```

### Market Events

Admins can trigger special events that modify all prices temporarily:

| Event | Effect | Duration |
|-------|--------|----------|
| 🎉 Happy Hour | All prices -30% | 5 min (configurable) |
| 💥 Market Crash | All prices reset to base | Instant |
| 📈 Bull Run | All prices +20% | 3 min |
| 🎯 Spotlight | One random drink at min price | 2 min |
| 🎲 Chaos | All prices randomized within range | 1 min |

---

## Guest Identification Methods

The system supports multiple identification methods. Configure per event:

| Method | How it works | Speed | Setup effort |
|--------|-------------|-------|-------------|
| **NFC/RFID Card** | Tap student card on reader | ⚡ Fastest | Medium (need reader + pre-register cards) |
| **QR Scanner** | Guest shows QR on phone, scan with USB scanner | ⚡ Fast | Low (guests self-register, get QR) |
| **Name Search** | Type first few letters, autocomplete | 🔄 Medium | Low (just need name list) |
| **PIN Code** | Guest says their 4-digit PIN | 🔄 Medium | Low (auto-generated at registration) |
| **Manual Select** | Bartender picks from list | 🐌 Slow | None |

**Recommendation for different settings:**
- **Samfundet / large events**: NFC card scanner (fastest throughput)
- **Pre-parties / house parties**: QR code or name search (no hardware needed)
- **Pop-up events**: PIN code system (simple, no tech needed)

---

## Roadmap

### Phase 1 — Foundation (Weeks 1-2)
- [x] Project setup (Next.js, TypeScript, Tailwind, Prisma, Supabase)
- [ ] Database schema & Prisma models
- [ ] Authentication (NextAuth.js — admin login)
- [ ] Organization & Event CRUD
- [ ] Basic drink management (add/edit/remove drinks)
- [ ] Guest registration (manual entry)

### Phase 2 — Core Engine (Weeks 3-4)
- [ ] Pricing engine (step-based algorithm)
- [ ] Sale registration API
- [ ] POS terminal screen (basic version)
- [ ] Guest lookup (name search)
- [ ] Price history tracking
- [ ] Basic TV display (list of drinks + prices)

### Phase 3 — Real-time & Display (Weeks 5-6)
- [ ] Supabase Realtime integration (live price updates)
- [ ] TV display with animations (green/red arrows, transitions)
- [ ] Sparkline charts on TV display
- [ ] Market events system (Happy Hour, Crash, etc.)
- [ ] Sound effects for price changes (optional)

### Phase 4 — Guest Experience (Weeks 7-8)
- [ ] Card scanner integration (NFC/RFID via Web Serial/HID API)
- [ ] QR code generation for guests
- [ ] Guest self-registration page (shareable link)
- [ ] Guest mobile price view
- [ ] PIN code identification system

### Phase 5 — Settlement & Analytics (Weeks 9-10)
- [ ] Post-event settlement report
- [ ] Per-guest tab breakdown
- [ ] CSV/PDF export
- [ ] Analytics dashboard (charts, popular drinks, peak times)
- [ ] Price history timeline visualization

### Phase 6 — Polish & Production (Weeks 11-12)
- [ ] i18n (Norwegian + English)
- [ ] PWA / offline support with sync queue
- [ ] Landing page with demo mode
- [ ] Curve-based pricing algorithm
- [ ] Responsive design pass (mobile, tablet, TV)
- [ ] Error handling & edge cases
- [ ] Performance optimization

### Phase 7 — Future / Nice-to-have
- [ ] Vipps payment integration
- [ ] Stripe integration for real-time payment
- [ ] Guest leaderboard ("Top spenders")
- [ ] Custom themes per organization
- [ ] Event templates (save drink list + config as template)
- [ ] Multi-POS support (multiple bartenders, same event)
- [ ] Inventory tracking (stock levels)
- [ ] Webhook notifications
- [ ] Mobile app (React Native / Expo)

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS)
- **pnpm** 9+ (recommended) or npm
- **PostgreSQL** (or a free [Supabase](https://supabase.com) account)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/bors-bar.git
cd bors-bar

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase/database credentials

# Run database migrations
pnpm prisma migrate dev

# Seed the database (optional — adds demo data)
pnpm prisma db seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase (for real-time)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Auth
AUTH_SECRET="your-secret-here"
AUTH_URL="http://localhost:3000"

# Optional
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Project Structure

```
bors-bar/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Demo data seeder
├── public/
│   ├── sounds/                # NYSE bell, price change sounds
│   └── images/                # Drink images, logos
├── src/
│   ├── app/
│   │   ├── (marketing)/       # Landing page, about
│   │   │   └── page.tsx
│   │   ├── (auth)/            # Login, register
│   │   │   └── login/
│   │   ├── dashboard/         # Admin area
│   │   │   ├── page.tsx       # Dashboard home
│   │   │   ├── events/
│   │   │   │   ├── page.tsx           # Event list
│   │   │   │   ├── new/page.tsx       # Create event
│   │   │   │   └── [id]/
│   │   │   │       ├── setup/page.tsx    # Event config
│   │   │   │       ├── pos/page.tsx      # POS terminal
│   │   │   │       ├── display/page.tsx  # TV display
│   │   │   │       └── report/page.tsx   # Settlement
│   │   │   └── settings/
│   │   ├── event/
│   │   │   └── [id]/
│   │   │       └── prices/page.tsx     # Public guest price view
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth.js routes
│   │   │   ├── events/        # Event CRUD
│   │   │   ├── drinks/        # Drink CRUD
│   │   │   ├── guests/        # Guest management
│   │   │   ├── sales/         # Sale registration
│   │   │   └── pricing/       # Price engine triggers
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── pos/               # POS terminal components
│   │   ├── display/           # TV display components
│   │   ├── dashboard/         # Dashboard components
│   │   └── shared/            # Shared/common components
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── supabase.ts        # Supabase client
│   │   ├── pricing/
│   │   │   ├── engine.ts      # Pricing engine core
│   │   │   ├── step-based.ts  # Step-based algorithm
│   │   │   └── curve-based.ts # Curve-based algorithm
│   │   ├── auth.ts            # Auth configuration
│   │   ├── utils.ts           # Utility functions
│   │   └── validators.ts     # Zod schemas
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-realtime-prices.ts
│   │   ├── use-card-scanner.ts
│   │   └── use-guest-search.ts
│   ├── stores/                # Zustand stores
│   │   ├── pos-store.ts
│   │   └── offline-queue.ts
│   ├── i18n/
│   │   ├── no.json            # Norwegian translations
│   │   └── en.json            # English translations
│   └── types/                 # TypeScript type definitions
│       └── index.ts
├── tests/
│   ├── unit/                  # Vitest unit tests
│   └── e2e/                   # Playwright E2E tests
├── .env.example
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Contributing

This project is currently in early development. Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for the Norwegian student community
</p>
