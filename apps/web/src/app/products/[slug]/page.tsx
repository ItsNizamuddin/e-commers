import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { api } from "../../../lib/api";
import { ProductDetailClient } from "../../../components/products/ProductDetailClient";
import { ProductCard } from "../../../components/products/ProductCard";
import type { ProductResponse, CategoryResponse, ProductReviewsResponse } from "@ecommers/types";

interface ProductDetailPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
    const { slug } = await params;
    try {
        const product = await api.products.getBySlug(slug);
        return {
            title: `${product.title} | ECOMMERS Farm-to-Fork`,
            description: product.shortDescription || product.description || `Pure, certified ${product.title} with complete batch traceability.`,
            openGraph: {
                title: product.title,
                description: product.shortDescription || product.description,
                images: product.images?.[0] ? [{ url: product.images[0] }] : [],
            },
        };
    } catch {
        return {
            title: "Artisanal Product | ECOMMERS",
            description: "Farm-to-fork traceable organic culinary goods.",
        };
    }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
    const { slug } = await params;

    let product: ProductResponse;
    try {
        product = await api.products.getBySlug(slug);
    } catch {
        notFound();
    }

    if (!product || !product.id) {
        notFound();
    }

    let category: CategoryResponse | undefined = undefined;
    if (product.categoryId) {
        try {
            category = await api.categories.getById(product.categoryId);
        } catch {
            category = undefined;
        }
    }

    let reviews: ProductReviewsResponse | null = null;
    try {
        reviews = await api.reviews.list(product.id, { limit: 10 });
    } catch {
        reviews = null;
    }

    // Related products from same category or general harvest
    let relatedProducts: ProductResponse[] = [];
    try {
        const relRes = await api.products.list({
            categoryId: product.categoryId,
            limit: 4,
            status: "PUBLISHED",
        });
        relatedProducts = (relRes?.items || []).filter((p) => p.id !== product.id).slice(0, 3);
    } catch {
        relatedProducts = [];
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                {/* Main Product Details Container */}
                <ProductDetailClient
                    product={product}
                    categoryName={category?.name}
                    initialReviews={reviews}
                />

                {/* Related Products Section */}
                {relatedProducts.length > 0 && (
                    <section className="pt-12 border-t border-zinc-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                    Complementary Harvests
                                </span>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight mt-1">
                                    You May Also Enjoy
                                </h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {relatedProducts.map((relProduct) => (
                                <ProductCard key={relProduct.id || relProduct.slug} product={relProduct} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
