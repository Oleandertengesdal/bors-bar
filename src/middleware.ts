import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export async function middleware(request: import("next/server").NextRequest) {
  return auth(request as any, {} as any);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
