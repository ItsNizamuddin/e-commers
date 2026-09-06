"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type { CategoryResponse } from "@ecommers/types";
import {
    Card,
    Button,
    Input,
    FormField,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Package,
    Plus,
    DollarSign,
    Layers,
} from "lucide-react";

export default function NewProductPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    // Form fields
    const [title, setTitle] = useState("");
    const [brand, setBrand] = useState("ecommers");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");

    // Variant fields
    const [sku, setSku] = useState("");
    const [variantTitle, setVariantTitle] = useState("Default");
    const [priceUsd, setPriceUsd] = useState("49.99");
    const [priceEur, setPriceEur] = useState("45.99");
    const [priceGbp, setPriceGbp] = useState("39.99");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        api.categories.list().then((res) => {
            setCategories(res || []);
            if (res && res.length > 0) {
                setCategoryId(res[0].id);
            }
        }).catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!title.trim()) {
            setFormError("Product title is required.");
            return;
        }

        const generatedSku = sku.trim() || `SKU-${Date.now().toString().slice(-6)}`;

        setIsSubmitting(true);
        try {
            await api.products.create({
                title: title.trim(),
                brand: brand.trim() || undefined,
                description: description.trim() || "Quality ecommers product.",
                categoryId: categoryId || (categories[0]?.id || "600000000000000000000001"),
                status,
                variants: [
                    {
                        sku: generatedSku,
                        title: variantTitle.trim() || "Default",
                        prices: [
                            { currency: "USD", amount: parseFloat(priceUsd) || 49.99 },
                            { currency: "EUR", amount: parseFloat(priceEur) || 45.99 },
                            { currency: "GBP", amount: parseFloat(priceGbp) || 39.99 },
                        ],
                        attributes: {
                            standard: "true",
                        },
                    },
                ],
            });

            router.push("/products");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setFormError(err.message);
            } else {
                setFormError("Failed to create product.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Navigation & Header */}
            <div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/products")}
                    style={{ borderRadius: "8px", gap: "0.375rem", marginBottom: "1rem" }}
                >
                    <ArrowLeft size={14} />
                    <span>Back to Catalog</span>
                </Button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                        style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#eff6ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#2563eb",
                        }}
                    >
                        <Plus size={18} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Create Product
                        </h1>
                        <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "2px" }}>
                            Configure catalog properties, categories, and currency pricing.
                        </p>
                    </div>
                </div>
            </div>

            {formError && (
                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "0.875rem" }}>
                    {formError}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* General Info Card */}
                <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Package size={18} color="#2563eb" />
                        <span>General Information</span>
                    </h2>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                        <FormField label="Product Title" required>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Modern Ergonomic Wireless Headphones"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Brand Name">
                            <Input
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                placeholder="e.g. ecommers"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Primary Category" required>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                disabled={isSubmitting}
                                style={{
                                    width: "100%",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    backgroundColor: "#f8fafc",
                                    fontSize: "0.8125rem",
                                    color: "#0f172a",
                                    outline: "none",
                                }}
                            >
                                {categories.length === 0 ? (
                                    <option value="">No categories found</option>
                                ) : (
                                    categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </FormField>

                        <FormField label="Publication Status" required>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                disabled={isSubmitting}
                                style={{
                                    width: "100%",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    backgroundColor: "#f8fafc",
                                    fontSize: "0.8125rem",
                                    color: "#0f172a",
                                    outline: "none",
                                }}
                            >
                                <option value="PUBLISHED">Published (Available in Storefront)</option>
                                <option value="DRAFT">Draft (Backoffice only)</option>
                            </select>
                        </FormField>
                    </div>

                    <div style={{ marginTop: "1.25rem" }}>
                        <FormField label="Description">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detailed overview of materials, specifications, and warranty..."
                                rows={3}
                                disabled={isSubmitting}
                                style={{
                                    width: "100%",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    backgroundColor: "#f8fafc",
                                    fontSize: "0.8125rem",
                                    color: "#0f172a",
                                    outline: "none",
                                    fontFamily: "inherit",
                                }}
                            />
                        </FormField>
                    </div>
                </Card>

                {/* Initial Variant & Pricing Card */}
                <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Layers size={18} color="#2563eb" />
                        <span>Default Variant & Multi-Currency Pricing</span>
                    </h2>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
                        <FormField label="SKU (Leave blank to auto-generate)">
                            <Input
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="e.g. HEADPH-BLK-01"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Variant Name">
                            <Input
                                value={variantTitle}
                                onChange={(e) => setVariantTitle(e.target.value)}
                                placeholder="e.g. Standard / Matte Black"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Price (USD $)" required>
                            <Input
                                type="number"
                                step="0.01"
                                value={priceUsd}
                                onChange={(e) => setPriceUsd(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Price (EUR €)" required>
                            <Input
                                type="number"
                                step="0.01"
                                value={priceEur}
                                onChange={(e) => setPriceEur(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Price (GBP £)" required>
                            <Input
                                type="number"
                                step="0.01"
                                value={priceGbp}
                                onChange={(e) => setPriceGbp(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </FormField>
                    </div>
                </Card>

                {/* Submit Bar */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push("/products")}
                        disabled={isSubmitting}
                        style={{ borderRadius: "8px" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                        style={{ backgroundColor: "#2563eb", borderRadius: "8px", minWidth: "140px" }}
                    >
                        Create Product
                    </Button>
                </div>
            </form>
        </div>
    );
}
