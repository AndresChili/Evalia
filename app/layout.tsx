import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Evalia",
    template: "%s · Evalia",
  },
  description: "Convierte tus apuntes en tests de estudio, generados y validados por IA.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Evalia",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
