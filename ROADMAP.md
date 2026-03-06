# Børsbar — Development Roadmap

> Last updated: February 2026

This document outlines the complete development plan for Børsbar, broken into phases with detailed tasks, acceptance criteria, and estimated effort.

---

## Timeline Overview

```
Phase 1 ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Weeks 1-2   Foundation
Phase 2 ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░  Weeks 3-4   Core Engine
Phase 3 ░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░  Weeks 5-6   Real-time & Display
Phase 4 ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░  Weeks 7-8   Guest Experience
Phase 5 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░  Weeks 9-10  Settlement & Analytics
Phase 6 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  Weeks 11-12 Polish & Production
Phase 7 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Ongoing     Future Features
```

---

## Phase 1 — Foundation (Weeks 1-2)

**Goal**: Project scaffolding, database, auth, and basic CRUD operations.

### Tasks

#### 1.1 Project Setup
- [x] Initialize Next.js 15 project with App Router and TypeScript
- [x] Configure Tailwind CSS 4
- [x] Install and configure shadcn/ui
- [ ] Set up ESLint + Prettier
- [x] Set up Prisma with PostgreSQL (Supabase)
- [x] Create `.env.example` with all required variables
- [x] Set up Git repository, `.gitignore`, commit conventions

**Acceptance**: `pnpm dev` starts without errors, Tailwind works, Prisma connects to DB.

#### 1.2 Database Schema
- [x] Design and implement Prisma schema for all models:
  - Organization, User, Event, Drink, Guest, Sale, PriceHistory, MarketEvent
- [x] Run initial migration
- [x] Create seed script with demo data (sample org, event, drinks, guests)

**Acceptance**: `pnpm prisma migrate dev` runs cleanly, seed populates demo data.

#### 1.3 Authentication
- [x] Install and configure NextAuth.js v5 (Auth.js)
- [x] Implement credentials provider (email + password)
- [x] Create login page (`/login`)
- [x] Implement middleware for protected routes (`/dashboard/*`)
- [x] Admin-only account creation API (no public registration)
- [x] Role-based access: `admin` (full access) and `staff` (POS only)

**Acceptance**: Admin can log in, protected routes redirect to login, roles enforced.

#### 1.4 Organization & Event CRUD
- [x] API routes: `GET/POST /api/events`, `GET/PUT/DELETE /api/events/[id]`
- [x] Dashboard page listing events with status badges
- [x] Create event form (name, date, pricing mode, config)
- [x] Event detail page with tabs (Setup, Drinks, Guests, etc.)
- [x] Event status management (draft → active → paused → completed)

**Acceptance**: Admin can create, view, edit, and change status of events.

#### 1.5 Drink Management
- [x] API routes: `GET/POST /api/events/[id]/drinks`, `PUT/DELETE /api/drinks/[id]`
- [x] Drink form (name, category, base price, min price, max price, image)
- [x] Drink list with inline editing
- [x] Category management (Beer, Wine, Spirits, Non-alcoholic, etc.)
- [ ] Drag-and-drop reordering (sort_order)

**Acceptance**: Admin can add drinks with prices, set min/max, organize by category.

#### 1.6 Guest Registration
- [x] API routes: `GET/POST /api/events/[id]/guests`, `PUT/DELETE /api/guests/[id]`
- [x] Manual guest entry form (name, card ID, email)
- [x] Bulk import from CSV
- [x] Guest list with search and filter

**Acceptance**: Admin can register guests manually or via CSV import.

---

## Phase 2 — Core Engine (Weeks 3-4)

**Goal**: The pricing engine, sale registration, and basic POS + TV screens.

### Tasks

#### 2.1 Pricing Engine — Step-Based
- [x] Implement `StepBasedPricingEngine` class/module
- [x] Config: `step_amount`, `sales_per_step_up`, `decay_interval`, `decay_amount`
- [x] Price recalculation on each sale
- [x] Time-based price decay (prices drop when no sales occur)
- [x] Min/max price clamping
- [ ] Unit tests for all pricing scenarios

**Acceptance**: Given a sequence of sales, prices change correctly. Never below min_price.

