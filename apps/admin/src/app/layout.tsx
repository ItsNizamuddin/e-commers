import React, { Suspense } from "react";
import type { Metadata } from "next";
import { StoreProvider } from "../store/provider";
import { NavigationProgress } from "../components/navigation-progress";
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
                <StoreProvider>
                    <Suspense fallback={null}>
                        <NavigationProgress />
                    </Suspense>
                    {children}
                </StoreProvider>
            </body>
        </html>
    );
}
