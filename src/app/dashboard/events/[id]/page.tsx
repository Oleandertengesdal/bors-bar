"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DrinkManager } from "@/components/dashboard/drink-manager";
import { GuestManager } from "@/components/dashboard/guest-manager";
import { EventSettings } from "@/components/dashboard/event-settings";
import { MarketEventPanel } from "@/components/dashboard/market-events";

interface Event {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pricingMode: string;
  pricingConfig: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  drinks: Array<{
    id: string;
    name: string;
    category: string;
    basePrice: number;
    minPrice: number;
    maxPrice: number;
    currentPrice: number;
    isActive: boolean;
    sortOrder: number;
  }>;
  guests: Array<{
    id: string;
    name: string;
    cardId: string | null;
    email: string | null;
    pin: string | null;
  }>;
  _count: { sales: number };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-800",
};

const nextStatus: Record<string, { label: string; status: string } | null> = {
  DRAFT: { label: "Start Event", status: "ACTIVE" },
  ACTIVE: { label: "Pause Event", status: "PAUSED" },
  PAUSED: { label: "Resume Event", status: "ACTIVE" },
  COMPLETED: null,
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch event:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleStatusChange(newStatus: string) {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/events/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEvent((prev) =>
          prev ? { ...prev, status: data.data.status } : null
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleEndEvent() {
    if (!confirm("Are you sure you want to end this event? This cannot be undone.")) {
      return;
    }
    await handleStatusChange("COMPLETED");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Event not found</p>
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

  const next = nextStatus[event.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <Badge className={statusColors[event.status] || ""}>
              {event.status}
            </Badge>
          </div>
          {event.description && (
            <p className="mt-1 text-muted-foreground">{event.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {(event.status === "ACTIVE" || event.status === "COMPLETED") && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/events/${event.id}/analytics`)
              }
            >
              📈 Analytics
            </Button>
          )}
          {(event.status === "ACTIVE" || event.status === "COMPLETED") && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/events/${event.id}/report`)
              }
            >
              📊 Report
            </Button>
          )}
          {event.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/event/${event.id}/display`, "_blank")
              }
            >
              📺 TV Display
            </Button>
          )}
          {event.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/event/${event.id}/prices`, "_blank")
              }
            >
              📱 Mobilpriser
            </Button>
          )}
          {(event.status === "DRAFT" || event.status === "ACTIVE") && (
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/event/${event.id}/register`;
                navigator.clipboard.writeText(url);
                alert(`Registreringslenke kopiert!\n${url}`);
              }}
            >
              🔗 Registreringslenke
            </Button>
          )}
          {event.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/dashboard/events/${event.id}/pos`, "_blank")
              }
            >
              🛒 POS Terminal
            </Button>
          )}
          {next && (
            <Button
              onClick={() => handleStatusChange(next.status)}
              disabled={statusLoading}
            >
              {statusLoading ? "..." : next.label}
            </Button>
          )}
          {(event.status === "ACTIVE" || event.status === "PAUSED") && (
            <Button
              variant="destructive"
              onClick={handleEndEvent}
              disabled={statusLoading}
            >
              End Event
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drinks</CardDescription>
            <CardTitle className="text-2xl">{event.drinks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Guests</CardDescription>
            <CardTitle className="text-2xl">{event.guests.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales</CardDescription>
            <CardTitle className="text-2xl">{event._count.sales}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl capitalize">
              {event.status.toLowerCase()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="drinks">
        <TabsList>
          <TabsTrigger value="drinks">🍺 Drinks</TabsTrigger>
          <TabsTrigger value="guests">👥 Guests</TabsTrigger>
          <TabsTrigger value="market">⚡ Market</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="drinks" className="mt-4">
          <DrinkManager eventId={event.id} drinks={event.drinks} onUpdate={fetchEvent} />
        </TabsContent>

        <TabsContent value="guests" className="mt-4">
          <GuestManager eventId={event.id} guests={event.guests} onUpdate={fetchEvent} />
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketEventPanel eventId={event.id} eventStatus={event.status} onTrigger={fetchEvent} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <EventSettings event={event} onUpdate={fetchEvent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
