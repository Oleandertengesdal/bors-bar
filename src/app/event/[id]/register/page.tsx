"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function GuestRegisterPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [name, setName] = useState("");
  const [cardId, setCardId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    name: string;
    pin: string;
    qrCode: string;
    eventName: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          cardId: cardId.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Registration failed");
        return;
      }

      setResult(data.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Success page with PIN and QR code
  if (result) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(result.qrCode)}`;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-3xl font-bold">Du er registrert!</h1>
            <p className="mt-2 text-zinc-400">
              Velkommen til <span className="font-semibold text-white">{result.eventName}</span>
            </p>
          </div>

          {/* PIN Code */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400 mb-2">Din PIN-kode</p>
            <div className="text-6xl font-black font-mono tracking-[0.3em] text-emerald-400">
              {result.pin}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Gi denne til bartenderen for rask identifikasjon
            </p>
          </div>

          {/* QR Code */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400 mb-4">Din QR-kode</p>
            <div className="flex justify-center">
              <img
                src={qrUrl}
                alt="QR Code"
                className="rounded-xl bg-white p-2"
                width={200}
                height={200}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Vis denne til bartenderen for skanning
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <a
              href={`/event/${eventId}/prices`}
              className="block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              📈 Se live-priser
            </a>
            <p className="text-xs text-zinc-600">
              Ta et skjermbilde av PIN og QR-kode!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="text-4xl">📈</span>
          <h1 className="mt-4 text-3xl font-bold">Registrer deg</h1>
          <p className="mt-2 text-zinc-400">
            Registrer deg for å delta på børskvelden
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
              Navn <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ola Nordmann"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="cardId" className="block text-sm font-medium text-zinc-300 mb-1">
              Kort-ID <span className="text-zinc-600">(valgfritt)</span>
            </label>
            <input
              id="cardId"
              type="text"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="Kortnummer eller studentkort-ID"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
              E-post <span className="text-zinc-600">(valgfritt)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ola@example.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Registrerer..." : "Registrer meg"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600">
          Du vil få en PIN-kode og QR-kode etter registrering
        </p>
      </div>
    </div>
  );
}
