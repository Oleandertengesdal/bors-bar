import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // POS uses a full-screen layout without the dashboard sidebar
  return <>{children}</>;
}
