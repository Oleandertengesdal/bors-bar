"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MarketEvent {
  id: string;
  type: string;
  name: string | null;
  modifier: number;
  durationSec: number;
  isActive: boolean;
  triggeredAt: string;
  expiresAt: string;
}

interface MarketEventPanelProps {
  eventId: string;
  eventStatus: string;
  onTrigger?: () => void;
}

const MARKET_EVENTS = [
  {
    type: "HAPPY_HOUR" as const,
    label: "🍻 Happy Hour",
    description: "Alle priser -30% i en periode",
    modifier: 0.7,
    durationSec: 300,
    color: "bg-amber-600 hover:bg-amber-500",
  },
  {
    type: "MARKET_CRASH" as const,
    label: "📉 Market Crash",
    description: "Alle priser tilbake til grunnpris",
    modifier: 1.0,
    durationSec: 60,
    color: "bg-red-600 hover:bg-red-500",
  },
  {
    type: "BULL_RUN" as const,
    label: "🐂 Bull Run",
    description: "Alle priser +30% i en periode",
    modifier: 1.3,
    durationSec: 300,
    color: "bg-green-600 hover:bg-green-500",
  },
  {
    type: "SPOTLIGHT" as const,
    label: "🔦 Spotlight",
    description: "Tilfeldig drikke til minstepris",
    modifier: 1.0,
    durationSec: 180,
    color: "bg-purple-600 hover:bg-purple-500",
  },
  {
    type: "CHAOS" as const,
    label: "🎲 Chaos",
    description: "Alle priser randomisert!",
    modifier: 1.0,
    durationSec: 120,
    color: "bg-fuchsia-600 hover:bg-fuchsia-500",
  },
];

export function MarketEventPanel({
  eventId,
  eventStatus,
  onTrigger,
}: MarketEventPanelProps) {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [activeEvents, setActiveEvents] = useState<MarketEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Fetch active events on mount
  useState(() => {
    fetch(`/api/events/${eventId}/market-events`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setActiveEvents(data.data.active);
      })
      .catch(() => {});
  });

  async function triggerEvent(
    type: string,
    modifier: number,
    durationSec: number
  ) {
    if (eventStatus !== "ACTIVE") return;

    setTriggering(type);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch(`/api/events/${eventId}/market-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, modifier, durationSec }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to trigger event");
        return;
      }

      setLastResult(
        `${type.replace(/_/g, " ")} triggered! ${data.data.priceUpdates.length} prices changed.`
      );
      setActiveEvents((prev) => [...prev, data.data.marketEvent]);

      // Auto-remove from active after expiration
      setTimeout(() => {
        setActiveEvents((prev) =>
          prev.filter((e) => e.id !== data.data.marketEvent.id)
        );
      }, durationSec * 1000);

      onTrigger?.();
    } catch {
      setError("Network error");
    } finally {
      setTriggering(null);
    }
  }

  const isDisabled = eventStatus !== "ACTIVE";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚡ Market Events
          {activeEvents.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {activeEvents.length} active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Trigger market events to shake up the prices. Events auto-expire
          after their duration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDisabled && (
          <p className="text-sm text-muted-foreground italic">
            Start the event before triggering market events.
          </p>
        )}

        {/* Active events */}
        {activeEvents.length > 0 && (
          <div className="space-y-2">
            {activeEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-950/20 px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {evt.name || evt.type.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">
                  Utløper{" "}
                  {new Date(evt.expiresAt).toLocaleTimeString("nb-NO")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Trigger buttons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MARKET_EVENTS.map((evt) => (
            <button
              key={evt.type}
              disabled={isDisabled || triggering !== null}
              onClick={() =>
                triggerEvent(evt.type, evt.modifier, evt.durationSec)
              }
              className={`rounded-xl border border-transparent p-4 text-left text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${evt.color}`}
            >
              <div className="text-lg font-bold">{evt.label}</div>
              <div className="mt-1 text-xs opacity-80">{evt.description}</div>
              <div className="mt-2 text-xs opacity-60">
                {Math.floor(evt.durationSec / 60)} min
              </div>
              {triggering === evt.type && (
                <div className="mt-1 text-xs animate-pulse">Triggering...</div>
              )}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {lastResult && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-600">
            ✅ {lastResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
