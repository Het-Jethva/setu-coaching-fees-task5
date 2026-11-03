import type { Metadata } from "next";
import "./globals.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-devanagari";

export const metadata: Metadata = {
  title: "Setu · Coaching fees",
  description:
    "A clear view of coaching fees, payments, and student progress. Fictional assignment demo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