#### 2.2 Sale Registration API
- [x] `POST /api/events/[id]/sales` — register a sale
- [x] Request body: `{ guest_id, items: [{ drink_id, quantity }] }`
- [x] Validates: event is active, guest exists, drinks exist and are active
- [x] Records sale at current price, then triggers price recalculation
- [x] Records new prices in PriceHistory
- [x] Returns updated prices for all drinks

**Acceptance**: Sale is recorded, price changes, history tracked, response includes new prices.

#### 2.3 POS Terminal (Basic)
- [x] Route: `/dashboard/events/[id]/pos`
- [x] Guest identification panel (name search with autocomplete)
- [x] Drink grid showing current prices
- [x] Cart/order builder (add/remove items)
- [x] Order summary with total
- [x] Checkout button → calls sale API
- [x] Success feedback + auto-clear for next guest
- [x] Keyboard shortcuts for power users

**Acceptance**: Bartender can search guest, select drinks, checkout. Flow < 10 seconds.

#### 2.4 TV Display (Basic)
- [x] Route: `/event/[id]/display`
- [x] Full-screen responsive layout (optimized for 1080p/4K TVs)
- [x] Grid/list of all drinks with current prices
- [x] Price change indicators (▲/▼ with color)
- [x] Auto-refresh prices every few seconds (polling initially)
- [x] Event name and branding in header
- [x] Hide browser UI instructions

**Acceptance**: Prices visible on a TV, colors indicate changes, auto-updates.

#### 2.5 Price History Tracking
- [x] Record price snapshots at configurable intervals (e.g., every 30s)
- [x] API: `GET /api/events/[id]/drinks/[id]/history`
- [ ] Basic price history display on admin event page

**Acceptance**: Price history stored and retrievable via API.

---

## Phase 3 — Real-time & Display (Weeks 5-6)

**Goal**: Live WebSocket updates, polished TV display, and market events.

### Tasks

#### 3.1 Supabase Realtime Integration
- [x] Set up Supabase Realtime client
- [x] Subscribe to `drinks` table changes (price updates)
- [x] Subscribe to `market_events` table (new events triggered)
- [x] Create `useRealtimePrices()` custom hook
- [x] Replace polling with real-time subscriptions in TV display
- [x] Handle reconnection and error states (fallback to polling)

**Acceptance**: Price changes appear on TV display within < 1 second of a sale.

#### 3.2 TV Display — Enhanced
- [x] Stock-ticker-style design (dark theme, glowing green/red)
- [x] Animated price transitions (number counting up/down)
- [x] Sparkline mini-charts for each drink (last 30 min of price history)
- [x] Scrolling news ticker at bottom ("Ringnes just hit an all-time high!")
- [x] Percentage change from base price displayed
- [x] Drink images/icons (category emoji)
- [x] Responsive layout: auto-adjust grid for number of drinks
- [x] Full-screen mode toggle (F11 or button)

**Acceptance**: Display looks professional, animations smooth at 60fps, real-time updates.

#### 3.3 Market Events System
- [x] Database model for market events (type, modifier, duration, triggered_at)
- [x] API: `POST /api/events/[id]/market-events` — trigger an event
- [x] Implement event types:
  - Happy Hour: all prices × 0.7 for N minutes
  - Market Crash: all prices reset to base_price
  - Bull Run: all prices × 1.2 for N minutes
  - Spotlight: one random drink to min_price for N minutes
  - Chaos: randomize all prices within [min, max]
- [x] Admin trigger panel (big buttons on POS/dashboard)
- [x] TV display: animated banner when market event active
- [x] Auto-expire events after duration

**Acceptance**: Admin triggers event → prices change → TV shows banner → auto-reverts.

#### 3.4 Sound Effects (Optional)
- [x] NYSE opening/closing bell sound
- [x] Cha-ching on sale
- [x] Alert sound on market events
- [x] Volume control / mute toggle
- [x] Audio context management (browser autoplay policies)

**Acceptance**: Sounds play at appropriate moments, can be muted.

---

## Phase 4 — Guest Experience (Weeks 7-8)

