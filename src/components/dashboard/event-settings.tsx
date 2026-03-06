"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface EventSettingsProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    pricingMode: string;
    pricingConfig: Record<string, unknown>;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
  };
  onUpdate: () => void;
}

export function EventSettings({ event, onUpdate }: EventSettingsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    const priceUpdateInterval = parseInt(formData.get("priceUpdateInterval") as string) || 30;
    const demandDecayFactor = parseFloat(formData.get("demandDecayFactor") as string) || 0.9;

    const body: Record<string, unknown> = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      pricingMode: formData.get("pricingMode") as string,
      pricingConfig: {
        ...event.pricingConfig,
        priceUpdateInterval,
        demandDecayFactor,
      },
    };

    const start = formData.get("scheduledStart") as string;
    const end = formData.get("scheduledEnd") as string;
    if (start) body.startsAt = new Date(start).toISOString();
    if (end) body.endsAt = new Date(end).toISOString();

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(typeof data.error === "string" ? data.error : "Failed to update event");
        return;
      }

      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEvent() {
    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    )
      return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        router.push("/dashboard/events");
      } else {
        alert(typeof data.error === "string" ? data.error : "Failed to delete event");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setDeleteLoading(false);
    }
  }

  function formatDateForInput(dateStr: string | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        <h2 className="text-xl font-semibold">Event Settings</h2>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Settings saved successfully!
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              name="name"
              defaultValue={event.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-pricing">Pricing Mode</Label>
            <Select name="pricingMode" defaultValue={event.pricingMode}>
              <SelectTrigger id="event-pricing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STEP_BASED">Step-Based</SelectItem>
                <SelectItem value="CURVE_BASED">Curve-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-desc">Description</Label>
          <Textarea
            id="event-desc"
            name="description"
            defaultValue={event.description || ""}
            rows={3}
          />
        </div>

        <Separator />

        <h3 className="text-lg font-medium">Pricing Configuration</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price-interval">Price Update Interval (seconds)</Label>
            <Input
              id="price-interval"
              name="priceUpdateInterval"
              type="number"
              min={5}
              max={300}
              defaultValue={(event.pricingConfig?.priceUpdateInterval as number) ?? 30}
            />
            <p className="text-xs text-muted-foreground">
              How often prices recalculate (5–300 seconds)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decay-factor">Demand Decay Factor</Label>
            <Input
              id="decay-factor"
              name="demandDecayFactor"
              type="number"
              step={0.05}
              min={0}
              max={1}
              defaultValue={(event.pricingConfig?.demandDecayFactor as number) ?? 0.9}
            />
            <p className="text-xs text-muted-foreground">
              Rate at which past demand fades (0 = instant, 1 = never)
            </p>
          </div>
        </div>

        <Separator />

        <h3 className="text-lg font-medium">Schedule</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sched-start">Scheduled Start</Label>
            <Input
              id="sched-start"
              name="scheduledStart"
              type="datetime-local"
              defaultValue={formatDateForInput(event.startsAt)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-end">Scheduled End</Label>
            <Input
              id="sched-end"
              name="scheduledEnd"
              type="datetime-local"
              defaultValue={formatDateForInput(event.endsAt)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>

      <Separator />

      {/* Danger zone */}
      <div className="rounded-md border border-destructive/50 p-4 space-y-3">
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          Deleting this event will permanently remove all associated drinks,
          guests, sales, and price history. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleDeleteEvent}
          disabled={deleteLoading || event.status === "ACTIVE"}
        >
          {deleteLoading ? "Deleting..." : "Delete Event"}
        </Button>
        {event.status === "ACTIVE" && (
          <p className="text-xs text-muted-foreground">
            Cannot delete an active event. Pause or complete it first.
          </p>
        )}
      </div>
    </div>
  );
}
