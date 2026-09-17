"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    useGetProductByIdQuery,
    useGetCategoriesQuery,
    useGetAdminLocationsQuery,
    useUpdateProductMutation,
    useDeleteProductMutation,
} from "../../../../store/api";
import type {
    ProductResponse,
    UpdateProductInput,
} from "@ecommers/types";
import { Spinner, Button } from "@ecommers/ui";
import { ProductForm } from "../../../../components/products/product-form";
import { ArrowLeft } from "lucide-react";

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const {
        data: product,
        isLoading: productLoading,
        error: productError,
    } = useGetProductByIdQuery(id, { skip: !id });

    const {
        data: categories = [],
        isLoading: categoriesLoading,
    } = useGetCategoriesQuery();

    const {
        data: locations = [],
        isLoading: locationsLoading,
    } = useGetAdminLocationsQuery();

    const [updateProduct, { isLoading: isSubmitting }] = useUpdateProductMutation();
    const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

    const [error, setError] = useState<string | null>(null);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);

    const loading = productLoading || categoriesLoading || locationsLoading;

    const handleSubmit = async (payload: UpdateProductInput) => {
        setSaveNotice(null);
        setError(null);
        try {
            await updateProduct({ id, body: payload }).unwrap();
            setSaveNotice("Product updated successfully!");
            setTimeout(() => setSaveNotice(null), 3500);
        } catch (err: any) {
            const msg = err?.data?.message || err?.message || "Failed to update product.";
            setError(msg);
            throw err;
        }
    };

    const handleDelete = async () => {
        setError(null);
        try {
            await deleteProduct(id).unwrap();
            router.push("/products");
        } catch (err: any) {
            const msg = err?.data?.message || err?.message || "Failed to delete product.";
            setError(msg);
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
