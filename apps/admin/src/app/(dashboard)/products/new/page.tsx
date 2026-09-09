"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type { CategoryResponse, LocationResponse, CreateProductInput } from "@ecommers/types";
import { Spinner, Button } from "@ecommers/ui";
import { ProductForm } from "../../../../components/products/product-form";
import { PlusCircle, FolderPlus } from "lucide-react";

export default function NewProductPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.categories.list().catch(() => []),
            api.locations.adminList().catch(() => []),
        ])
            .then(([cats, locs]) => {
                setCategories(cats || []);
                setLocations(locs || []);
            })
            .catch((err) => {
                console.error("Failed to load initial form data", err);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (payload: CreateProductInput) => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.products.create(payload);
            router.push("/products");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to create product.");
            }
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Spinner size="md" />
                <p className="text-xs">Initializing product editor...</p>
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
                <div>
                    <h3 className="text-xs font-bold">No Categories Found</h3>
                    <p className="text-[11px] mt-0.5">
                        You need at least one category before adding products to your catalog.
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => router.push("/categories?action=new")}
                    className="gap-1.5 shrink-0 text-xs"
                >
                    <FolderPlus size={13} />
                    <span>Create Category First</span>
                </Button>
            </div>
        );
    }

    return (
        <ProductForm
            mode="create"
            categories={categories}
            locations={locations}
            onSubmit={handleSubmit as any}
            isSubmitting={isSubmitting}
            errorMessage={error}
        />
    );
}
