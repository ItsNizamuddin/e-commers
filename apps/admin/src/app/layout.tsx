import React from "react";
import type { Metadata } from "next";
import { StoreProvider } from "../store/provider";
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
                <StoreProvider>{children}</StoreProvider>
            </body>
        </html>
    );
}
