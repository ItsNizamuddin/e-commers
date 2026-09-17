"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    useGetCategoriesQuery,
    useUpdateCategoryMutation,
    useReorderCategoriesMutation,
    useDeleteCategoryMutation,
} from "../../../store/api";
import type { CategoryResponse } from "@ecommers/types";
import {
    Card,
    Badge,
    Spinner,
    ErrorState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Button,
    TableAction,
    TableActionGroup,
    ConfirmDialog,
    toast,
    Pagination,
} from "@ecommers/ui";
import {
    FolderTree,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    Folder,
    Search,
    Globe,
    ListFilter,
    ChevronsDownUp,
    ChevronsUpDown,
    X,
    Layers,
    Check,
} from "lucide-react";
import {
    buildCategoryTree,
    flattenCategoryTree,
    getAllBranchIds,
    filterCategoryTree,
    reorderCategoryList,
} from "../../../components/categories/category-tree-utils";
import { CategoryTreeTable } from "../../../components/categories/category-tree-table";

export default function CategoriesPage() {
    const router = useRouter();

    const {
        data: categories = [],
        isLoading: loading,
        isFetching: refreshing,
        error: categoriesError,
        refetch,
    } = useGetCategoriesQuery();

    const [updateCategoryMutation] = useUpdateCategoryMutation();
    const [reorderCategoriesMutation] = useReorderCategoriesMutation();
    const [deleteCategoryMutation] = useDeleteCategoryMutation();

    const error = categoriesError
        ? typeof categoriesError === "string"
            ? categoriesError
            : "Failed to load categories."
        : null;

    // View mode & Tree state
    const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Status toggle & Reorder feedback states
    const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

    // Delete state
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Auto-expand branches initially once categories load
    useEffect(() => {
        if (categories.length > 0) {
            const tree = buildCategoryTree(categories);
            setExpandedIds((prev) => (prev.size === 0 ? getAllBranchIds(tree) : prev));
        }
    }, [categories]);

    // Tree calculation and search filtering
    const { filteredTree, matchedIds, autoExpandIds } = useMemo(() => {
        return filterCategoryTree(categories, searchQuery);
    }, [categories, searchQuery]);

    // Automatically expand ancestors of matching items when searching
    useEffect(() => {
        if (searchQuery.trim() && autoExpandIds.size > 0) {
            setExpandedIds((prev) => {
                const next = new Set(prev);
                autoExpandIds.forEach((id) => next.add(id));
                return next;
            });
        }
    }, [searchQuery, autoExpandIds]);

    // Flatten tree for table rendering
    const flattenedRows = useMemo(() => {
        return flattenCategoryTree(filteredTree, expandedIds);
    }, [filteredTree, expandedIds]);

    // Flat mode search filtering
    const flatFilteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.slug.toLowerCase().includes(q) ||
                (c.description || "").toLowerCase().includes(q)
        );
    }, [categories, searchQuery]);

    const totalPages = Math.ceil(flatFilteredCategories.length / pageSize) || 1;
    const paginatedCategories = flatFilteredCategories.slice((page - 1) * pageSize, page * pageSize);

    // Tree Expansion Handlers
    const handleToggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExpandAll = () => {
        const allBranchIds = getAllBranchIds(filteredTree);
        setExpandedIds(allBranchIds);
    };

    const handleCollapseAll = () => {
        setExpandedIds(new Set());
    };

    // Toggle Active / Hidden Status Handler
    const handleToggleActive = async (id: string, newActive: boolean) => {
        setTogglingActiveId(id);
        const targetCategory = categories.find((c) => c.id === id);
        const catName = targetCategory?.name || "Category";

        try {
            await updateCategoryMutation({ id, body: { isActive: newActive } }).unwrap();
            toast.success(`${catName} is now ${newActive ? "Active" : "Hidden"}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? `Failed to update status: ${err.message}` : "Failed to update category status.");
        } finally {
            setTogglingActiveId(null);
        }
    };

    // Drag and Drop Reordering Handler
    const handleReorder = async (
        sourceId: string,
        targetId: string,
        position: "before" | "after"
    ) => {
        const result = reorderCategoryList(categories, sourceId, targetId, position);
        if (!result) return;

        const { changedCategories } = result;

        // Persist updated sortOrder using dedicated reorder API
        try {
            await reorderCategoriesMutation(
                changedCategories.map((item) => ({
                    id: item.id,
                    sortOrder: item.sortOrder,
                }))
            ).unwrap();
            toast.success("Category order updated.");
        } catch (err: unknown) {
            console.error("Failed to persist category order:", err);
            toast.error(err instanceof Error ? err.message : "Failed to save new order to server.");
        }
    };

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setIsDeleting(true);
        try {
            await deleteCategoryMutation(categoryToDelete).unwrap();
            setCategoryToDelete(null);
            toast.success("Category deleted successfully.");
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(`Delete failed: ${err.message}`);
            } else {
                toast.error("Failed to delete category.");
            }
        } finally {
            setIsDeleting(false);
        }
    };

    // Summary Statistics
    const totalCount = categories.length;
    const rootCount = categories.filter((c) => !c.parentId).length;
    const subCount = categories.filter((c) => Boolean(c.parentId)).length;
    const seoCount = categories.filter((c) => Boolean(c.seo?.metaTitle || c.seo?.metaDescription)).length;

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <FolderTree size={15} />
                        </div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            Categories
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Organize your store taxonomy, category hierarchy, and search engine metadata.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/seo/bulk?type=CATEGORY")}
                        className="gap-1.5 h-8 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30"
                    >
                        <Globe size={13} />
                        <span>Bulk SEO</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        isLoading={refreshing}
                        className="gap-1.5 h-8 text-xs"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => router.push("/categories/new")}
                        className="gap-1.5 h-8 text-xs"
                    >
                        <Plus size={14} />
                        <span>Add Category</span>
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 px-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Total</span>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{totalCount}</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-300">
                        <Folder size={13} />
                    </div>
                </div>

                <div className="p-2.5 px-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Top-Level</span>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{rootCount}</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FolderTree size={13} />
                    </div>
                </div>

                <div className="p-2.5 px-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Subcategories</span>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{subCount}</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Layers size={13} />
                    </div>
                </div>

                <div className="p-2.5 px-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">SEO Ready</span>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{seoCount}</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Globe size={13} />
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                {/* Search & View Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 sm:p-4 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-900/30">
                    {/* Live Search Input */}
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search categories by name, slug..."
                            className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setPage(1);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* View Mode & Tree Controls */}
                    <div className="flex items-center gap-2">
                        {viewMode === "tree" && (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExpandAll}
                                    title="Expand all categories"
                                    className="h-8 text-[11px] px-2 gap-1"
                                >
                                    <ChevronsUpDown size={13} />
                                    <span>Expand All</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCollapseAll}
                                    title="Collapse all subcategories"
                                    className="h-8 text-[11px] px-2 gap-1"
                                >
                                    <ChevronsDownUp size={13} />
                                    <span>Collapse All</span>
                                </Button>
                            </div>
                        )}

                        {viewMode === "flat" && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0 mr-1">
                                <span>Show</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="text-xs font-medium rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#161616] px-2 py-1 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>entries</span>
                            </div>
                        )}

                        {/* Segmented View Toggle Button */}
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                            <button
                                type="button"
                                onClick={() => setViewMode("tree")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                    viewMode === "tree"
                                        ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs"
                                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <FolderTree size={12} />
                                <span>Hierarchy Tree</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("flat")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                    viewMode === "flat"
                                        ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs"
                                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <ListFilter size={12} />
                                <span>Flat Table</span>
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Spinner size="md" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Loading categories...</p>
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <ErrorState
                            title="Failed to load categories"
                            message={error}
                            onRetry={() => refetch()}
                        />
                    </div>
                ) : viewMode === "tree" ? (
                    /* Modular Hierarchical Tree Table with DnD and Status Toggle */
                    <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px]">
                        <CategoryTreeTable
                            rows={flattenedRows}
                            matchedIds={matchedIds}
                            onToggleExpand={handleToggleExpand}
                            onEdit={(id) => router.push(`/categories/${id}`)}
                            onDelete={(id) => setCategoryToDelete(id)}
                            onAddSubcategory={(parentId) => router.push(`/categories/new?parentId=${parentId}`)}
                            onToggleActive={handleToggleActive}
                            togglingActiveId={togglingActiveId}
                            onReorder={handleReorder}
                            isSearchActive={Boolean(searchQuery.trim())}
                        />
                    </div>
                ) : (
                    /* Flat Table View */
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px]">
                            <Table className="border-none rounded-none">
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                                    <TableRow>
                                        <TableHead>Category Name</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>Parent Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>SEO Health</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                            {flatFilteredCategories.length === 0 ? (
                                <TableRow noHover>
                                    <TableCell colSpan={6} className="text-center text-slate-400 dark:text-neutral-500 py-10 text-xs">
                                        {searchQuery
                                            ? "No categories match your search criteria."
                                            : "No categories defined yet. Click 'Add Category' to create one."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCategories.map((c) => {
                                    const parentName = categories.find((p) => p.id === c.parentId)?.name || "Root (None)";
                                    const hasSeo = Boolean(c.seo?.metaTitle || c.seo?.metaDescription);

                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                                        <Folder size={13} className="text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-900 dark:text-neutral-100 text-xs">
                                                            {c.name}
                                                        </span>
                                                        {c.description && (
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                                                                {c.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs text-slate-500 dark:text-neutral-400">
                                                    /{c.slug}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="neutral" size="sm">
                                                    {parentName}
                                                </Badge>
                                            </TableCell>
                                            {/* Interactive Status Switch in Flat Table */}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={c.isActive !== false}
                                                        onClick={() => handleToggleActive(c.id, !c.isActive)}
                                                        disabled={togglingActiveId === c.id}
                                                        title={c.isActive !== false ? "Active: click to hide" : "Hidden: click to activate"}
                                                        className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            c.isActive !== false
                                                                ? "bg-emerald-500 hover:bg-emerald-600"
                                                                : "bg-slate-200 dark:bg-neutral-700 hover:bg-slate-300 dark:hover:bg-neutral-600"
                                                        } ${togglingActiveId === c.id ? "opacity-50 cursor-wait" : ""}`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out my-auto ${
                                                                c.isActive !== false ? "translate-x-3.5" : "translate-x-0.5"
                                                            }`}
                                                        />
                                                    </button>
                                                    <span
                                                        className={`text-[11px] font-medium select-none ${
                                                            c.isActive !== false
                                                                ? "text-emerald-700 dark:text-emerald-400"
                                                                : "text-slate-400 dark:text-neutral-500"
                                                        }`}
                                                    >
                                                        {togglingActiveId === c.id
                                                            ? "..."
                                                            : c.isActive !== false
                                                            ? "Active"
                                                            : "Hidden"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {hasSeo ? (
                                                    <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                        <Globe size={12} />
                                                        <span>Configured</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                                        <span>Missing</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <TableActionGroup>
                                                    <TableAction
                                                        icon={<Plus size={13} />}
                                                        label="Add Sub"
                                                        variant="default"
                                                        onClick={() => router.push(`/categories/new?parentId=${c.id}`)}
                                                        title={`Add subcategory under "${c.name}"`}
                                                    />
                                                    <TableAction
                                                        icon={<Edit size={14} />}
                                                        label="Edit"
                                                        variant="primary"
                                                        onClick={() => router.push(`/categories/${c.id}`)}
                                                        title="Edit Category & SEO"
                                                    />
                                                    <TableAction
                                                        icon={<Trash2 size={14} />}
                                                        label="Delete"
                                                        variant="destructive"
                                                        onClick={() => setCategoryToDelete(c.id)}
                                                        title="Delete Category"
                                                    />
                                                </TableActionGroup>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {flatFilteredCategories.length > 0 && (
                    <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalItems={flatFilteredCategories.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </>
        )}
    </Card>

            {/* Delete Confirmation Modal (Requires typing 'delete' to confirm) */}
            <ConfirmDialog
                isOpen={!!categoryToDelete}
                onClose={() => !isDeleting && setCategoryToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Category"
                description={
                    categoryToDelete
                        ? `Are you sure you want to delete category "${categories.find((c) => c.id === categoryToDelete)?.name || ""}"? Subcategories will become root categories. This action cannot be undone.`
                        : "Are you sure you want to delete this category?"
                }
                confirmLabel={isDeleting ? "Deleting..." : "Delete Permanently"}
                variant="danger"
                requireTypedConfirmation={true}
                confirmationExpectedText="delete"
                confirmationPrompt={
                    <span>
                        To confirm deletion, please type{" "}
                        <strong className="text-red-600 dark:text-red-400 font-semibold font-mono">
                            delete
                        </strong>{" "}
                        below:
                    </span>
                }
            />
        </div>
    );
}