**Goal**: Multiple identification methods and guest-facing features.

### Tasks

#### 4.1 Card Scanner Integration
- [x] Research Web HID API (for NFC/RFID readers)
- [x] Research Web Serial API (for serial-connected readers)
- [x] Implement USB keyboard-emulation scanner support (most common)
  - Listen for rapid keystrokes → detect scan → extract card ID
- [x] `useCardScanner()` custom hook
- [x] Map scanned card ID to guest in database
- [x] Visual/audio feedback on successful scan
- [x] Error handling: unknown card, inactive guest

**Acceptance**: Scan a card → guest identified in < 0.5s → name shown on POS.

#### 4.2 QR Code System
- [x] Generate unique QR codes per guest (contains guest UUID or token)
- [x] QR code display on guest self-registration confirmation page
- [x] QR code printable (for wristbands or name tags)
- [x] Scanner reads QR → maps to guest

**Acceptance**: Guest shows QR on phone → scanned → identified correctly.

#### 4.3 Guest Self-Registration
- [x] Public page: `/event/[id]/register`
- [x] Form: name, card ID (optional), email (optional)
- [x] Auto-generate PIN code on registration
- [x] Show QR code after registration (save to phone)
- [x] Admin gets shareable link to send to all expected guests
- [ ] Optional: limit registration (require invite code or max guests)

**Acceptance**: Guest opens link → fills form → gets QR + PIN → appears in admin guest list.

#### 4.4 Guest Mobile Price View
- [x] Public page: `/event/[id]/prices`
- [x] Real-time price display (mobile-optimized)
- [x] Sort by price, name, or category
- [ ] Optional: show your own tab (requires guest identification)
- [x] QR code at venue links to this page
- [ ] PWA-installable for easy access

**Acceptance**: Guest scans QR at venue → sees live prices on phone, updates in real-time.

#### 4.5 PIN Code System
- [x] Auto-generate 4-digit PIN per guest at registration
- [x] PIN input on POS terminal (number pad UI)
- [x] Handle collisions (ensure unique PINs within an event)
- [x] Show PIN on guest's registration confirmation page

**Acceptance**: Guest gives PIN → bartender enters on POS → guest identified.

---

## Phase 5 — Settlement & Analytics (Weeks 9-10)

**Goal**: Post-event reports, exports, and data visualization.

### Tasks

#### 5.1 Settlement Report
- [x] API: `GET /api/events/[id]/settlement`
- [x] Per-guest breakdown: list of purchases with price, timestamp
- [x] Total per guest
- [x] Grand total for event
- [x] Sort by name, total owed, number of drinks
- [x] Settlement page: `/dashboard/events/[id]/report`

**Acceptance**: After event, admin sees clear breakdown of what each guest owes.

#### 5.2 Export
- [x] CSV export of settlement (Name, Total Owed, Drink Breakdown)
- [x] CSV export of all transactions (raw data)
- [ ] PDF report generation (formatted summary)
- [ ] Optional: per-guest Vipps request deep-link generation

**Acceptance**: Admin clicks export → downloads CSV/PDF with all data.

#### 5.3 Analytics Dashboard
- [x] Revenue over time chart (line chart)
- [x] Sales by drink (bar chart)
- [x] Peak hours heatmap
- [x] Price history chart (all drinks over time)
- [x] Top spenders ranking
- [x] Average drink price over time
- [x] Total revenue, total sales, unique guests served

**Acceptance**: Admin sees insightful charts and KPIs after the event.

#### 5.4 Price History Visualization
- [x] Full price history timeline (recharts line chart)
- [x] Candlestick or line chart per drink
- [x] Overlay market events on chart
- [ ] Zoom, pan, time range selection

**Acceptance**: Beautiful stock-chart-like visualization of price movements.

---

## Phase 6 — Polish & Production (Weeks 11-12)

**Goal**: i18n, offline support, landing page, and production readiness.

### Tasks

#### 6.1 Internationalization (i18n)
- [ ] Install and configure next-intl
- [ ] Extract all user-facing strings
- [ ] Norwegian (Bokmål) translation file
- [ ] English translation file
- [ ] Language switcher component
- [ ] Date/number formatting per locale (NOK currency)

