"use client";

import React, { useState } from "react";
import type { FlattenedTreeRow } from "./category-tree-utils";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Badge,
    TableAction,
    TableActionGroup,
} from "@ecommers/ui";
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderTree,
    FolderOpen,
    Plus,
    Edit,
    Trash2,
    Globe,
    Layers,
    GripVertical,
} from "lucide-react";

export interface CategoryTreeTableProps {
    rows: FlattenedTreeRow[];
    matchedIds?: Set<string>;
    onToggleExpand: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onAddSubcategory: (parentId: string) => void;
    onToggleActive: (id: string, newActive: boolean) => Promise<void>;
    togglingActiveId?: string | null;
    onReorder?: (sourceId: string, targetId: string, position: "before" | "after") => void;
    isSearchActive?: boolean;
}

export function CategoryTreeTable({
    rows,
    matchedIds,
    onToggleExpand,
    onEdit,
    onDelete,
    onAddSubcategory,
    onToggleActive,
    togglingActiveId,
    onReorder,
    isSearchActive = false,
}: CategoryTreeTableProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        if (!draggedId || draggedId === id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const position = offsetY < rect.height / 2 ? "before" : "after";

        if (!dropTarget || dropTarget.id !== id || dropTarget.position !== position) {
            setDropTarget({ id, position });
        }
    };

    const handleDragLeave = (e: React.DragEvent, id: string) => {
        if (dropTarget?.id === id) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
                e.clientY < rect.top ||
                e.clientY >= rect.bottom ||
                e.clientX < rect.left ||
                e.clientX >= rect.right
            ) {
                setDropTarget(null);
            }
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (draggedId && draggedId !== targetId && onReorder && dropTarget) {
            onReorder(draggedId, targetId, dropTarget.position);
        }
        setDraggedId(null);
        setDropTarget(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDropTarget(null);
    };

    if (rows.length === 0) {
        return (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-neutral-500">
                {isSearchActive
                    ? "No categories match your search criteria."
                    : "No categories found. Click 'Add Category' to create the first root category."}
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {/* DnD Grip column */}
                    <TableHead className="w-8 px-1"></TableHead>
                    <TableHead className="min-w-[280px]">Hierarchy & Category Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Level / Placement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SEO Health</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map(({ node, depth, hasChildren, childCount, isExpanded, isLastChild }) => {
                    const hasSeo = Boolean(node.seo?.metaTitle || node.seo?.metaDescription);
                    const isDirectMatch = matchedIds?.has(node.id);
                    const isBeingDragged = draggedId === node.id;
                    const isDropActive = dropTarget?.id === node.id;

                    return (
                        <TableRow
                            key={node.id}
                            onDragOver={(e) => handleDragOver(e, node.id)}
                            onDragLeave={(e) => handleDragLeave(e, node.id)}
                            onDrop={(e) => handleDrop(e, node.id)}
                            className={`group transition-all duration-150 relative ${
                                isBeingDragged
                                    ? "opacity-35 bg-slate-100 dark:bg-neutral-800"
                                    : isDropActive
                                    ? dropTarget.position === "before"
                                        ? "border-t-2 border-t-blue-500 bg-blue-50/20 dark:bg-blue-950/20"
                                        : "border-b-2 border-b-blue-500 bg-blue-50/20 dark:bg-blue-950/20"
                                    : isDirectMatch
                                    ? "bg-amber-50/40 dark:bg-amber-950/20"
                                    : depth > 0
                                    ? "bg-slate-50/30 dark:bg-neutral-900/30"
                                    : ""
                            }`}
                        >
                            {/* Drag Handle */}
                            <TableCell className="w-8 px-1 text-center">
                                <button
                                    type="button"
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, node.id)}
                                    onDragEnd={handleDragEnd}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 dark:text-neutral-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-grab active:cursor-grabbing transition-colors"
                                    title="Drag to reorder category"
                                    aria-label={`Drag to reorder ${node.name}`}
                                >
                                    <GripVertical size={13} />
                                </button>
                            </TableCell>

                            {/* Hierarchy & Name column with indentation guide */}
                            <TableCell>
                                <div
                                    className="flex items-center gap-1.5"
                                    style={{ paddingLeft: `${depth * 24}px` }}
                                >
                                    {/* Branch connector for child nodes */}
                                    {depth > 0 && (
                                        <span className="text-slate-300 dark:text-neutral-700 font-mono text-xs select-none mr-0.5">
                                            {isLastChild ? "└─" : "├─"}
                                        </span>
                                    )}

                                    {/* Expand/Collapse Toggle Button */}
                                    {hasChildren ? (
                                        <button
                                            type="button"
                                            onClick={() => onToggleExpand(node.id)}
                                            className="w-5 h-5 rounded hover:bg-slate-200/70 dark:hover:bg-neutral-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                                            title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                                            aria-label={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown size={13} />
                                            ) : (
                                                <ChevronRight size={13} />
                                            )}
                                        </button>
                                    ) : (
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-neutral-700" />
                                        </div>
                                    )}

                                    {/* Folder Icon */}
                                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                        {depth === 0 ? (
                                            hasChildren && isExpanded ? (
                                                <FolderOpen size={13} className="text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <FolderTree size={13} className="text-blue-600 dark:text-blue-400" />
                                            )
                                        ) : (
                                            <Folder size={13} className="text-slate-500 dark:text-neutral-400" />
                                        )}
                                    </div>

                                    {/* Name & Subcategory Badge */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className={`text-xs truncate ${
                                                depth === 0
                                                    ? "font-semibold text-slate-900 dark:text-neutral-100"
                                                    : "font-medium text-slate-700 dark:text-neutral-300"
                                            } ${isDirectMatch ? "text-amber-800 dark:text-amber-300 font-bold" : ""}`}
                                        >
                                            {node.name}
                                        </span>

                                        {hasChildren && (
                                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shrink-0">
                                                {childCount} {childCount === 1 ? "sub" : "subs"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </TableCell>

                            {/* Slug */}
                            <TableCell>
                                <span className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                                    /{node.slug}
                                </span>
                            </TableCell>

                            {/* Level / Placement */}
                            <TableCell>
                                <div className="flex items-center gap-1.5">
                                    <Badge
                                        variant={depth === 0 ? "primary" : "neutral"}
                                        size="sm"
                                        className="gap-1"
                                    >
                                        <Layers size={10} />
                                        <span>{depth === 0 ? "Top-Level" : `Level ${depth + 1}`}</span>
                                    </Badge>
                                </div>
                            </TableCell>

                            {/* Interactive Status Toggle */}
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={node.isActive !== false}
                                        onClick={() => onToggleActive(node.id, !node.isActive)}
                                        disabled={togglingActiveId === node.id}
                                        title={
                                            node.isActive !== false
                                                ? "Active: visible in catalog. Click to hide."
                                                : "Hidden: not visible to customers. Click to activate."
                                        }
                                        className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            node.isActive !== false
                                                ? "bg-emerald-500 hover:bg-emerald-600"
                                                : "bg-slate-200 dark:bg-neutral-700 hover:bg-slate-300 dark:hover:bg-neutral-600"
                                        } ${togglingActiveId === node.id ? "opacity-50 cursor-wait" : ""}`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out my-auto ${
                                                node.isActive !== false ? "translate-x-3.5" : "translate-x-0.5"
                                            }`}
                                        />
                                    </button>
                                    <span
                                        className={`text-[11px] font-medium select-none ${
                                            node.isActive !== false
                                                ? "text-emerald-700 dark:text-emerald-400"
                                                : "text-slate-400 dark:text-neutral-500"
                                        }`}
                                    >
                                        {togglingActiveId === node.id
                                            ? "..."
                                            : node.isActive !== false
                                            ? "Active"
                                            : "Hidden"}
                                    </span>
                                </div>
                            </TableCell>

                            {/* SEO Health */}
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

                            {/* Actions */}
                            <TableCell className="text-right">
                                <TableActionGroup>
                                    <TableAction
                                        icon={<Plus size={13} />}
                                        label="Add Sub"
                                        variant="default"
                                        onClick={() => onAddSubcategory(node.id)}
                                        title={`Add subcategory under "${node.name}"`}
                                    />
                                    <TableAction
                                        icon={<Edit size={13} />}
                                        label="Edit"
                                        variant="primary"
                                        onClick={() => onEdit(node.id)}
                                        title="Edit Category & SEO"
                                    />
                                    <TableAction
                                        icon={<Trash2 size={14} />}
                                        label="Delete"
                                        variant="destructive"
                                        onClick={() => onDelete(node.id)}
                                        title="Delete Category"
                                    />
                                </TableActionGroup>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
