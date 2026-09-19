"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    useGetProductsQuery,
    useGetCategoriesQuery,
} from "../../../../store/api";
import type { ProductResponse } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Select,
    Spinner,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Pagination,
    Modal,
    toast,
} from "@ecommers/ui";
import {
    Layers,
    Package,
    Search,
    ArrowLeft,
    ExternalLink,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Boxes,
    RefreshCw,
    Plus,
    TrendingUp,
    Copy,
    Check,
    Tag,
    FolderTree,
    SlidersHorizontal,
    AlertTriangle,
    X,
} from "lucide-react";
import { PackagingPricingMatrix } from "../../../../components/products/packaging-pricing-matrix";

interface FlatVariantRow {
    key: string;
    variantId?: string;
    sku: string;
    title: string;
    weight?: number;
    weightUnit?: string;
    sellingPrice: number;
    compareAtPrice?: number;
    costAmount?: number;
    currency: string;
    isActive: boolean;
    isDefault: boolean;
    productId: string;
    productTitle: string;
    productSlug: string;
    productStatus: string;
    categoryId?: string;
    categoryName: string;
    grossMarginPercent?: number;
}

function PackagingMatrixContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productQueryParam = searchParams.get("product");

    // Queries
    const {
        data: productsData,
        isLoading: loadingProducts,
        isFetching: refreshingProducts,
        error: productsError,
        refetch: refetchProducts,
    } = useGetProductsQuery({ limit: 100 });

    const { data: categoriesData } = useGetCategoriesQuery();

    const products: ProductResponse[] = useMemo(() => productsData?.items || [], [productsData]);
    const categories = useMemo(() => categoriesData || [], [categoriesData]);

    // Lookup map for category names
    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const cat of categories) {
            map.set(cat.id, cat.name);
        }
        return map;
    }, [categories]);

    // Local Filter States
    const [search, setSearch] = useState("");
    const [selectedProductFilter, setSelectedProductFilter] = useState<string>(productQueryParam || "");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Modal States
    const [matrixModalProduct, setMatrixModalProduct] = useState<ProductResponse | null>(null);
    const [isSelectProductModalOpen, setIsSelectProductModalOpen] = useState(false);
    const [copiedSku, setCopiedSku] = useState<string | null>(null);

    // Sync URL query param to filter
    useEffect(() => {
        if (productQueryParam) {
            setSelectedProductFilter(productQueryParam);
        }
    }, [productQueryParam]);

    // Handle copying SKU
    const handleCopySku = (sku: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(sku);
            setCopiedSku(sku);
            setTimeout(() => setCopiedSku(null), 1800);
        }
    };

    // Flatten all variants across all products
    const allVariants: FlatVariantRow[] = useMemo(() => {
        const rows: FlatVariantRow[] = [];

        for (const product of products) {
            const catName = categoryMap.get(product.categoryId) || "General";
            const variants = product.variants || [];

            for (const v of variants) {
                const baseCurrency = product.baseCurrency || "INR";
                const matchingPrice =
                    v.prices?.find((p) => p.currency === baseCurrency) ||
                    v.prices?.find((p) => p.currency === "INR") ||
                    v.prices?.[0];

                const sellingPrice = matchingPrice?.amount ?? 0;
                const compareAtPrice = matchingPrice?.compareAtAmount;
                const costAmount = (matchingPrice as { costAmount?: number } | undefined)?.costAmount;

                let grossMarginPercent: number | undefined = undefined;
                if (sellingPrice > 0 && costAmount !== undefined && costAmount >= 0) {
                    grossMarginPercent = Math.round(((sellingPrice - costAmount) / sellingPrice) * 100);
                }

                rows.push({
                    key: `${product.id}-${v.id || v.sku}`,
                    variantId: v.id,
                    sku: v.sku,
                    title: v.title,
                    weight: v.weight,
                    weightUnit: v.weightUnit,
                    sellingPrice,
                    compareAtPrice,
                    costAmount,
                    currency: baseCurrency,
                    isActive: v.isActive ?? true,
                    isDefault: Boolean((v.attributes as Record<string, unknown> | undefined)?.isDefault),
                    productId: product.id,
                    productTitle: product.title,
                    productSlug: product.slug,
                    productStatus: product.status,
                    categoryId: product.categoryId,
                    categoryName: catName,
                    grossMarginPercent,
                });
            }
        }

        return rows;
    }, [products, categoryMap]);

    // Products that have 0 configured variants (e.g. newly created DRAFT products)
    const productsWithoutVariants = useMemo(() => {
        return products.filter((p) => !p.variants || p.variants.length === 0);
    }, [products]);

    // Filter variants
    const filteredVariants = useMemo(() => {
        let result = allVariants;

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(
                (row) =>
                    row.sku.toLowerCase().includes(q) ||
                    row.title.toLowerCase().includes(q) ||
                    row.productTitle.toLowerCase().includes(q) ||
                    row.productSlug.toLowerCase().includes(q)
            );
        }

        if (selectedProductFilter) {
            result = result.filter((row) => row.productId === selectedProductFilter);
        }

        if (selectedCategoryFilter) {
            result = result.filter((row) => row.categoryId === selectedCategoryFilter);
        }

        if (selectedStatusFilter === "ACTIVE") {
            result = result.filter((row) => row.isActive);
        } else if (selectedStatusFilter === "INACTIVE") {
            result = result.filter((row) => !row.isActive);
        }

        return result;
    }, [allVariants, search, selectedProductFilter, selectedCategoryFilter, selectedStatusFilter]);

    // Pagination calculations
    const totalItems = filteredVariants.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedVariants = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredVariants.slice(start, start + pageSize);
    }, [filteredVariants, page, pageSize]);

    // Summary metrics
    const metrics = useMemo(() => {
        const activeCount = allVariants.filter((v) => v.isActive).length;
        const totalPacks = allVariants.length;
        const configuredProductsCount = products.filter((p) => p.variants && p.variants.length > 0).length;
        const pendingProductsCount = productsWithoutVariants.length;

        const variantsWithMargin = allVariants.filter(
            (v) => v.grossMarginPercent !== undefined && !Number.isNaN(v.grossMarginPercent)
        );
        const avgMargin =
            variantsWithMargin.length > 0
                ? Math.round(
                    variantsWithMargin.reduce((acc, curr) => acc + (curr.grossMarginPercent || 0), 0) /
                    variantsWithMargin.length
                )
                : 60;

        return {
            activeCount,
            totalPacks,
            configuredProductsCount,
            pendingProductsCount,
            avgMargin,
        };
    }, [allVariants, products, productsWithoutVariants]);

    // Handler to open matrix for a product
    const handleOpenMatrix = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (product) {
            setMatrixModalProduct(product);
            setIsSelectProductModalOpen(false);
        }
    };

    // Handler for reset filters
    const handleResetFilters = () => {
        setSearch("");
        setSelectedProductFilter("");
        setSelectedCategoryFilter("");
        setSelectedStatusFilter("");
        setPage(1);
        if (productQueryParam) {
            const url = new URL(window.location.href);
            url.searchParams.delete("product");
            window.history.replaceState({}, "", url.toString());
        }
    };

    if (loadingProducts) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Loading Variant Catalog & Commercial Matrix...
                </p>
            </div>
        );
    }

    if (productsError) {
        return (
            <div className="p-8">
                <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
                    <AlertCircle size={28} className="text-red-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Failed to load catalog products
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm">
                        {productsError && typeof productsError === "object" && "data" in productsError
                            ? JSON.stringify((productsError as any).data?.message || (productsError as any).data?.error || productsError)
                            : "An error occurred while loading catalog products."}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => refetchProducts()}>
                        Retry
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Top Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.push("/products")}
                            className="text-xs text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer mr-1"
                        >
                            <ArrowLeft size={13} />
                            <span>Catalog</span>
                        </button>
                        <span className="text-slate-300 dark:text-neutral-700">/</span>
                        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Layers size={14} />
                        </div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                            Packaging & Commercial Pricing Matrix
                        </h1>
                        <Badge variant="primary" size="sm">
                            Authoritative
                        </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                        Operational master list of all sellable retail pack sizes, live ingredient COGS, packaging BOMs, and commercial margins.
                    </p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchProducts()}
                        isLoading={refreshingProducts}
                        className="text-xs gap-1.5"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </Button>

                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                            if (selectedProductFilter) {
                                handleOpenMatrix(selectedProductFilter);
                            } else if (products.length === 1) {
                                handleOpenMatrix(products[0].id);
                            } else {
                                setIsSelectProductModalOpen(true);
                            }
                        }}
                        className="text-xs gap-1.5 font-semibold"
                    >
                        <Plus size={14} />
                        <span>+ Create / Configure Pack</span>
                    </Button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#111111] border-slate-200/80 dark:border-neutral-800/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Package size={18} />
                    </div>
                    <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">
                            {metrics.totalPacks}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                            Total Sellable Packs ({metrics.activeCount} Active)
                        </div>
                    </div>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#111111] border-slate-200/80 dark:border-neutral-800/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">
                            {metrics.configuredProductsCount} / {products.length}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                            Products Configured
                        </div>
                    </div>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#111111] border-slate-200/80 dark:border-neutral-800/80 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        metrics.pendingProductsCount > 0
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                            : "bg-slate-100 dark:bg-neutral-800 text-slate-500"
                    }`}>
                        <Boxes size={18} />
                    </div>
                    <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">
                            {metrics.pendingProductsCount}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                            Pending Pack Setup
                        </div>
                    </div>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#111111] border-slate-200/80 dark:border-neutral-800/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">
                            ~{metrics.avgMargin}%
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                            Avg Commercial Margin
                        </div>
                    </div>
                </Card>
            </div>

            {/* Notice if any products have 0 variants */}
            {productsWithoutVariants.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200">
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <span className="font-bold">
                                {productsWithoutVariants.length} product(s) pending pack setup:
                            </span>{" "}
                            {productsWithoutVariants.map((p) => p.title).join(", ")}. These products cannot be published until pack sizes are configured.
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMatrix(productsWithoutVariants[0].id)}
                        className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-300 text-xs shrink-0"
                    >
                        Configure {productsWithoutVariants[0].title.split(" ")[0]} Now
                    </Button>
                </div>
            )}

            {/* Filter & Search Toolbar */}
            <Card className="p-3.5 bg-white dark:bg-[#111111] border-slate-200/80 dark:border-neutral-800/80">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[220px]">
                        <Input
                            size="sm"
                            leadingIcon={<Search size={14} className="text-slate-400" />}
                            placeholder="Search by SKU, pack title, or product..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    {/* Filter by Product */}
                    <div className="w-56">
                        <Select
                            size="sm"
                            value={selectedProductFilter}
                            onChange={(e) => {
                                setSelectedProductFilter(e.target.value);
                                setPage(1);
                                const url = new URL(window.location.href);
                                if (e.target.value) {
                                    url.searchParams.set("product", e.target.value);
                                } else {
                                    url.searchParams.delete("product");
                                }
                                window.history.replaceState({}, "", url.toString());
                            }}
                        >
                            <option value="">All Products ({products.length})</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title} ({p.variants?.length || 0} packs)
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Filter by Category */}
                    {categories.length > 0 && (
                        <div className="w-44">
                            <Select
                                size="sm"
                                value={selectedCategoryFilter}
                                onChange={(e) => {
                                    setSelectedCategoryFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Categories</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {/* Filter by Status */}
                    <div className="w-36">
                        <Select
                            size="sm"
                            value={selectedStatusFilter}
                            onChange={(e) => {
                                setSelectedStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active Only</option>
                            <option value="INACTIVE">Inactive Only</option>
                        </Select>
                    </div>

                    {/* Reset Button */}
                    {(search || selectedProductFilter || selectedCategoryFilter || selectedStatusFilter) && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="text-xs text-blue-600 dark:text-blue-400 gap-1"
                        >
                            <X size={13} />
                            <span>Reset</span>
                        </Button>
                    )}

                    {/* Page Size Selector */}
                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="text-xs font-medium rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-2 py-1 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>variants</span>
                    </div>
                </div>
            </Card>

            {/* Paginated Variants Table Card */}
            <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs bg-white dark:bg-[#111111]">
                <Table className="overflow-auto max-h-[calc(100vh-320px)] min-h-[320px] border-none rounded-none">
                    <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                        <TableRow>
                            <TableHead>Pack / Variant</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Parent Product</TableHead>
                            <TableHead>Selling Price</TableHead>
                            <TableHead>Unit Cost (COGS)</TableHead>
                            <TableHead>Margin</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedVariants.length === 0 ? (
                            <TableRow noHover>
                                <TableCell colSpan={8} className="text-center text-slate-400 dark:text-neutral-500 py-16 text-xs">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Package size={28} className="text-slate-300 dark:text-neutral-600" />
                                        <p className="font-semibold text-slate-700 dark:text-neutral-300">
                                            No variants found matching criteria.
                                        </p>
                                        <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                                            {allVariants.length === 0
                                                ? "Create or configure pack sizes for your catalog products."
                                                : "Try clearing filters or search terms."}
                                        </p>
                                        {allVariants.length === 0 && (
                                            <Button
                                                type="button"
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {
                                                    if (products.length > 0) {
                                                        handleOpenMatrix(products[0].id);
                                                    } else {
                                                        router.push("/products/new");
                                                    }
                                                }}
                                                className="mt-2"
                                            >
                                                Configure First Pack Size
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedVariants.map((row) => {
                                const isGreenMargin =
                                    row.grossMarginPercent !== undefined && row.grossMarginPercent >= 55;
                                const isBlueMargin =
                                    row.grossMarginPercent !== undefined &&
                                    row.grossMarginPercent >= 35 &&
                                    row.grossMarginPercent < 55;
                                const isAmberMargin =
                                    row.grossMarginPercent !== undefined && row.grossMarginPercent < 35;

                                return (
                                    <TableRow key={row.key}>
                                        {/* Pack Title & Weight */}
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold text-[11px]">
                                                    {row.weight ? `${row.weight}` : "1x"}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-slate-900 dark:text-neutral-100 text-xs">
                                                            {row.title}
                                                        </span>
                                                        {row.isDefault && (
                                                            <Badge variant="primary" size="sm" className="text-[9px] px-1 py-0 leading-none">
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5">
                                                        <span>Net: {row.weight ? `${row.weight} ${row.weightUnit || "g"}` : "Unit"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* SKU */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 group">
                                                <code className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 border border-slate-200/60 dark:border-neutral-700/60">
                                                    {row.sku}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopySku(row.sku)}
                                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                                                    title="Copy SKU"
                                                >
                                                    {copiedSku === row.sku ? (
                                                        <Check size={12} className="text-emerald-500" />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                        </TableCell>

                                        {/* Parent Product */}
                                        <TableCell>
                                            <div>
                                                <div
                                                    onClick={() => handleOpenMatrix(row.productId)}
                                                    className="font-semibold text-xs text-slate-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                                                    title="Configure packaging matrix for this product"
                                                >
                                                    {row.productTitle}
                                                </div>
                                                <div className="text-[11px] text-slate-400 dark:text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                                    <Badge
                                                        variant={row.productStatus === "PUBLISHED" ? "success" : "neutral"}
                                                        size="sm"
                                                        className="text-[9px] px-1 py-0 leading-none"
                                                    >
                                                        {row.productStatus}
                                                    </Badge>
                                                    <span>• {row.categoryName}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Selling Price */}
                                        <TableCell>
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    ₹{row.sellingPrice.toFixed(2)}
                                                </div>
                                                {row.compareAtPrice && row.compareAtPrice > row.sellingPrice && (
                                                    <div className="text-[10px] text-slate-400 line-through">
                                                        ₹{row.compareAtPrice.toFixed(2)} MRP
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Unit Cost (COGS) */}
                                        <TableCell>
                                            <div className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                                                {row.costAmount !== undefined && row.costAmount > 0 ? (
                                                    `₹${row.costAmount.toFixed(2)}`
                                                ) : (
                                                    <span className="text-slate-400 font-normal italic">
                                                        Not Computed
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Gross Margin % */}
                                        <TableCell>
                                            {row.grossMarginPercent !== undefined ? (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        isGreenMargin
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                                                            : isBlueMargin
                                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                                                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40"
                                                    }`}
                                                >
                                                    <TrendingUp size={11} />
                                                    <span>{row.grossMarginPercent}%</span>
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-400">—</span>
                                            )}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <Badge
                                                variant={row.isActive ? "success" : "neutral"}
                                                size="sm"
                                            >
                                                {row.isActive ? "ACTIVE" : "INACTIVE"}
                                            </Badge>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenMatrix(row.productId)}
                                                    className="text-xs h-7 px-2 gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60 font-semibold"
                                                    title="Open Packaging Matrix for this product"
                                                >
                                                    <Layers size={12} />
                                                    <span>Edit Matrix</span>
                                                </Button>

                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/products/${row.productId}`)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                                    title="View root product details"
                                                >
                                                    <ExternalLink size={13} />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Footer */}
                {totalItems > 0 && (
                    <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Modal: Select Product to Configure (Triggered from + Create / Configure Pack) */}
            <Modal
                isOpen={isSelectProductModalOpen}
                onClose={() => setIsSelectProductModalOpen(false)}
                title="Select Product to Configure Pack Sizes & Pricing"
                description="Choose the catalog product to configure its master formula, packaging BOM (jars, lids, labels), and retail pack sizes."
                maxWidth="md"
            >
                <div className="space-y-3 py-1">
                    <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                        {products.map((p) => {
                            const packCount = p.variants?.length || 0;
                            const isPending = packCount === 0;

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handleOpenMatrix(p.id)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        isPending
                                            ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                            : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300 shrink-0 font-bold">
                                            <Package size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {p.title}
                                                </h4>
                                                <Badge
                                                    variant={p.status === "PUBLISHED" ? "success" : "neutral"}
                                                    size="sm"
                                                    className="text-[9px] px-1 py-0 leading-none"
                                                >
                                                    {p.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                                Slug: {p.slug} • Currency: {p.baseCurrency || "INR"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isPending ? (
                                            <Badge variant="warning" size="sm">
                                                0 Packs (Pending)
                                            </Badge>
                                        ) : (
                                            <Badge variant="primary" size="sm">
                                                {packCount} Pack Sizes
                                            </Badge>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-7 px-2"
                                        >
                                            Configure
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSelectProductModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Full Packaging & Commercial Pricing Matrix Modal */}
            <Modal
                isOpen={!!matrixModalProduct}
                onClose={() => setMatrixModalProduct(null)}
                title={matrixModalProduct ? `Packaging Matrix: ${matrixModalProduct.title}` : "Packaging Matrix"}
                description="Link master bulk production recipe, retail containers (jars, lids, labels), compute live COGS, and sync to store catalog."
                maxWidth="6xl"
            >
                {matrixModalProduct && (
                    <div className="py-2">
                        <PackagingPricingMatrix
                            key={matrixModalProduct.id}
                            productId={matrixModalProduct.id}
                            productTitle={matrixModalProduct.title}
                            baseCurrency={matrixModalProduct.baseCurrency || "INR"}
                            onVariantsSynced={() => {
                                toast.success("Variants and commercial pricing synchronized with store catalog!");
                                refetchProducts();
                                setMatrixModalProduct(null);
                            }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default function PackagingMatrixPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center p-16 gap-3">
                    <Spinner size="lg" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        Loading Packaging Matrix...
                    </p>
                </div>
            }
        >
            <PackagingMatrixContent />
        </Suspense>
    );
}
