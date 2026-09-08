"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../../lib/api";
import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput } from "@ecommers/types";
import { CategoryForm } from "../../../../components/categories/category-form";
import { Spinner } from "@ecommers/ui";

function CreateCategoryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultParentId = searchParams.get("parentId") || undefined;

    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchCategories() {
            try {
                const list = await api.categories.list();
                if (isMounted) setCategories(list || []);
            } catch {
                // Non-blocking fallback
            } finally {
                if (isMounted) setIsLoadingCategories(false);
            }
        }
        fetchCategories();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleCreate = async (payload: CreateCategoryInput | UpdateCategoryInput) => {
        setErrorMessage(null);
        setIsSubmitting(true);
        try {
            await api.categories.create(payload as CreateCategoryInput);
            router.push("/categories");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMessage(err.message);
            } else {
                setErrorMessage("Failed to create category. Please check your inputs.");
            }
        } finally {
            setIsSubmitting(false);
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
