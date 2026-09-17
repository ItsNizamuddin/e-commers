"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    useGetCategoryByIdQuery,
    useGetCategoriesQuery,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
} from "../../../../store/api";
import type { CreateCategoryInput, UpdateCategoryInput } from "@ecommers/types";
import { Spinner, ErrorState, toast } from "@ecommers/ui";
import { CategoryForm } from "../../../../components/categories/category-form";

export default function EditCategoryPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const {
        data: category,
        isLoading: isLoadingCategory,
        error: categoryError,
        refetch: refetchCategory,
    } = useGetCategoryByIdQuery(id, { skip: !id });

    const {
        data: categories = [],
        isLoading: isLoadingCategories,
    } = useGetCategoriesQuery();

    const [updateCategory, { isLoading: isSaving }] = useUpdateCategoryMutation();
    const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleUpdate = async (payload: CreateCategoryInput | UpdateCategoryInput) => {
        setErrorMessage(null);
        setSaveNotice(null);
        try {
            await updateCategory({ id, body: payload as UpdateCategoryInput }).unwrap();
            setSaveNotice("Category details and SEO settings saved successfully.");
            toast.success("Category details and SEO settings saved successfully.");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save category changes.";
            setErrorMessage(msg);
            toast.error(msg);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteCategory(id).unwrap();
            toast.success("Category deleted successfully.");
            router.push("/categories");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to delete category.";
            toast.error(msg);
        }
    };

    if (isLoadingCategory) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Spinner size="lg" className="text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Loading category taxonomy & SEO settings...
                </p>
            </div>
        );
    }

    if (categoryError || !category) {
        return (
            <div className="py-8">
                <ErrorState
                    title="Category Not Found"
                    message={
                        categoryError
                            ? typeof categoryError === "string"
                                ? categoryError
                                : "Could not retrieve the requested category."
                            : "Could not retrieve the requested category."
                    }
                    onRetry={() => refetchCategory()}
                />
            </div>
        );
    }

    return (
        <CategoryForm
            mode="edit"
            category={category}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            onSubmit={handleUpdate}
            isSubmitting={isSaving}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            saveNotice={saveNotice}
            errorMessage={errorMessage}
        />
    );
}
