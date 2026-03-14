import type { Metadata, Viewport } from "next";
import { NavigationPixie } from "@/components/NavigationPixie";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serrian Tide Rebuild",
  description: "Parallel rebuild workspace for Serrian Tide.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="theme-void">
      <body>
        {children}
        <NavigationPixie />
      </body>
    </html>
  );
}
