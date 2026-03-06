import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";
import { hash } from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRINKS_MENU = [
  { name: "Pilsner", category: "beer", basePrice: 7500, minPrice: 4000, maxPrice: 12000 },
  { name: "IPA", category: "beer", basePrice: 8500, minPrice: 5000, maxPrice: 14000 },
  { name: "Hveteøl", category: "beer", basePrice: 8000, minPrice: 4500, maxPrice: 13000 },
  { name: "Stout", category: "beer", basePrice: 9000, minPrice: 5000, maxPrice: 15000 },
  { name: "Rødvin", category: "wine", basePrice: 9500, minPrice: 6000, maxPrice: 15000 },
  { name: "Hvitvin", category: "wine", basePrice: 9000, minPrice: 5500, maxPrice: 14000 },
  { name: "Gin & Tonic", category: "cocktail", basePrice: 12000, minPrice: 7000, maxPrice: 18000 },
  { name: "Moscow Mule", category: "cocktail", basePrice: 13000, minPrice: 8000, maxPrice: 19000 },
  { name: "Espresso Martini", category: "cocktail", basePrice: 14000, minPrice: 8000, maxPrice: 20000 },
  { name: "Jägermeister", category: "spirits", basePrice: 8000, minPrice: 4000, maxPrice: 12000 },
  { name: "Aquavit", category: "spirits", basePrice: 7000, minPrice: 3500, maxPrice: 11000 },
  { name: "Brus", category: "non-alcoholic", basePrice: 3500, minPrice: 2000, maxPrice: 6000 },
  { name: "Alkoholfritt Øl", category: "non-alcoholic", basePrice: 5000, minPrice: 3000, maxPrice: 8000 },
  { name: "Vann", category: "non-alcoholic", basePrice: 0, minPrice: 0, maxPrice: 0 },
];

const GUEST_NAMES = [
  "Ola Nordmann",
  "Kari Hansen",
  "Per Olsen",
  "Ingrid Berg",
  "Lars Johansen",
  "Sofie Larsen",
  "Erik Pedersen",
  "Marte Nilsen",
  "Anders Kristiansen",
  "Hanna Andersen",
  "Jonas Eriksen",
  "Nora Bakke",
  "Magnus Haugen",
  "Emilie Svendsen",
  "Thomas Dahl",
];

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateQrToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join("");
}

async function main() {
  console.log("🌱 Seeding Børsbar database...\n");

  // Clean existing data
  await prisma.marketEvent.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.drink.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log("  🧹 Cleared existing data");

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: "Samfundet",
      slug: "samfundet",
      settings: {
        currency: "NOK",
        defaultPricingMode: "STEP_BASED",
        defaultUpdateInterval: 30,
      },
    },
  });
  console.log(`  🏢 Created org: ${org.name}`);

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@borsbar.no",
      hashedPassword: adminPassword,
      name: "Admin",
      role: "ADMIN",
      organizationId: org.id,
    },
  });
  console.log(`  👤 Created admin: ${admin.email} (password: admin123)`);

  // Create staff user
  const staffPassword = await hash("staff123", 12);
  const staff = await prisma.user.create({
    data: {
      email: "bartender@borsbar.no",
      hashedPassword: staffPassword,
      name: "Bartender",
      role: "STAFF",
      organizationId: org.id,
    },
  });
  console.log(`  👤 Created staff: ${staff.email} (password: staff123)`);

  // Create a demo event
  const event = await prisma.event.create({
    data: {
      name: "Oktoberfest 2025",
      description:
        "Annual stock market bar event. Drink prices fluctuate based on demand!",
      status: "DRAFT",
      pricingMode: "STEP_BASED",
      pricingConfig: {
        stepSize: 500, // 5 kr steps
        salesThreshold: 3, // 3 sales to trigger price increase
        decreaseOnIdle: true,
        idleThresholdSeconds: 120,
      },
      organizationId: org.id,
      startsAt: new Date("2025-10-04T18:00:00"),
      endsAt: new Date("2025-10-04T23:59:59"),
    },
  });
  console.log(`  🎉 Created event: ${event.name}`);

  // Create drinks
  const drinks = await Promise.all(
    DRINKS_MENU.map((drink, index) =>
      prisma.drink.create({
        data: {
          ...drink,
          currentPrice: drink.basePrice,
          sortOrder: index,
          isActive: true,
          eventId: event.id,
        },
      })
    )
  );
  console.log(`  🍺 Created ${drinks.length} drinks`);

  // Create guests with auto-generated PINs and QR tokens
  const usedPins = new Set<string>();
  const guests = await Promise.all(
    GUEST_NAMES.map((name, index) => {
      let pin: string;
      do {
        pin = generatePin();
      } while (usedPins.has(pin));
      usedPins.add(pin);

      return prisma.guest.create({
        data: {
          name,
          cardId: String(10000 + index),
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@ntnu.no`,
          pin,
          qrCode: generateQrToken(),
          eventId: event.id,
        },
      });
    })
  );
  console.log(`  🎫 Created ${guests.length} guests`);

  // Create a second event (upcoming)
  const event2 = await prisma.event.create({
    data: {
      name: "Julebord 2025",
      description: "Holiday market bar event with festive drinks",
      status: "DRAFT",
      pricingMode: "CURVE_BASED",
      pricingConfig: {
        elasticity: 0.3,
        dampening: 0.85,
      },
      organizationId: org.id,
      startsAt: new Date("2025-12-13T19:00:00"),
      endsAt: new Date("2025-12-14T01:00:00"),
    },
  });
  console.log(`  🎉 Created event: ${event2.name}`);

  // Some drinks for event 2
  const holidayDrinks = [
    { name: "Gløgg", category: "other", basePrice: 6000, minPrice: 3000, maxPrice: 10000 },
    { name: "Juleøl", category: "beer", basePrice: 8500, minPrice: 5000, maxPrice: 14000 },
    { name: "Hot Toddy", category: "cocktail", basePrice: 11000, minPrice: 6000, maxPrice: 16000 },
  ];

  await Promise.all(
    holidayDrinks.map((drink, index) =>
      prisma.drink.create({
        data: {
          ...drink,
          currentPrice: drink.basePrice,
          sortOrder: index,
          isActive: true,
          eventId: event2.id,
        },
      })
    )
  );
  console.log(`  🍺 Created ${holidayDrinks.length} drinks for ${event2.name}`);

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin:  admin@borsbar.no / admin123");
  console.log("  Staff:  bartender@borsbar.no / staff123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
