import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "../store/provider";
import { AnnouncementBar } from "../components/layout/AnnouncementBar";
import { AppHeader } from "../components/layout/AppHeader";
import { AppFooter } from "../components/layout/AppFooter";
import { CartDrawer } from "../components/cart/CartDrawer";
import { Toaster } from "@ecommers/ui";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "ECOMMERS — 100% Traceable Farm-to-Fork Organic Foods",
    description: "Direct farm-to-table artisanal flours, cold-pressed oils, and pure preserves with end-to-end batch traceability and lab-certified quality.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 selection:bg-emerald-500 selection:text-white">
                <StoreProvider>
                    <AnnouncementBar />
                    <AppHeader />
                    <main className="flex-1">{children}</main>
                    <CartDrawer />
                    <AppFooter />
                    <Toaster position="top-right" />
                </StoreProvider>
            </body>
        </html>
    );
}
