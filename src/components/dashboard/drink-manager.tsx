"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface Drink {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  isActive: boolean;
  sortOrder: number;
}

interface DrinkManagerProps {
  eventId: string;
  drinks: Drink[];
  onUpdate: () => void;
}

const CATEGORIES = [
  { value: "beer", label: "🍺 Beer" },
  { value: "wine", label: "🍷 Wine" },
  { value: "spirits", label: "🥃 Spirits" },
  { value: "cocktail", label: "🍸 Cocktail" },
  { value: "non-alcoholic", label: "🥤 Non-alcoholic" },
  { value: "other", label: "🍹 Other" },
];

export function DrinkManager({ eventId, drinks, onUpdate }: DrinkManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddDrink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const body = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      basePrice: Math.round(Number(formData.get("basePrice")) * 100), // NOK → øre
      minPrice: Math.round(Number(formData.get("minPrice")) * 100),
      maxPrice: Math.round(Number(formData.get("maxPrice")) * 100),
    };

    try {
      const res = await fetch(`/api/events/${eventId}/drinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(typeof data.error === "string" ? data.error : "Failed to add drink");
        return;
      }

      setDialogOpen(false);
      onUpdate();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDrink(drinkId: string) {
    if (!confirm("Remove this drink?")) return;

    try {
      const res = await fetch(`/api/drinks/${drinkId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to delete drink:", error);
    }
  }

  async function handleToggleActive(drink: Drink) {
    try {
      const res = await fetch(`/api/drinks/${drink.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !drink.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to toggle drink:", error);
    }
  }

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Drinks</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Drink</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Drink</DialogTitle>
              <DialogDescription>
                Add a new beverage to this event. Prices in NOK.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDrink} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="drink-name">Name *</Label>
                <Input
                  id="drink-name"
                  name="name"
                  placeholder="Ringnes Pilsner"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drink-category">Category</Label>
                <Select name="category" defaultValue="beer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="drink-basePrice">Base Price (NOK) *</Label>
                  <Input
                    id="drink-basePrice"
                    name="basePrice"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drink-minPrice">Min Price (NOK) *</Label>
                  <Input
                    id="drink-minPrice"
                    name="minPrice"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="30"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Never goes below this
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drink-maxPrice">Max Price (NOK) *</Label>
                  <Input
                    id="drink-maxPrice"
                    name="maxPrice"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="100"
                    required
                  />
                </div>
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
                  {loading ? "Adding..." : "Add Drink"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {drinks.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No drinks yet. Add your first beverage to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Base Price</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drinks.map((drink) => (
                <TableRow key={drink.id}>
                  <TableCell className="font-medium">{drink.name}</TableCell>
                  <TableCell>{categoryLabel(drink.category)}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(drink.basePrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(drink.minPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(drink.maxPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPrice(drink.currentPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={drink.isActive ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(drink)}
                    >
                      {drink.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDrink(drink.id)}
                    >
                      🗑️
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
