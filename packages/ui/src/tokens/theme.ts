/**
 * Canonical ecommers Enterprise Design Tokens
 * Central source of truth for colors, typography, spacing, shadows, and radii.
 */
export const theme = {
    colors: {
        primary: {
            50: "#eff6ff",
            100: "#dbeafe",
            200: "#bfdbfe",
            300: "#93c5fd",
            400: "#60a5fa",
            500: "#3b82f6",
            600: "#2563eb",
            700: "#1d4ed8",
            800: "#1e40af",
            900: "#1e3a8a",
        },
        neutral: {
            50: "#f8fafc",
            100: "#f1f5f9",
            200: "#e2e8f0",
            300: "#cbd5e1",
            400: "#94a3b8",
            500: "#64748b",
            600: "#475569",
            700: "#334155",
            800: "#1e293b",
            900: "#0f172a",
        },
        surface: "#ffffff",
        appBg: "#f8fafc",
        subtleBg: "#f1f5f9",
        border: "#e2e8f0",
        borderStrong: "#cbd5e1",
        textPrimary: "#0f172a",
        textSecondary: "#334155",
        textMuted: "#64748b",
        textSubtle: "#94a3b8",
        success: {
            text: "#059669",
            bg: "#ecfdf5",
            border: "#a7f3d0",
        },
        warning: {
            text: "#d97706",
            bg: "#fffbeb",
            border: "#fde68a",
        },
        danger: {
            text: "#dc2626",
            bg: "#fef2f2",
            border: "#fecaca",
        },
        info: {
            text: "#0284c7",
            bg: "#f0f9ff",
            border: "#bae6fd",
        },
    },
    radii: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
    },
    shadows: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        card: "0 20px 40px -15px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(226, 232, 240, 0.8)",
    },
    transitions: {
        default: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    },
} as const;

export type ThemeTokens = typeof theme;