**Acceptance**: App usable in both Norwegian and English, locale-aware formatting.

#### 6.2 PWA / Offline Support
- [ ] Configure service worker (Serwist / next-pwa)
- [ ] Cache critical assets for offline use
- [ ] Offline sale queue (Zustand + IndexedDB)
  - POS registers sale locally when offline
  - Auto-sync when connection restored
  - Visual indicator: online/offline status
- [ ] Background sync support
- [ ] App manifest for installability

**Acceptance**: POS terminal works offline, sales synced automatically when back online.

#### 6.3 Landing Page
- [x] Hero section explaining the concept
- [ ] Live demo mode (simulated prices changing in real-time)
- [ ] Screenshots / feature showcase
- [x] "Get Started" CTA → login / contact
- [x] Mobile-responsive design
- [x] SEO meta tags

**Acceptance**: Visitor understands the product, can see a demo, and can log in.

#### 6.4 Curve-Based Pricing Algorithm
- [ ] Implement `CurveBasedPricingEngine`
- [ ] Rolling window demand calculation
- [ ] Exponential smoothing
- [ ] Volatility cap
- [ ] Config UI for event setup
- [ ] Unit tests for edge cases

**Acceptance**: Prices change smoothly based on demand curves, configurable per event.

#### 6.5 Production Readiness
- [x] Error boundaries and fallback UIs
- [x] Loading states and skeleton screens
- [ ] Rate limiting on API routes
- [x] Input sanitization and validation (Zod everywhere)
- [ ] Security audit (CSRF, XSS, SQL injection via Prisma)
- [ ] Performance: lazy loading, image optimization, bundle analysis
- [ ] Monitoring: error tracking (Sentry), analytics (Vercel Analytics)
- [ ] Documentation: API docs, deployment guide

**Acceptance**: App handles errors gracefully, performs well, is secure and monitored.

---

## Phase 7 — Future / Nice-to-have

These can be picked up after the initial release based on user feedback:

| Feature | Priority | Effort |
|---------|----------|--------|
| Vipps payment integration | High | Large |
| Stripe for real-time payment | Medium | Large |
| Guest leaderboard | Medium | Small |
| Custom organization themes | Low | Medium |
| Event templates | Medium | Small |
| Multi-POS (multiple bartenders) | High | Medium |
| Inventory tracking | Medium | Medium |
| Webhook notifications | Low | Small |
| Mobile app (React Native) | Low | Very Large |
| Social login (Feide for students) | Medium | Medium |
| Event invitations via email | Medium | Medium |
| Drink recommendations (AI) | Low | Large |
| Historical analytics (cross-event) | Medium | Medium |

---

## Technical Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monolith vs microservices | Monolith (Next.js) | Simpler for solo/small team, can extract later |
| SQL vs NoSQL | PostgreSQL | Relational data (sales, guests, events), ACID transactions |
| ORM | Prisma | Type-safe, great migrations, works with Supabase |
| Real-time tech | Supabase Realtime | Built into our DB layer, no separate WebSocket server |
| Auth | NextAuth.js v5 | Mature, Next.js-native, flexible providers |
| Styling | Tailwind + shadcn/ui | Fast development, consistent design system |
| State management | Zustand | Lightweight, simple API, good for offline queue |
| Price storage | Integers (øre) | Avoid floating-point precision issues |
| Deployment | Vercel + Supabase | Free tiers, zero DevOps, global CDN |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Slow card scanning | Medium | High | Support multiple ID methods as fallback |
| Internet drops at venue | High | Critical | PWA offline queue with sync |
| Price algorithm feels unfair | Medium | Medium | Configurable params, min/max guardrails |
| Supabase free tier limits | Low | Medium | Monitor usage, upgrade plan if needed |
| Browser autoplay blocks sounds | High | Low | User interaction before enabling sound |
| Multiple bartenders cause race conditions | Medium | High | Optimistic locking on price updates |

---

*This roadmap is a living document. Phases may overlap, and priorities may shift based on feedback from early testing.*
