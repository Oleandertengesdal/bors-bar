import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventList } from "@/components/dashboard/event-list";

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage your børsbar events
          </p>
        </div>
      </div>
      <EventList />
    </div>
  );
}
