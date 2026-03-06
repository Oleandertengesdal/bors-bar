"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface KPIs {
  totalRevenue: number;
  totalSales: number;
  uniqueGuests: number;
  avgPricePerDrink: number;
  totalDrinks: number;
  totalMarketEvents: number;
}

interface AnalyticsData {
  kpis: KPIs;
  revenueOverTime: { time: string; revenue: number; sales: number }[];
  salesByDrink: { name: string; quantity: number; revenue: number }[];
  salesByCategory: { category: string; quantity: number }[];
  topSpenders: { name: string; total: number; count: number }[];
  peakHours: { hour: string; count: number }[];
  priceHistoryByDrink: Record<string, { time: string; price: number }[]>;
  marketEvents: { type: string; name: string | null; triggeredAt: string; durationSec: number }[];
}

const categoryLabels: Record<string, string> = {
  beer: "🍺 Øl",
  wine: "🍷 Vin",
  cocktail: "🍸 Cocktails",
  spirits: "🥃 Sprit",
  "non-alcoholic": "🥤 Alkoholfritt",
  other: "📦 Annet",
};

export default function AnalyticsDashboard() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/events/${eventId}/analytics`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load analytics");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [eventId]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">{error || "No data available"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          ← Tilbake
        </Button>
      </div>
    );
  }

  const { kpis } = data;

  // Build combined price history data for multi-line chart
  const drinkNames = Object.keys(data.priceHistoryByDrink);
  const priceChartData: Record<string, unknown>[] = [];
  if (drinkNames.length > 0) {
    // Get all unique timestamps
    const allTimes = new Set<string>();
    for (const name of drinkNames) {
      for (const point of data.priceHistoryByDrink[name]) {
        allTimes.add(point.time);
      }
    }
    const sortedTimes = [...allTimes].sort();
    for (const time of sortedTimes) {
      const row: Record<string, unknown> = { time };
      for (const name of drinkNames) {
        const point = data.priceHistoryByDrink[name].find((p) => p.time === time);
        if (point) row[name] = point.price;
      }
      priceChartData.push(row);
    }
  }

  const COLORS = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Analytics</h1>
          <p className="text-muted-foreground">Komplett analyse av arrangementet</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          ← Tilbake
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total omsetning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalRevenue.toLocaleString("nb-NO")} kr</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Antall salg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Unike gjester
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.uniqueGuests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Snittpris per drikke
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgPricePerDrink.toLocaleString("nb-NO")} kr</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Drikker på menyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalDrinks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Markedshendelser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalMarketEvents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Omsetning over tid</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Omsetning (kr)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Antall salg"
                    dot={false}
                  />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Ingen data ennå</p>
            )}
          </CardContent>
        </Card>

        {/* Sales By Drink */}
        <Card>
          <CardHeader>
            <CardTitle>🍺 Salg per drikke</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesByDrink.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.salesByDrink.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="quantity" fill="#10b981" name="Antall" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Ingen data ennå</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle>🕐 Salgsmønster per time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.peakHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" name="Antall salg" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">Ingen data ennå</p>
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Salg per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesByCategory.length > 0 ? (
              <div className="space-y-3">
                {data.salesByCategory.map((cat) => {
                  const maxQty = data.salesByCategory[0]?.quantity || 1;
                  const pct = (cat.quantity / maxQty) * 100;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{categoryLabels[cat.category] || cat.category}</span>
                        <span className="font-medium">{cat.quantity} stk</span>
                      </div>
                      <div className="h-3 rounded-full bg-zinc-800">
                        <div
                          className="h-3 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">Ingen data ennå</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price History Chart */}
      {priceChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💹 Prishistorikk</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={priceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} unit=" kr" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                {drinkNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Spenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Topp gjester</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topSpenders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Gjest</th>
                    <th className="pb-2 pr-4 text-right">Drikker</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSpenders.map((guest, i) => (
                    <tr key={guest.name} className="border-b border-zinc-800">
                      <td className="py-2 pr-4 font-medium">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </td>
                      <td className="py-2 pr-4 font-medium">{guest.name}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{guest.count}</td>
                      <td className="py-2 text-right font-bold">
                        {guest.total.toLocaleString("nb-NO")} kr
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Ingen gjester har kjøpt ennå</p>
          )}
        </CardContent>
      </Card>

      {/* Market Events Log */}
      {data.marketEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⚡ Markedshendelser</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.marketEvents.map((evt, i) => {
                const typeEmoji: Record<string, string> = {
                  HAPPY_HOUR: "🍻",
                  MARKET_CRASH: "📉",
                  BULL_RUN: "🐂",
                  SPOTLIGHT: "🔦",
                  CHAOS: "🎲",
                  CUSTOM: "⚡",
                };
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                  >
                    <span>
                      {typeEmoji[evt.type] || "⚡"}{" "}
                      {evt.name || evt.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(evt.triggeredAt).toLocaleTimeString("nb-NO")} •{" "}
                      {Math.floor(evt.durationSec / 60)} min
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
