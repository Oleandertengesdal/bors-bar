"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { useCardScanner } from "@/hooks/use-card-scanner";
import type { CartItem } from "@/types";

interface Drink {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  basePrice: number;
  isActive: boolean;
}

interface Guest {
  id: string;
  name: string;
  cardId: string | null;
  pin: string | null;
}

type POSStep = "identify" | "order" | "confirm";

export default function POSPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [step, setStep] = useState<POSStep>("identify");
  const [eventName, setEventName] = useState("");
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Card scanner integration
  useCardScanner({
    enabled: step === "identify",
    onScan: (scannedValue) => {
      const guest = guests.find(
        (g) => g.cardId === scannedValue || g.pin === scannedValue
      );
      if (guest) {
        setScanFeedback(`🎯 ${guest.name}`);
        setTimeout(() => setScanFeedback(null), 1000);
        selectGuest(guest);
      } else {
        setScanFeedback(`❌ Ukjent kort: ${scannedValue}`);
        setTimeout(() => setScanFeedback(null), 2000);
      }
    },
  });

  // Fetch event data
  const fetchData = useCallback(async () => {
    try {
      const [drinksRes, guestsRes, eventRes] = await Promise.all([
        fetch(`/api/events/${eventId}/drinks`),
        fetch(`/api/events/${eventId}/guests`),
        fetch(`/api/events/${eventId}`),
      ]);

      const [drinksData, guestsData, eventData] = await Promise.all([
        drinksRes.json(),
        guestsRes.json(),
        eventRes.json(),
      ]);

      if (drinksData.success) setDrinks(drinksData.data.filter((d: Drink) => d.isActive));
      if (guestsData.success) setGuests(guestsData.data);
      if (eventData.success) setEventName(eventData.data.name);
    } catch (err) {
      console.error("Failed to fetch POS data:", err);
      setError("Failed to load event data");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh prices every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/drinks`);
        const data = await res.json();
        if (data.success) {
          setDrinks(data.data.filter((d: Drink) => d.isActive));
        }
      } catch {
        // Silently fail — prices will refresh next tick
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [eventId]);

  // Filter guests on search
  useEffect(() => {
    if (!guestSearch.trim()) {
      setFilteredGuests(guests.slice(0, 8));
      return;
    }
    const q = guestSearch.toLowerCase();
    setFilteredGuests(
      guests.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.cardId?.toLowerCase().includes(q) ||
          g.pin?.includes(q)
      ).slice(0, 8)
    );
  }, [guestSearch, guests]);

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (step === "confirm") setStep("order");
        else if (step === "order") resetOrder();
        else router.push(`/dashboard/events/${eventId}`);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, eventId, router]);

  function selectGuest(guest: Guest) {
    setSelectedGuest(guest);
    setStep("order");
    setGuestSearch("");
  }

  function addToCart(drink: Drink) {
    setCart((prev) => {
      const existing = prev.find((item) => item.drinkId === drink.id);
      if (existing) {
        return prev.map((item) =>
          item.drinkId === drink.id
            ? { ...item, quantity: item.quantity + 1, pricePerUnit: drink.currentPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          drinkId: drink.id,
          drinkName: drink.name,
          quantity: 1,
          pricePerUnit: drink.currentPrice,
        },
      ];
    });
  }

  function removeFromCart(drinkId: string) {
    setCart((prev) => {
      const existing = prev.find((item) => item.drinkId === drinkId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.drinkId === drinkId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter((item) => item.drinkId !== drinkId);
    });
  }

  function cartTotal() {
    return cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  }

  function resetOrder() {
    setSelectedGuest(null);
    setCart([]);
    setStep("identify");
    setError(null);
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  async function submitOrder() {
    if (!selectedGuest || cart.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: selectedGuest.id,
          items: cart.map((item) => ({
            drinkId: item.drinkId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to register sale");
        return;
      }

      // Update local drink prices from response
      if (data.data?.drinks) {
        setDrinks(data.data.drinks.filter((d: Drink) => d.isActive));
      }

      // Show success
      const total = cartTotal();
      setSuccessMessage(
        `✅ ${formatPrice(total)} — ${selectedGuest.name}`
      );

      // Auto-reset after 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        resetOrder();
      }, 2000);
    } catch (err) {
      console.error("Sale error:", err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Group drinks by category
  const drinksByCategory = drinks.reduce<Record<string, Drink[]>>((acc, drink) => {
    const cat = drink.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(drink);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    beer: "🍺 Øl",
    wine: "🍷 Vin",
    cocktail: "🍸 Cocktails",
    spirits: "🥃 Sprit",
    "non-alcoholic": "🥤 Alkoholfritt",
    other: "📦 Annet",
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-2xl animate-pulse">Laster POS...</div>
      </div>
    );
  }

  // Success overlay
  if (successMessage) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-950">
        <div className="text-center">
          <div className="text-6xl font-bold text-green-400 mb-4">
            {successMessage}
          </div>
          <p className="text-green-300 text-xl">Salget er registrert</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/events/${eventId}`)}
            className="text-zinc-400 hover:text-white"
          >
            ← Tilbake
          </Button>
          <h1 className="text-xl font-bold">📈 POS — {eventName}</h1>
        </div>
        {selectedGuest && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg px-3 py-1">
              🧑 {selectedGuest.name}
            </Badge>
            <Button variant="ghost" size="sm" onClick={resetOrder} className="text-zinc-400">
              Bytt gjest
            </Button>
          </div>
        )}
      </header>

      {/* Step 1: Identify Guest */}
      {step === "identify" && (
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <h2 className="text-3xl font-bold mb-4">Velg gjest</h2>
          <p className="text-zinc-500 text-sm mb-6">Søk, skriv inn PIN, eller skann kort</p>

          {/* Scan feedback */}
          {scanFeedback && (
            <div className={`mb-4 rounded-xl px-6 py-3 text-lg font-bold animate-pulse ${
              scanFeedback.startsWith("🎯") ? "bg-green-950 border border-green-500 text-green-300" : "bg-red-950 border border-red-500 text-red-300"
            }`}>
              {scanFeedback}
            </div>
          )}

          <div className="w-full max-w-md">
            <Input
              ref={searchRef}
              type="text"
              placeholder="Søk etter navn, kort-ID eller PIN..."
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              className="text-lg h-14 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              autoFocus
            />
            <div className="mt-4 space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => selectGuest(guest)}
                  className="w-full flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left hover:border-blue-500 hover:bg-zinc-800 transition-colors"
                >
                  <div>
                    <span className="text-lg font-medium">{guest.name}</span>
                    {guest.pin && (
                      <span className="ml-3 text-sm text-zinc-500">
                        PIN: {guest.pin}
                      </span>
                    )}
                  </div>
                  {guest.cardId && (
                    <Badge variant="secondary" className="text-xs">
                      {guest.cardId}
                    </Badge>
                  )}
                </button>
              ))}
              {filteredGuests.length === 0 && guestSearch && (
                <p className="text-center text-zinc-500 py-4">
                  Ingen gjester funnet for &ldquo;{guestSearch}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Select Drinks */}
      {step === "order" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Drink Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {Object.entries(drinksByCategory).map(([category, categoryDrinks]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {categoryDrinks.map((drink) => {
                    const change =
                      drink.basePrice > 0
                        ? ((drink.currentPrice - drink.basePrice) / drink.basePrice) * 100
                        : 0;
                    const isUp = change > 0;
                    const isDown = change < 0;
                    const cartQty = cart.find((c) => c.drinkId === drink.id)?.quantity ?? 0;

                    return (
                      <button
                        key={drink.id}
                        onClick={() => addToCart(drink)}
                        className={`relative rounded-xl border p-4 text-left transition-all hover:scale-[1.02] active:scale-95 ${
                          cartQty > 0
                            ? "border-blue-500 bg-blue-950/30"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                        }`}
                      >
                        <div className="font-medium text-sm mb-1 truncate">
                          {drink.name}
                        </div>
                        <div className="text-2xl font-bold mb-1">
                          {formatPrice(drink.currentPrice)}
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            isUp
                              ? "text-green-400"
                              : isDown
                                ? "text-red-400"
                                : "text-zinc-500"
                          }`}
                        >
                          {isUp ? "▲" : isDown ? "▼" : "–"}{" "}
                          {Math.abs(change).toFixed(0)}%
                        </div>
                        {cartQty > 0 && (
                          <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                            {cartQty}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Cart Sidebar */}
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold">Handlekurv</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">
                  Trykk på en drikke for å legge til
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <Card key={item.drinkId} className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{item.drinkName}</div>
                            <div className="text-xs text-zinc-400">
                              {formatPrice(item.pricePerUnit)} × {item.quantity}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">
                              {formatPrice(item.pricePerUnit * item.quantity)}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => addToCart(drinks.find((d) => d.id === item.drinkId)!)}
                                className="rounded bg-zinc-700 hover:bg-zinc-600 px-1.5 text-xs leading-tight"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeFromCart(item.drinkId)}
                                className="rounded bg-zinc-700 hover:bg-red-600 px-1.5 text-xs leading-tight"
                              >
                                −
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="border-t border-zinc-800 p-4 space-y-3">
              {error && (
                <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between text-xl font-bold">
                <span>Total</span>
                <span>{formatPrice(cartTotal())}</span>
              </div>
              <Button
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting}
                className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-500 disabled:opacity-50"
              >
                {submitting ? "Registrerer..." : `Betal ${formatPrice(cartTotal())}`}
              </Button>
              <Button
                variant="ghost"
                onClick={resetOrder}
                className="w-full text-zinc-400"
              >
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
