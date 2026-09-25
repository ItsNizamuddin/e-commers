/**
 * Currency and text formatting utilities for Ecommers Storefront
 */

export function formatCurrency(
    amount: number | undefined | null,
    currency: string = "INR",
    isMinorUnit: boolean = false
): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return "₹0.00";
    }

    const value = isMinorUnit ? amount / 100 : amount;

    try {
        return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency: currency || "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
}

export function formatDate(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return "N/A";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}
