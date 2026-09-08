"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput } from "@ecommers/types";
import { Spinner, ErrorState, toast } from "@ecommers/ui";
import { CategoryForm } from "../../../../components/categories/category-form";

export default function EditCategoryPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [category, setCategory] = useState<CategoryResponse | null>(null);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [cat, allCats] = await Promise.all([
                api.categories.getById(id),
                api.categories.list().catch(() => []),
            ]);
            setCategory(cat);
            setCategories(allCats || []);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load category details.");
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

    const handleUpdate = async (payload: CreateCategoryInput | UpdateCategoryInput) => {
        setErrorMessage(null);
        setSaveNotice(null);
        setIsSaving(true);
        try {
            const updated = await api.categories.update(id, payload as UpdateCategoryInput);
            setCategory(updated);
            toast.success("Category details and SEO settings saved successfully.");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save category changes.";
            setErrorMessage(msg);
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Spinner size="lg" className="text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Loading category taxonomy & SEO settings...
                </p>
            </div>
        );
    }

    if (error || !category) {
        return (
            <div className="py-8">
                <ErrorState
                    title="Category Not Found"
                    message={error || "Could not retrieve the requested category."}
                    onRetry={loadData}
                />
            </div>
        );
    }

    return (
        <CategoryForm
            mode="edit"
            category={category}
            categories={categories}
            onSubmit={handleUpdate}
            isSubmitting={isSaving}
            saveNotice={saveNotice}
            errorMessage={errorMessage}
        />
    );
}
