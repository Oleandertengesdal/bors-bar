export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded bg-muted" />
          <div className="h-10 w-24 rounded bg-muted" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="h-4 w-20 rounded bg-muted mb-2" />
            <div className="h-8 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="h-10 w-64 rounded bg-muted" />

      {/* Content skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
