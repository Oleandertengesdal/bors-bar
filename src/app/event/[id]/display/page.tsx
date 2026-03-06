"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { useRealtimePrices } from "@/hooks/use-realtime-prices";

interface DrinkPrice {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number; // tracked locally for animation
  priceChangePercent: number;
  priceDirection: "up" | "down" | "stable";
}

interface EventInfo {
  id: string;
  name: string;
  status: string;
}

interface ActiveMarketEvent {
  id: string;
  type: string;
  name: string | null;
  modifier: number;
  expiresAt: string;
  isActive: boolean;
}

export default function TVDisplayPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [drinks, setDrinks] = useState<DrinkPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connected, setConnected] = useState(true);
  const [activeMarketEvents, setActiveMarketEvents] = useState<ActiveMarketEvent[]>([]);
  const previousPricesRef = useRef<Map<string, number>>(new Map());
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());

  // Supabase Realtime integration with polling fallback
  const realtimeState = useRealtimePrices({
    eventId,
    enabled: !loading,
    onPriceUpdate: (updatedDrinks) => {
      if (updatedDrinks.length > 0 && !event) {
        // Will be set on initial fetch
      }

      const prevPrices = previousPricesRef.current;
      const historyMap = priceHistoryRef.current;

      const mapped: DrinkPrice[] = (updatedDrinks as unknown as DrinkPrice[]).map((d) => ({
        ...d,
        previousPrice: prevPrices.get(d.id) ?? d.currentPrice,
      }));

      mapped.forEach((d) => {
        prevPrices.set(d.id, d.currentPrice);
        // Track sparkline history (last 20 points)
        const hist = historyMap.get(d.id) || [];
        hist.push(d.currentPrice);
        if (hist.length > 20) hist.shift();
        historyMap.set(d.id, hist);
      });

      setDrinks(mapped);
      setLastUpdate(new Date());
      setConnected(true);
    },
  });

  // Initial fetch for event info
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/events/${eventId}/prices`);
        const data = await res.json();
        if (data.success) {
          setEvent(data.data.event);
          const prevPrices = previousPricesRef.current;
          const updatedDrinks: DrinkPrice[] = data.data.drinks.map(
            (d: DrinkPrice & { currentPrice: number }) => ({
              ...d,
              previousPrice: prevPrices.get(d.id) ?? d.currentPrice,
            })
          );
          updatedDrinks.forEach((d) => {
            prevPrices.set(d.id, d.currentPrice);
          });
          setDrinks(updatedDrinks);
          setLastUpdate(new Date());
          setConnected(true);
        }
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [eventId]);

  // Fetch active market events (still polling — these need periodic refresh for countdown timers)
  const fetchMarketEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/market-events`);
      const data = await res.json();
      if (data.success) {
        setActiveMarketEvents(data.data.active);
      }
    } catch {
      // silent
    }
  }, [eventId]);

  useEffect(() => {
    fetchMarketEvents();
    const interval = setInterval(fetchMarketEvents, 3000);
    return () => clearInterval(interval);
  }, [fetchMarketEvents]);

  // Fullscreen toggle on F11 or double-click
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F11") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    }
    function handleDblClick() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("dblclick", handleDblClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("dblclick", handleDblClick);
    };
  }, []);

  // Group drinks by category
  const drinksByCategory = drinks.reduce<Record<string, DrinkPrice[]>>(
    (acc, drink) => {
      const cat = drink.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(drink);
      return acc;
    },
    {}
  );

  const categoryEmoji: Record<string, string> = {
    beer: "🍺",
    wine: "🍷",
    cocktail: "🍸",
    spirits: "🥃",
    "non-alcoholic": "🥤",
    other: "📦",
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-4xl animate-pulse font-mono">
          BØRSBAR LOADING...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-2xl">Event not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-black text-white overflow-hidden select-none">
      {/* Header — Stock ticker style */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            📈 BØRSBAR
          </span>
          <span className="text-xl font-bold text-zinc-300">
            {event.name}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-600 font-mono uppercase">
            {realtimeState.mode === "realtime" ? "⚡ Live" : "📡 Polling"}
          </span>
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              connected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-zinc-500 font-mono">
            {lastUpdate.toLocaleTimeString("nb-NO")}
          </span>
        </div>
      </header>

      {/* Active Market Event Banner */}
      {activeMarketEvents.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 px-6 py-3 text-center animate-pulse">
          {activeMarketEvents.map((evt) => {
            const typeEmoji: Record<string, string> = {
              HAPPY_HOUR: "🍻",
              MARKET_CRASH: "📉",
              BULL_RUN: "🐂",
              SPOTLIGHT: "🔦",
              CHAOS: "🎲",
              CUSTOM: "⚡",
            };
            const remaining = Math.max(
              0,
              Math.ceil((new Date(evt.expiresAt).getTime() - Date.now()) / 1000)
            );
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            return (
              <span key={evt.id} className="inline-flex items-center gap-3 text-black font-black text-2xl font-mono mx-4">
                {typeEmoji[evt.type] || "⚡"}{" "}
                {(evt.name || evt.type.replace(/_/g, " ")).toUpperCase()}
                <span className="text-lg font-bold opacity-80">
                  {mins}:{secs.toString().padStart(2, "0")}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Price Board */}
      <main className="flex-1 overflow-hidden p-6">
        <div className="grid gap-6 h-full" style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
        }}>
          {Object.entries(drinksByCategory).map(([category, categoryDrinks]) => (
            <div key={category} className="flex flex-col">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 font-mono">
                {categoryEmoji[category] || "📦"} {category}
              </h2>
              <div className="flex-1 space-y-2">
                {categoryDrinks.map((drink) => (
                  <DrinkRow
                    key={drink.id}
                    drink={drink}
                    sparklineData={priceHistoryRef.current.get(drink.id) || []}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer Ticker */}
      <footer className="border-t border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-2 px-4">
          {drinks.map((d) => {
            const isUp = d.priceDirection === "up";
            const isDown = d.priceDirection === "down";
            return (
              <span key={d.id} className="inline-flex items-center gap-2 mr-8 font-mono text-sm">
                <span className="text-zinc-400 font-bold">{d.name}</span>
                <span className="text-white">{formatPrice(d.currentPrice)}</span>
                <span
                  className={
                    isUp
                      ? "text-green-400"
                      : isDown
                        ? "text-red-400"
                        : "text-zinc-600"
                  }
                >
                  {isUp ? "▲" : isDown ? "▼" : "–"}
                  {Math.abs(d.priceChangePercent).toFixed(1)}%
                </span>
              </span>
            );
          })}
          {/* Duplicate for seamless loop */}
          {drinks.map((d) => {
            const isUp = d.priceDirection === "up";
            const isDown = d.priceDirection === "down";
            return (
              <span key={`dup-${d.id}`} className="inline-flex items-center gap-2 mr-8 font-mono text-sm">
                <span className="text-zinc-400 font-bold">{d.name}</span>
                <span className="text-white">{formatPrice(d.currentPrice)}</span>
                <span
                  className={
                    isUp
                      ? "text-green-400"
                      : isDown
                        ? "text-red-400"
                        : "text-zinc-600"
                  }
                >
                  {isUp ? "▲" : isDown ? "▼" : "–"}
                  {Math.abs(d.priceChangePercent).toFixed(1)}%
                </span>
              </span>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

// ─── Animated Number Hook ──────────────────────────────

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(display);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (target === display && animRef.current === null) return;

    startRef.current = display;
    startTimeRef.current = performance.now();

    function animate(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(
        startRef.current + (target - startRef.current) * eased
      );
      setDisplay(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        animRef.current = null;
      }
    }

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

// ─── Mini Sparkline SVG ────────────────────────────────

function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#10b981",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

// ─── Drink Row Component ───────────────────────────────

function DrinkRow({
  drink,
  sparklineData,
}: {
  drink: DrinkPrice;
  sparklineData: number[];
}) {
  const isUp = drink.priceDirection === "up";
  const isDown = drink.priceDirection === "down";

  // Flash animation when price changed since last fetch
  const justChanged = drink.currentPrice !== drink.previousPrice;

  // Animated price display
  const animatedPrice = useAnimatedNumber(drink.currentPrice);

  const sparkColor = isUp ? "#4ade80" : isDown ? "#f87171" : "#6b7280";

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 font-mono transition-all duration-500 ${
        justChanged
          ? isUp
            ? "border-green-500/50 bg-green-950/30"
            : "border-red-500/50 bg-red-950/30"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-xl ${
            isUp ? "text-green-400" : isDown ? "text-red-400" : "text-zinc-600"
          }`}
        >
          {isUp ? "▲" : isDown ? "▼" : "–"}
        </span>
        <span className="text-lg font-bold text-zinc-100">{drink.name}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Sparkline */}
        <Sparkline data={sparklineData} color={sparkColor} />

        <span
          className={`text-sm font-medium px-2 py-0.5 rounded ${
            isUp
              ? "text-green-400 bg-green-950"
              : isDown
                ? "text-red-400 bg-red-950"
                : "text-zinc-500 bg-zinc-800"
          }`}
        >
          {isUp ? "+" : ""}
          {drink.priceChangePercent.toFixed(1)}%
        </span>
        <span
          className={`text-2xl font-black tabular-nums ${
            isUp
              ? "text-green-400"
              : isDown
                ? "text-red-400"
                : "text-white"
          }`}
        >
          {formatPrice(animatedPrice)}
        </span>
      </div>
    </div>
  );
}
