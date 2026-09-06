"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
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
    Modal,
    Input,
    FormField,
    ConfirmDialog,
} from "@ecommers/ui";
import {
    FolderTree,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    CheckCircle2,
    Folder,
} from "lucide-react";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [parentId, setParentId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete state
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadCategories = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await api.categories.list();
            setCategories(data || []);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load categories.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const openCreateModal = () => {
        setEditingCategory(null);
        setName("");
        setSlug("");
        setDescription("");
        setParentId("");
        setIsCreateOpen(true);
    };

    const openEditModal = (cat: CategoryResponse) => {
        setEditingCategory(cat);
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || "");
        setParentId(cat.parentId || "");
        setIsCreateOpen(true);
    };

    const handleNameChange = (val: string) => {
        setName(val);
        if (!editingCategory) {
            setSlug(
                val
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
            );
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await api.categories.update(editingCategory.id, {
                    name: name.trim(),
                    slug: slug.trim() || undefined,
                    description: description.trim() || undefined,
                    parentId: parentId || undefined,
                });
            } else {
                await api.categories.create({
                    name: name.trim(),
                    slug: slug.trim() || undefined,
                    description: description.trim() || undefined,
                    parentId: parentId || undefined,
                });
            }
            setIsCreateOpen(false);
            loadCategories(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Error saving category: ${err.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setIsDeleting(true);
        try {
            await api.categories.delete(categoryToDelete);
            setCategoryToDelete(null);
            loadCategories(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Delete failed: ${err.message}`);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                            }}
                        >
                            <FolderTree size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Categories & Taxonomy
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Structure catalog hierarchies, manage parent-child relationships, and taxonomy slugs.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadCategories(true)}
                        isLoading={refreshing}
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={openCreateModal}
                        style={{ backgroundColor: "#2563eb", borderRadius: "8px", gap: "0.375rem" }}
                    >
                        <Plus size={15} />
                        <span>Add Category</span>
                    </Button>
                </div>
            </div>

            {/* Categories Table Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                        <Spinner size="md" />
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading taxonomy hierarchy...</p>
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Failed to load categories"
                        message={error}
                        onRetry={() => loadCategories()}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Parent Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                        No categories defined yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((c) => {
                                    const parentName = categories.find((p) => p.id === c.parentId)?.name || "Root (None)";

                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <Folder size={16} color="#3b82f6" />
                                                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>
                                                    {c.slug}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="neutral" size="sm">
                                                    {parentName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="success" size="sm">
                                                    Active
                                                </Badge>
                                            </TableCell>
                                            <TableCell style={{ textAlign: "right" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem" }}>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(c)}
                                                        style={{ color: "#2563eb", padding: "0.25rem 0.5rem" }}
                                                    >
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setCategoryToDelete(c.id)}
                                                        style={{ color: "#dc2626", padding: "0.25rem 0.5rem" }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => !isSubmitting && setIsCreateOpen(false)}
                title={editingCategory ? "Edit Category" : "Add New Category"}
                description="Configure category taxonomy and parent-child tree relationships."
            >
                <form onSubmit={handleSaveCategory} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <FormField label="Category Name" required>
                        <Input
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. Consumer Electronics"
                            disabled={isSubmitting}
                        />
                    </FormField>

                    <FormField label="URL Slug" required>
                        <Input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="e.g. consumer-electronics"
                            disabled={isSubmitting}
                        />
                    </FormField>

                    <FormField label="Parent Category">
                        <select
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                            disabled={isSubmitting}
                            style={{
                                width: "100%",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                backgroundColor: "#f8fafc",
                                fontSize: "0.8125rem",
                                color: "#0f172a",
                                outline: "none",
                            }}
                        >
                            <option value="">Root Category (No Parent)</option>
                            {categories
                                .filter((c) => !editingCategory || c.id !== editingCategory.id)
                                .map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                    </FormField>

                    <FormField label="Description">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional category description..."
                            rows={3}
                            disabled={isSubmitting}
                            style={{
                                width: "100%",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                backgroundColor: "#f8fafc",
                                fontSize: "0.8125rem",
                                color: "#0f172a",
                                outline: "none",
                                fontFamily: "inherit",
                            }}
                        />
                    </FormField>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                            style={{ backgroundColor: "#2563eb" }}
                        >
                            {editingCategory ? "Save Changes" : "Create Category"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!categoryToDelete}
                onClose={() => !isDeleting && setCategoryToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Category"
                description="Are you sure you want to delete this category? Subcategories will become root categories."
                confirmLabel={isDeleting ? "Deleting..." : "Delete"}
                variant="danger"
            />
        </div>
    );
}
