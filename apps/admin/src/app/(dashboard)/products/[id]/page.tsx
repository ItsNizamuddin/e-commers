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
    Select,
    Textarea,
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
    const [storageInstructions, setStorageInstructions] = useState("");
    const [allergens, setAllergens] = useState("");
    const [tags, setTags] = useState<string[]>([]);

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
            setStorageInstructions(prod.storageInstructions || "");
            setAllergens((prod.allergens || []).join(", "));
            setTags(prod.tags || []);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load food item.");
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
            const allergenList = allergens
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean);

            await api.products.update(id, {
                title: title.trim(),
                brand: brand.trim() || undefined,
                description: description.trim() || undefined,
                categoryId: categoryId || undefined,
                status,
                storageInstructions: storageInstructions.trim() || undefined,
                allergens: allergenList.length > 0 ? allergenList : undefined,
                tags,
            });
            setSaveNotice("Food item updated successfully.");
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
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Spinner size="lg" className="text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading product configuration...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="py-8">
                <ErrorState
                    title="Product not found"
                    message={error || "Could not retrieve the requested product."}
                    onRetry={loadData}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Navigation & Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/products")}
                    className="gap-1.5"
                >
                    <ArrowLeft size={13} />
                    <span>Back to Products</span>
                </Button>

                <div className="flex items-center gap-2">
                    {status !== "PUBLISHED" && (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handlePublish}
                            isLoading={isPublishing}
                            disabled={isPublishing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                            <Globe size={13} />
                            <span>Publish to Store</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setIsDeleteOpen(true)}
                        className="gap-1.5"
                    >
                        <Trash2 size={13} />
                        <span>Delete</span>
                    </Button>
                </div>
            </div>

            {saveNotice && (
                <div className="flex items-center gap-2 p-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    <CheckCircle2 size={15} />
                    <span>{saveNotice}</span>
                </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSave} className="flex flex-col gap-4">
                <Card className="p-3.5 sm:p-4">
                    <div className="flex items-center justify-between mb-3.5">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Package size={15} className="text-blue-600 dark:text-blue-400" />
                            <span>Product Details</span>
                        </h2>
                        <Badge variant={status === "PUBLISHED" ? "success" : "warning"} size="sm">
                            {status}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                disabled={isSaving}
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </FormField>

                        <FormField label="Status">
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                disabled={isSaving}
                            >
                                <option value="PUBLISHED">PUBLISHED</option>
                                <option value="DRAFT">DRAFT</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </Select>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField label="Storage Instructions & Shelf-Life">
                            <Input
                                value={storageInstructions}
                                onChange={(e) => setStorageInstructions(e.target.value)}
                                placeholder="e.g. Keep refrigerated below 4°C."
                                disabled={isSaving}
                            />
                        </FormField>

                        <FormField label="Allergens (Comma separated)">
                            <Input
                                value={allergens}
                                onChange={(e) => setAllergens(e.target.value)}
                                placeholder="e.g. Milk, Tree Nuts, Gluten"
                                disabled={isSaving}
                            />
                        </FormField>
                    </div>

                    <div className="mt-4">
                        <FormField label="Culinary Description">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                disabled={isSaving}
                            />
                        </FormField>
                    </div>
                </Card>

                {/* Variants Card */}
                <Card className="p-3.5 sm:p-4">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                        <Layers size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Variants ({product.variants?.length || 0})</span>
                    </h2>

                    <div className="flex flex-col gap-2">
                        {(product.variants || []).map((v, i) => (
                            <div
                                key={v.id || i}
                                className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 px-3.5 bg-slate-50/80 dark:bg-neutral-800/40 border border-slate-200/80 dark:border-neutral-800 rounded-lg"
                            >
                                <div>
                                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{v.title || "Default"}</div>
                                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">SKU: {v.sku}</div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    {(v.prices || []).map((pr) => (
                                        <Badge key={pr.currency} variant="neutral" size="sm">
                                            {pr.currency === "INR" ? `₹${pr.amount.toFixed(2)}` : pr.currency === "USD" ? `$${pr.amount.toFixed(2)}` : `${pr.currency} ${pr.amount.toFixed(2)}`}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Save Bar */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSaving}
                        disabled={isSaving}
                        className="min-w-[130px] gap-1.5"
                    >
                        <Save size={14} />
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
