"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useGetCategoriesQuery,
    useGetAdminLocationsQuery,
    useCreateProductMutation,
} from "../../../../store/api";
import type { CreateProductInput } from "@ecommers/types";
import { Spinner, Button } from "@ecommers/ui";
import { ProductForm } from "../../../../components/products/product-form";
import { PlusCircle, FolderPlus } from "lucide-react";

export default function NewProductPage() {
    const router = useRouter();

    const {
        data: categories = [],
        isLoading: categoriesLoading,
    } = useGetCategoriesQuery();

    const {
        data: locations = [],
        isLoading: locationsLoading,
    } = useGetAdminLocationsQuery();

    const [createProduct, { isLoading: isSubmitting }] = useCreateProductMutation();
    const [error, setError] = useState<string | null>(null);

    const loading = categoriesLoading || locationsLoading;

    const handleSubmit = async (payload: CreateProductInput) => {
        setError(null);
        try {
            await createProduct(payload).unwrap();
            router.push("/products");
        } catch (err: any) {
            let message = "Failed to create product.";
            const apiErr = err?.data || err;
            if (apiErr?.details && typeof apiErr.details === "object") {
                const issues: string[] = [];
                for (const [field, msgs] of Object.entries(apiErr.details as Record<string, unknown>)) {
                    if (Array.isArray(msgs)) {
                        issues.push(`${field}: ${msgs.join(", ")}`);
                    } else if (typeof msgs === "string") {
                        issues.push(`${field}: ${msgs}`);
                    }
                }
                if (issues.length > 0) {
                    message = `Validation Error: ${issues.join(" | ")}`;
                } else if (apiErr.message) {
                    message = apiErr.message;
                }
            } else if (apiErr?.message) {
                message = apiErr.message;
            } else if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
            throw err;
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
