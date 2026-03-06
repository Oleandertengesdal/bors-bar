import Link from "next/link";

const DEMO_DRINKS = [
  { name: "Pilsner", price: 75, change: 12, trend: "up" as const },
  { name: "IPA", price: 92, change: -8, trend: "down" as const },
  { name: "Gin & Tonic", price: 135, change: 24, trend: "up" as const },
  { name: "Hveteøl", price: 68, change: -15, trend: "down" as const },
  { name: "Rødvin", price: 110, change: 5, trend: "up" as const },
  { name: "Espresso Martini", price: 148, change: 31, trend: "up" as const },
  { name: "Jägermeister", price: 55, change: -22, trend: "down" as const },
  { name: "Brus", price: 30, change: -3, trend: "down" as const },
];

function PriceCard({
  name,
  price,
  change,
  trend,
}: {
  name: string;
  price: number;
  change: number;
  trend: "up" | "down";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 backdrop-blur transition-colors hover:border-zinc-700">
      <span className="font-medium text-zinc-100">{name}</span>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-white">{price} kr</span>
        <span
          className={`flex items-center gap-0.5 text-sm font-semibold ${
            trend === "up" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {trend === "up" ? "▲" : "▼"} {Math.abs(change)}%
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-zinc-800/50 bg-black/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📈</span>
          <span className="text-xl font-bold tracking-tight">Børsbar</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Logg inn
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Gradient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute right-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-blue-500/8 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Dynamisk prising i sanntid
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
            Drikkepriser som{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              aksjer
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-zinc-400">
            Gjør enhver fest til en børsopplevelse. Prisene stiger når etterspørselen øker, 
            og faller når ingen kjøper. Market crash, happy hour og mer.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard/events/new"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-black transition-all hover:bg-zinc-200 hover:shadow-lg hover:shadow-white/10"
            >
              Opprett arrangement
              <span>→</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-xl border border-zinc-700 px-8 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Hvordan fungerer det?
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce text-zinc-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* Live Ticker Demo */}
      <section className="border-y border-zinc-800 bg-zinc-950/50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">Live-priser</h2>
            <p className="text-sm text-zinc-500">Demodata — prisene oppdateres i sanntid under arrangementet</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_DRINKS.map((drink) => (
              <PriceCard key={drink.name} {...drink} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold sm:text-4xl">
            Hvordan fungerer det?
          </h2>

          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-3xl">
                ⚙️
              </div>
              <h3 className="mb-2 text-xl font-semibold">1. Sett opp</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Opprett arrangement, legg til drikke med basispriser og min/max-grenser, 
                og registrer gjester med kort eller QR-kode.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-3xl">
                🍺
              </div>
              <h3 className="mb-2 text-xl font-semibold">2. Selg</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Bartender skanner gjestekort og velger drikke. 
                Prisene oppdateres automatisk basert på etterspørsel.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-3xl">
                📊
              </div>
              <h3 className="mb-2 text-xl font-semibold">3. Gjør opp</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Etter arrangementet ser du hva hver gjest skylder. 
                Eksporter til CSV eller send Vipps-forespørsler.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 bg-zinc-950/30 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold sm:text-4xl">
            Alt du trenger
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "📈", title: "Dynamisk prising", desc: "Step-basert eller kurve-basert algoritme som justerer priser i sanntid" },
              { icon: "📺", title: "TV-visning", desc: "Fullskjerm børs-ticker med animasjoner, grafer og markedshendelser" },
              { icon: "🛒", title: "POS-terminal", desc: "Rask utsjekk med kortskanner, QR-kode eller navnesøk" },
              { icon: "🎉", title: "Markedshendelser", desc: "Happy Hour, Market Crash, Bull Run — gjør det uforutsigbart" },
              { icon: "📱", title: "Mobil prisvisning", desc: "Gjester ser live-priser på mobilen via QR-kode" },
              { icon: "🔒", title: "Flerbruker", desc: "Flere organisasjoner, flere arrangementer, admins og bartendere" },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Klar for børskveld?
          </h2>
          <p className="mb-8 text-zinc-400">
            Sett opp ditt første arrangement på under 10 minutter.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-500 px-8 text-base font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            Kom i gang — det er gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>📈</span> Børsbar — The Stock Market Bar
          </div>
          <p className="text-xs text-zinc-600">
            Laget med ❤️ for det norske studentmiljøet
          </p>
        </div>
      </footer>
    </div>
  );
}
