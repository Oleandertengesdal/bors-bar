"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface DrinkPrice {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  priceChangePercent: number;
  priceDirection: "up" | "down" | "stable";
}

interface ActiveMarketEvent {
  id: string;
  type: string;
  name: string | null;
  modifier: number;
  expiresAt: string;
}

type SortMode = "name" | "price-asc" | "price-desc" | "change";

const categoryEmoji: Record<string, string> = {
  beer: "🍺",
  wine: "🍷",
  cocktail: "🍸",
  spirits: "🥃",
  "non-alcoholic": "🥤",
  other: "📦",
};

export default function GuestPricesPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [eventName, setEventName] = useState("");
  const [drinks, setDrinks] = useState<DrinkPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [activeEvents, setActiveEvents] = useState<ActiveMarketEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/prices`);
      const data = await res.json();
      if (data.success) {
        setEventName(data.data.event.name);
        setDrinks(data.data.drinks);
        setLastUpdate(new Date());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchMarketEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/market-events`);
      const data = await res.json();
      if (data.success) {
        setActiveEvents(data.data.active);
      }
    } catch {
      // silent
    }
  }, [eventId]);

  useEffect(() => {
    fetchPrices();
    fetchMarketEvents();
  }, [fetchPrices, fetchMarketEvents]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
      fetchMarketEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchPrices, fetchMarketEvents]);

  // Sort & filter drinks
  const categories = [...new Set(drinks.map((d) => d.category))].sort();

  const sortedDrinks = [...drinks]
    .filter((d) => !filterCategory || d.category === filterCategory)
    .sort((a, b) => {
      switch (sortMode) {
        case "price-asc":
          return a.currentPrice - b.currentPrice;
        case "price-desc":
          return b.currentPrice - a.currentPrice;
        case "change":
          return b.priceChangePercent - a.priceChangePercent;
        default:
          return a.name.localeCompare(b.name, "nb-NO");
      }
    });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="animate-pulse text-2xl font-mono">Laster priser...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">📈 {eventName}</h1>
            <p className="text-xs text-zinc-500">
              Oppdatert {lastUpdate.toLocaleTimeString("nb-NO")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500">Live</span>
          </div>
        </div>
      </header>

      {/* Active Market Event Banner */}
      {activeEvents.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 px-4 py-2 text-center">
          {activeEvents.map((evt) => {
            const typeEmoji: Record<string, string> = {
              HAPPY_HOUR: "🍻",
              MARKET_CRASH: "📉",
              BULL_RUN: "🐂",
              SPOTLIGHT: "🔦",
              CHAOS: "🎲",
              CUSTOM: "⚡",
            };
            return (
              <span key={evt.id} className="inline-flex items-center gap-2 text-black font-bold text-sm">
                {typeEmoji[evt.type] || "⚡"} {(evt.name || evt.type.replace(/_/g, " ")).toUpperCase()}
              </span>
            );
          })}
        </div>
      )}

      {/* Sort & Filter Controls */}
      <div className="px-4 py-3 space-y-2">
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filterCategory
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Alle
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {categoryEmoji[cat] || "📦"} {cat}
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex gap-2">
          {[
            { mode: "name" as const, label: "A-Å" },
            { mode: "price-asc" as const, label: "Billigst" },
            { mode: "price-desc" as const, label: "Dyrest" },
            { mode: "change" as const, label: "Endring" },
          ].map((s) => (
            <button
              key={s.mode}
              onClick={() => setSortMode(s.mode)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                sortMode === s.mode
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drink List */}
      <div className="px-4 space-y-2">
        {sortedDrinks.map((drink) => {
          const isUp = drink.priceDirection === "up";
          const isDown = drink.priceDirection === "down";

          return (
            <div
              key={drink.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {categoryEmoji[drink.category] || "📦"}
                </span>
                <div>
                  <div className="font-semibold text-sm">{drink.name}</div>
                  <div
                    className={`text-xs font-medium ${
                      isUp ? "text-green-400" : isDown ? "text-red-400" : "text-zinc-500"
                    }`}
                  >
                    {isUp ? "▲" : isDown ? "▼" : "–"}{" "}
                    {Math.abs(drink.priceChangePercent).toFixed(1)}% fra basis
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-xl font-black font-mono tabular-nums ${
                    isUp ? "text-green-400" : isDown ? "text-red-400" : "text-white"
                  }`}
                >
                  {formatPrice(drink.currentPrice)}
                </div>
              </div>
            </div>
          );
        })}

        {sortedDrinks.length === 0 && (
          <p className="text-center text-zinc-500 py-8">Ingen drikker funnet</p>
        )}
      </div>

      {/* Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{sortedDrinks.length} drikker</span>
          <span>
            Billigst: {sortedDrinks.length > 0 ? formatPrice(Math.min(...sortedDrinks.map((d) => d.currentPrice))) : "—"}
          </span>
          <span>
            Dyrest: {sortedDrinks.length > 0 ? formatPrice(Math.max(...sortedDrinks.map((d) => d.currentPrice))) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
