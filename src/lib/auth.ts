import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          console.log("[auth] Missing email or password");
          return null;
        }

        console.log("[auth] Looking up user:", email);

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
          });

          if (!user) {
            console.log("[auth] User not found in database");
            return null;
          }

          console.log("[auth] User found:", user.email, "role:", user.role);

          const isPasswordValid = await compare(password, user.hashedPassword);

          console.log("[auth] bcrypt compare result:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[auth] Invalid password");
            return null;
          }

          console.log("[auth] Login successful for", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
          };
        } catch (error) {
          console.error("[auth] Database error:", error);
          return null;
        }
      },
    }),
  ],
});
