import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>🎉 Events</CardTitle>
            <CardDescription>Create and manage your bar events</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events">
              <Button variant="outline" className="w-full">
                Manage Events
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📈 Quick Start</CardTitle>
            <CardDescription>
              Create a new event and start selling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events/new">
              <Button className="w-full">Create New Event</Button>
            </Link>
          </CardContent>
        </Card>

        {session?.user?.role === "ADMIN" && (
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Settings</CardTitle>
              <CardDescription>
                Manage organization and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full">
                  Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
