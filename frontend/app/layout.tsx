import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Kitchenly — AI Grocery Management",
  description:
    "A little less waste. A little more organised. Track your kitchen and plan next month with real consumption data.",
  icons: { icon: "/icon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
