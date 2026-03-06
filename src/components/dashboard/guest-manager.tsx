"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Guest {
  id: string;
  name: string;
  cardId: string | null;
  email: string | null;
  pin: string | null;
}

interface GuestManagerProps {
  eventId: string;
  guests: Guest[];
  onUpdate: () => void;
}

export function GuestManager({ eventId, guests, onUpdate }: GuestManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function handleAddGuest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const body = {
      name: formData.get("name") as string,
      cardId: (formData.get("cardId") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
    };

    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(typeof data.error === "string" ? data.error : "Failed to add guest");
        return;
      }

      setDialogOpen(false);
      (e.target as HTMLFormElement).reset();
      onUpdate();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const csvText = formData.get("csv") as string;

    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let successCount = 0;
    const errors: string[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0];
      const cardId = parts[1] || undefined;
      const email = parts[2] || undefined;

      if (!name) continue;

      try {
        const res = await fetch(`/api/events/${eventId}/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, cardId, email }),
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          errors.push(`${name}: ${typeof data.error === "string" ? data.error : "failed"}`);
        }
      } catch {
        errors.push(`${name}: network error`);
      }
    }

    if (errors.length > 0) {
      setError(
        `Added ${successCount} guests. Errors: ${errors.join("; ")}`
      );
    } else {
      setBulkDialogOpen(false);
    }

    onUpdate();
    setLoading(false);
  }

  async function handleDeleteGuest(guestId: string) {
    if (!confirm("Remove this guest?")) return;

    try {
      const res = await fetch(`/api/guests/${guestId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onUpdate();
      } else {
        alert(typeof data.error === "string" ? data.error : "Failed to delete guest");
      }
    } catch (error) {
      console.error("Failed to delete guest:", error);
    }
  }

  const filteredGuests = guests.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.cardId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Guests ({guests.length})</h2>
        <div className="flex gap-2">
          {/* Bulk import dialog */}
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">📋 Bulk Import</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import Guests</DialogTitle>
                <DialogDescription>
                  Paste a CSV list: one guest per line. Format:{" "}
                  <code className="text-xs">Name, CardID, Email</code>
                  <br />
                  Only name is required.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBulkImport} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
                    {error}
                  </div>
                )}
                <textarea
                  name="csv"
                  className="w-full rounded-md border p-3 font-mono text-sm h-48"
                  placeholder={`Ola Nordmann, 12345, ola@ntnu.no\nKari Hansen, 67890\nPer Olsen`}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Importing..." : "Import"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add single guest dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Add Guest</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guest</DialogTitle>
                <DialogDescription>
                  Register a new guest for this event. A PIN and QR code will be
                  auto-generated.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddGuest} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Name *</Label>
                  <Input
                    id="guest-name"
                    name="name"
                    placeholder="Ola Nordmann"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-cardId">Card ID</Label>
                  <Input
                    id="guest-cardId"
                    name="cardId"
                    placeholder="Student card number"
                  />
                  <p className="text-xs text-muted-foreground">
                    Samfundet card / student card number for scanner
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">Email</Label>
                  <Input
                    id="guest-email"
                    name="email"
                    type="email"
                    placeholder="ola@ntnu.no"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Adding..." : "Add Guest"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      {guests.length > 0 && (
        <Input
          placeholder="Search guests by name, card ID, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      )}

      {guests.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No guests registered yet. Add guests manually or use bulk import.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Card ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">{guest.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {guest.cardId || "—"}
                  </TableCell>
                  <TableCell>{guest.email || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {guest.pin || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGuest(guest.id)}
                    >
                      🗑️
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredGuests.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No guests match your search
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
