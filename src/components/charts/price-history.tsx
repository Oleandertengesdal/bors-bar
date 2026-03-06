"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PriceHistoryEntry {
  time: string;
  price: number;
  timestamp: number;
}

interface MarketEventOverlay {
  type: string;
  name: string | null;
  triggeredAt: string;
  durationSec: number;
}

interface PriceHistoryChartProps {
  eventId: string;
  drinkId: string;
  drinkName: string;
  basePrice: number; // in øre
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

export function PriceHistoryChart({
  eventId,
  drinkId,
  drinkName,
  basePrice,
}: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/events/${eventId}/drinks/${drinkId}/history`);
        const data = await res.json();
        if (data.success) {
          setHistory(
            data.data.map((entry: { price: number; recordedAt: string }) => ({
              time: new Date(entry.recordedAt).toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: entry.price / 100,
              timestamp: new Date(entry.recordedAt).getTime(),
            }))
          );
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [eventId, drinkId]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded bg-muted" />;
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Ingen prishistorikk ennå
      </p>
    );
  }

  const basePriceNOK = basePrice / 100;
  const minPrice = Math.min(...history.map((h) => h.price));
  const maxPrice = Math.max(...history.map((h) => h.price));
  const lastPrice = history[history.length - 1]?.price ?? basePriceNOK;
  const changeFromBase = basePriceNOK > 0
    ? ((lastPrice - basePriceNOK) / basePriceNOK) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{drinkName}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{lastPrice} kr</span>
            <Badge
              variant={changeFromBase >= 0 ? "default" : "destructive"}
              className="text-xs"
            >
              {changeFromBase >= 0 ? "▲" : "▼"} {Math.abs(changeFromBase).toFixed(1)}%
            </Badge>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Min: {minPrice} kr</span>
          <span>Max: {maxPrice} kr</span>
          <span>Basis: {basePriceNOK} kr</span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              domain={["dataMin - 5", "dataMax + 5"]}
              unit=" kr"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <ReferenceLine
              y={basePriceNOK}
              stroke="#6b7280"
              strokeDasharray="5 5"
              label={{ value: "Basis", fill: "#6b7280", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name={`${drinkName} (kr)`}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Multi-drink overlay chart ─────────────────────────

interface MultiDrinkPriceChartProps {
  eventId: string;
  drinks: { id: string; name: string; basePrice: number }[];
  marketEvents?: MarketEventOverlay[];
}

export function MultiDrinkPriceChart({
  eventId,
  drinks,
  marketEvents = [],
}: MultiDrinkPriceChartProps) {
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrinks, setSelectedDrinks] = useState<Set<string>>(
    new Set(drinks.slice(0, 5).map((d) => d.id))
  );

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch(`/api/events/${eventId}/analytics`);
        const data = await res.json();
        if (data.success && data.data.priceHistoryByDrink) {
          const allTimes = new Set<string>();
          const histories = data.data.priceHistoryByDrink as Record<
            string,
            { time: string; price: number }[]
          >;

          for (const name of Object.keys(histories)) {
            for (const point of histories[name]) {
              allTimes.add(point.time);
            }
          }

          const sortedTimes = [...allTimes].sort();
          const rows: Record<string, unknown>[] = sortedTimes.map((time) => {
            const row: Record<string, unknown> = { time };
            for (const name of Object.keys(histories)) {
              const pt = histories[name].find((p) => p.time === time);
              if (pt) row[name] = pt.price;
            }
            return row;
          });

          setChartData(rows);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [eventId]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Ingen prishistorikk tilgjengelig ennå
        </CardContent>
      </Card>
    );
  }

  const drinkNames = drinks
    .filter((d) => selectedDrinks.has(d.id))
    .map((d) => d.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>💹 Prishistorikk — alle drikker</CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {drinks.map((d, i) => (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDrinks((prev) => {
                  const next = new Set(prev);
                  if (next.has(d.id)) next.delete(d.id);
                  else next.add(d.id);
                  return next;
                });
              }}
              className={`rounded-full px-3 py-0.5 text-xs font-medium border transition-colors ${
                selectedDrinks.has(d.id)
                  ? "border-transparent text-white"
                  : "border-zinc-700 text-zinc-500"
              }`}
              style={{
                backgroundColor: selectedDrinks.has(d.id)
                  ? COLORS[i % COLORS.length]
                  : "transparent",
              }}
            >
              {d.name}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} unit=" kr" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            {drinkNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[drinks.findIndex((d) => d.name === name) % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
            {/* Market event reference lines */}
            {marketEvents.map((evt, i) => (
              <ReferenceLine
                key={i}
                x={new Date(evt.triggeredAt).toLocaleTimeString("nb-NO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: evt.name || evt.type,
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
