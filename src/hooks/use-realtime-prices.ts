"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface DrinkPriceUpdate {
  id: string;
  currentPrice: number;
  name: string;
}

interface UseRealtimePricesOptions {
  eventId: string;
  enabled?: boolean;
  /** Callback when prices update via realtime */
  onPriceUpdate?: (drinks: DrinkPriceUpdate[]) => void;
  /** Fallback polling interval in ms (used when realtime fails) */
  fallbackPollInterval?: number;
}

interface RealtimeState {
  connected: boolean;
  mode: "realtime" | "polling" | "connecting";
  lastUpdate: Date;
}

/**
 * Hook for subscribing to real-time price updates via Supabase Realtime.
 * Falls back to polling if the realtime connection fails.
 */
export function useRealtimePrices({
  eventId,
  enabled = true,
  onPriceUpdate,
  fallbackPollInterval = 5000,
}: UseRealtimePricesOptions) {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    mode: "connecting",
    lastUpdate: new Date(),
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  onPriceUpdateRef.current = onPriceUpdate;

  const fetchPricesFallback = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/prices`);
      const data = await res.json();
      if (data.success) {
        setState((prev) => ({ ...prev, lastUpdate: new Date() }));
        onPriceUpdateRef.current?.(data.data.drinks);
      }
    } catch {
      // silent
    }
  }, [eventId]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setState((prev) => ({ ...prev, mode: "polling" }));
    pollingRef.current = setInterval(fetchPricesFallback, fallbackPollInterval);
  }, [fetchPricesFallback, fallbackPollInterval]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Try to set up Supabase Realtime subscription
    const channel = supabase
      .channel(`drinks-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drinks",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // When a drink price changes, fetch all current prices
          // This ensures consistency across all drinks
          fetchPricesFallback();
          setState((prev) => ({
            ...prev,
            connected: true,
            mode: "realtime",
            lastUpdate: new Date(),
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "market_events",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Market event triggered — refetch prices
          fetchPricesFallback();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setState((prev) => ({
            ...prev,
            connected: true,
            mode: "realtime",
          }));
          stopPolling();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setState((prev) => ({
            ...prev,
            connected: false,
            mode: "polling",
          }));
          startPolling();
        }
      });

    channelRef.current = channel;

    // Initial fetch
    fetchPricesFallback();

    // Start polling as backup in case realtime takes too long to connect
    const backupTimeout = setTimeout(() => {
      if (!channelRef.current) return;
      // If not connected after 5s, start polling
      setState((prev) => {
        if (prev.mode === "connecting") {
          startPolling();
          return { ...prev, mode: "polling" };
        }
        return prev;
      });
    }, 5000);

    return () => {
      clearTimeout(backupTimeout);
      stopPolling();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [eventId, enabled, fetchPricesFallback, startPolling, stopPolling]);

  return state;
}
