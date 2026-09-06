"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type { ProductResponse, CategoryResponse } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    FormField,
    Spinner,
    ErrorState,
    ConfirmDialog,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Package,
    Save,
    Trash2,
    CheckCircle2,
    Layers,
    Globe,
} from "lucide-react";

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [product, setProduct] = useState<ProductResponse | null>(null);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [title, setTitle] = useState("");
    const [brand, setBrand] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("PUBLISHED");

    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [prod, cats] = await Promise.all([
                api.products.getById(id),
                api.categories.list().catch(() => []),
            ]);
            setProduct(prod);
            setCategories(cats || []);

            setTitle(prod.title);
            setBrand(prod.brand || "");
            setDescription(prod.description || "");
            setCategoryId(prod.categoryId || "");
            setStatus(prod.status as any);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load product.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveNotice(null);
        try {
            await api.products.update(id, {
                title: title.trim(),
                brand: brand.trim() || undefined,
                description: description.trim() || undefined,
                categoryId: categoryId || undefined,
                status,
            });
            setSaveNotice("Product updated successfully.");
            setTimeout(() => setSaveNotice(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Update failed: ${err.message}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const updated = await api.products.publish(id);
            setProduct(updated);
            setStatus("PUBLISHED");
            setSaveNotice("Product published to storefront.");
            setTimeout(() => setSaveNotice(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Publishing failed: ${err.message}`);
            }
        } finally {
            setIsPublishing(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.products.delete(id);
            router.push("/products");
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Delete failed: ${err.message}`);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6rem 0", gap: "1rem" }}>
                <Spinner size="lg" />
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading product configuration...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div style={{ padding: "2rem 0" }}>
                <ErrorState
                    title="Product not found"
                    message={error || "Could not retrieve the requested product."}
                    onRetry={loadData}
                />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Navigation & Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/products")}
                    style={{ borderRadius: "8px", gap: "0.375rem" }}
                >
                    <ArrowLeft size={14} />
                    <span>Back to Products</span>
                </Button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {status !== "PUBLISHED" && (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handlePublish}
                            isLoading={isPublishing}
                            disabled={isPublishing}
                            style={{ backgroundColor: "#10b981", borderRadius: "8px" }}
                        >
                            <Globe size={14} />
                            <span>Publish to Store</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setIsDeleteOpen(true)}
                        style={{ borderRadius: "8px" }}
                    >
                        <Trash2 size={14} />
                        <span>Delete</span>
                    </Button>
                </div>
            </div>

            {saveNotice && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.875rem" }}>
                    <CheckCircle2 size={16} />
                    <span>{saveNotice}</span>
                </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Package size={18} color="#2563eb" />
                            <span>Product Details</span>
                        </h2>
                        <Badge variant={status === "PUBLISHED" ? "success" : "warning"} size="sm">
                            {status}
                        </Badge>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                        <FormField label="Title" required>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isSaving}
                            />
                        </FormField>

                        <FormField label="Brand">
                            <Input
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                disabled={isSaving}
                            />
                        </FormField>

                        <FormField label="Category">
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                disabled={isSaving}
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
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Status">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                disabled={isSaving}
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
                                <option value="PUBLISHED">PUBLISHED</option>
                                <option value="DRAFT">DRAFT</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                        </FormField>
                    </div>

                    <div style={{ marginTop: "1.25rem" }}>
                        <FormField label="Description">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                disabled={isSaving}
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

                {/* Variants Card */}
                <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Layers size={18} color="#2563eb" />
                        <span>Variants ({product.variants?.length || 0})</span>
                    </h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {(product.variants || []).map((v, i) => (
                            <div key={v.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>{v.title || "Default"}</div>
                                    <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>SKU: {v.sku}</div>
                                </div>
                                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                    {(v.prices || []).map((pr) => (
                                        <Badge key={pr.currency} variant="neutral" size="sm">
                                            {pr.currency} ${pr.amount.toFixed(2)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Save Bar */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSaving}
                        disabled={isSaving}
                        style={{ backgroundColor: "#2563eb", borderRadius: "8px", minWidth: "140px", gap: "0.375rem" }}
                    >
                        <Save size={15} />
                        <span>Save Changes</span>
                    </Button>
                </div>
            </form>

            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => !isDeleting && setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Delete Product"
                description="Are you sure you want to delete this product? This action cannot be undone."
                confirmLabel={isDeleting ? "Deleting..." : "Delete Permanently"}
                variant="danger"
            />
        </div>
    );
}
