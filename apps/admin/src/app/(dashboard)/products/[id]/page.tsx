"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type {
    ProductResponse,
    CategoryResponse,
    LocationResponse,
    UpdateProductInput,
} from "@ecommers/types";
import { Spinner, Button } from "@ecommers/ui";
import { ProductForm } from "../../../../components/products/product-form";
import { ArrowLeft } from "lucide-react";

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [product, setProduct] = useState<ProductResponse | null>(null);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [prod, cats, locs] = await Promise.all([
                api.products.getById(id),
                api.categories.list().catch(() => []),
                api.locations.adminList().catch(() => []),
            ]);
            setProduct(prod);
            setCategories(cats || []);
            setLocations(locs || []);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load product details.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const handleSubmit = async (payload: UpdateProductInput) => {
        setIsSubmitting(true);
        setSaveNotice(null);
        setError(null);
        try {
            const updated = await api.products.update(id, payload);
            setProduct(updated as any);
            setSaveNotice("Product updated successfully!");
            setTimeout(() => setSaveNotice(null), 3500);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to update product.");
            }
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.products.delete(id);
            router.push("/products");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to delete product.");
            }
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Spinner size="md" />
                <p className="text-xs">Loading product details...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="py-16 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Product not found or has been deleted.
                </p>
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
            </div>
        );
    }

    return (
        <ProductForm
            mode="edit"
            initialProduct={product}
            categories={categories}
            locations={locations}
            onSubmit={handleSubmit as any}
            isSubmitting={isSubmitting}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            errorMessage={error}
            saveNotice={saveNotice}
        />
    );
}
