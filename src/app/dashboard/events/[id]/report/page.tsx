"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

interface Summary {
  grandTotal: number;
  totalSales: number;
  uniqueGuests: number;
  averagePerGuest: number;
}

interface GuestEntry {
  guestId: string;
  guestName: string;
  email: string | null;
  cardId: string | null;
  totalOwed: number;
  drinkCount: number;
  purchases: Array<{
    drinkName: string;
    category: string;
    quantity: number;
    pricePaid: number;
    timestamp: string;
  }>;
}

interface DrinkBreakdown {
  drinkName: string;
  category: string;
  totalSold: number;
  totalRevenue: number;
}

interface EventInfo {
  id: string;
  name: string;
  status: string;
}

export default function SettlementReportPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [drinkBreakdown, setDrinkBreakdown] = useState<DrinkBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGuest, setExpandedGuest] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"total" | "name" | "count">("total");

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/settlement`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.data.event);
        setSummary(data.data.summary);
        setGuests(data.data.guests);
        setDrinkBreakdown(data.data.drinkBreakdown);
      }
    } catch (error) {
      console.error("Failed to fetch settlement:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function downloadCsv(type: "settlement" | "transactions") {
    const format = type === "settlement" ? "csv" : "transactions";
    window.open(`/api/events/${eventId}/settlement?format=${format}`, "_blank");
  }

  const sortedGuests = [...guests].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.guestName.localeCompare(b.guestName, "nb-NO");
      case "count":
        return b.drinkCount - a.drinkCount;
      case "total":
      default:
        return b.totalOwed - a.totalOwed;
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!event || !summary) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Report not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/events")}
        >
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/events/${eventId}`)}
            className="mb-2 -ml-3"
          >
            ← Tilbake
          </Button>
          <h1 className="text-3xl font-bold">📊 Settlement Report</h1>
          <p className="text-muted-foreground mt-1">{event.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("settlement")}>
            📥 Last ned oppgjør (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadCsv("transactions")}
          >
            📥 Alle transaksjoner (CSV)
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total omsetning</CardDescription>
            <CardTitle className="text-2xl">
              {formatPrice(summary.grandTotal)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totalt solgt</CardDescription>
            <CardTitle className="text-2xl">{summary.totalSales} stk</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unike gjester</CardDescription>
            <CardTitle className="text-2xl">
              {summary.uniqueGuests}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Snitt per gjest</CardDescription>
            <CardTitle className="text-2xl">
              {formatPrice(summary.averagePerGuest)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Drink Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>🍺 Salg per drikke</CardTitle>
          <CardDescription>Oppsummering av hva som ble solgt</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drikke</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Antall solgt</TableHead>
                <TableHead className="text-right">Total omsetning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drinkBreakdown.map((d) => (
                <TableRow key={d.drinkName}>
                  <TableCell className="font-medium">{d.drinkName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{d.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{d.totalSold}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(d.totalRevenue)}
                  </TableCell>
                </TableRow>
              ))}
              {drinkBreakdown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Ingen salg registrert ennå
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Guest Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>👥 Oppgjør per gjest</CardTitle>
              <CardDescription>
                Klikk på en gjest for å se detaljer
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant={sortBy === "total" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("total")}
              >
                Total
              </Button>
              <Button
                variant={sortBy === "name" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("name")}
              >
                Navn
              </Button>
              <Button
                variant={sortBy === "count" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("count")}
              >
                Antall
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gjest</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead className="text-right">Drikker</TableHead>
                <TableHead className="text-right">Skylder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGuests.map((g) => (
                <>
                  <TableRow
                    key={g.guestId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedGuest(
                        expandedGuest === g.guestId ? null : g.guestId
                      )
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="mr-2">
                        {expandedGuest === g.guestId ? "▼" : "▶"}
                      </span>
                      {g.guestName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.email || "—"}
                    </TableCell>
                    <TableCell className="text-right">{g.drinkCount}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPrice(g.totalOwed)}
                    </TableCell>
                  </TableRow>
                  {expandedGuest === g.guestId && (
                    <TableRow key={`${g.guestId}-details`}>
                      <TableCell colSpan={4} className="bg-muted/30 p-0">
                        <div className="px-8 py-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left pb-1">Tidspunkt</th>
                                <th className="text-left pb-1">Drikke</th>
                                <th className="text-right pb-1">Antall</th>
                                <th className="text-right pb-1">Pris</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.purchases.map((p, i) => (
                                <tr key={i} className="border-t border-muted">
                                  <td className="py-1">
                                    {new Date(p.timestamp).toLocaleTimeString(
                                      "nb-NO"
                                    )}
                                  </td>
                                  <td>{p.drinkName}</td>
                                  <td className="text-right">{p.quantity}</td>
                                  <td className="text-right">
                                    {formatPrice(p.pricePaid)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {sortedGuests.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Ingen gjester har kjøpt noe ennå
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
