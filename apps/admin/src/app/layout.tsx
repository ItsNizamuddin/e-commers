import React from "react";
import type { Metadata } from "next";
import { Toaster } from "@ecommers/ui";
import { StoreProvider } from "../store/provider";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
    title: "ecommers Backoffice | Enterprise Administration",
    description: "Enterprise administration portal for ecommers e-commerce platform",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <ThemeProvider>
                    <StoreProvider>
                        {children}
                        <Toaster />
                    </StoreProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
