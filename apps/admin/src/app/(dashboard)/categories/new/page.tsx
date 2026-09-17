"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    useGetCategoriesQuery,
    useCreateCategoryMutation,
} from "../../../../store/api";
import type { CreateCategoryInput, UpdateCategoryInput } from "@ecommers/types";
import { CategoryForm } from "../../../../components/categories/category-form";
import { Spinner, toast } from "@ecommers/ui";

function CreateCategoryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultParentId = searchParams.get("parentId") || undefined;

    const {
        data: categories = [],
        isLoading: isLoadingCategories,
    } = useGetCategoriesQuery();

    const [createCategory, { isLoading: isSubmitting }] = useCreateCategoryMutation();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleCreate = async (payload: CreateCategoryInput | UpdateCategoryInput) => {
        setErrorMessage(null);
        try {
            await createCategory(payload as CreateCategoryInput).unwrap();
            toast.success("Category created successfully.");
            router.push("/categories");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMessage(err.message);
            } else {
                setErrorMessage("Failed to create category. Please check your inputs.");
            }
        }
    };

    return (
        <CategoryForm
            key={defaultParentId || "new-category"}
            mode="create"
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            defaultParentId={defaultParentId}
        />
    );
}

export default function CreateCategoryPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-20">
                    <Spinner size="md" />
                </div>
            }
        >
            <CreateCategoryContent />
        </Suspense>
    );
}
