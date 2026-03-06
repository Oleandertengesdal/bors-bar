import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";
import { compare, hash } from "bcryptjs";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  const user = await prisma.user.findUnique({ where: { email: "admin@borsbar.no" } });
  console.log("User found:", !!user);
  console.log("Hash stored:", user?.hashedPassword);
  console.log("Hash length:", user?.hashedPassword?.length);
  
  if (user) {
    const match = await compare("admin123", user.hashedPassword);
    console.log("Password 'admin123' matches:", match);
    
    if (!match) {
      console.log("\nRe-hashing and updating password...");
      const newHash = await hash("admin123", 12);
      await prisma.user.update({
        where: { email: "admin@borsbar.no" },
        data: { hashedPassword: newHash },
      });
      console.log("New hash:", newHash);
      
      // Also fix staff user
      const staffHash = await hash("staff123", 12);
      await prisma.user.update({
        where: { email: "bartender@borsbar.no" },
        data: { hashedPassword: staffHash },
      });
      console.log("Both passwords updated!");
      
      // Verify
      const updated = await prisma.user.findUnique({ where: { email: "admin@borsbar.no" } });
      const verifyMatch = await compare("admin123", updated!.hashedPassword);
      console.log("Verification - password matches:", verifyMatch);
    }
  }
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
