import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Børsbar — The Stock Market Bar",
    template: "%s | Børsbar",
  },
  description:
    "Dynamisk prisplattform for arrangementer der drikkeprisene endres i sanntid basert på etterspørsel. Perfekt for studentfester og sosiale arrangementer.",
  keywords: [
    "børsbar",
    "stock market bar",
    "dynamisk prising",
    "studentfest",
    "arrangement",
    "drikkepriser",
    "børskveld",
  ],
  authors: [{ name: "Børsbar" }],
  openGraph: {
    type: "website",
    locale: "nb_NO",
    siteName: "Børsbar",
    title: "Børsbar — The Stock Market Bar",
    description:
      "Dynamisk prisplattform der drikkeprisene endres i sanntid basert på etterspørsel.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Børsbar — The Stock Market Bar",
    description:
      "Dynamisk prisplattform der drikkeprisene endres i sanntid basert på etterspørsel.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
