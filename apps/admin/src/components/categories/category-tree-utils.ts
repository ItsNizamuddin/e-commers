import type { CategoryResponse, CategoryTreeNode } from "@ecommers/types";

export interface FlattenedTreeRow {
    node: CategoryTreeNode;
    depth: number;
    hasChildren: boolean;
    childCount: number;
    isExpanded: boolean;
    isLastChild: boolean;
    ancestorIsLast: boolean[];
}

/**
 * Builds a hierarchical tree from a flat list of CategoryResponse items.
 */
export function buildCategoryTree(categories: CategoryResponse[]): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // Initialize all nodes with empty children array
    for (const cat of categories) {
        map.set(cat.id, {
            ...cat,
            children: [],
        });
    }

    // Connect parents and children
    for (const cat of categories) {
        const node = map.get(cat.id)!;
        if (cat.parentId && map.has(cat.parentId)) {
            const parent = map.get(cat.parentId)!;
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    // Recursive sorter by sortOrder then name
    const sortNodes = (nodes: CategoryTreeNode[]) => {
        nodes.sort((a, b) => {
            if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) {
                return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            }
            return a.name.localeCompare(b.name);
        });
        for (const node of nodes) {
            if (node.children.length > 0) {
                sortNodes(node.children);
            }
        }
    };

    sortNodes(roots);
    return roots;
}

/**
 * Flattens visible nodes of the category tree based on which parent IDs are expanded.
 */
export function flattenCategoryTree(
    tree: CategoryTreeNode[],
    expandedIds: Set<string>,
    depth = 0,
    ancestorIsLast: boolean[] = []
): FlattenedTreeRow[] {
    const rows: FlattenedTreeRow[] = [];

    tree.forEach((node, index) => {
        const isLastChild = index === tree.length - 1;
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);

        rows.push({
            node,
            depth,
            hasChildren,
            childCount: node.children ? node.children.length : 0,
            isExpanded,
            isLastChild,
            ancestorIsLast,
        });

        if (hasChildren && isExpanded) {
            const childRows = flattenCategoryTree(
                node.children,
                expandedIds,
                depth + 1,
                [...ancestorIsLast, isLastChild]
            );
            rows.push(...childRows);
        }
    });

    return rows;
}

/**
 * Collects IDs of all nodes that have at least one child (branches).
 */
export function getAllBranchIds(nodes: CategoryTreeNode[]): Set<string> {
    const ids = new Set<string>();

    const traverse = (list: CategoryTreeNode[]) => {
        for (const item of list) {
            if (item.children && item.children.length > 0) {
                ids.add(item.id);
                traverse(item.children);
            }
        }
    };

    traverse(nodes);
    return ids;
}

/**
 * Filters the category tree by a search query and returns the matching tree
 * along with the set of parent IDs that need to be auto-expanded so matches are visible.
 */
export function filterCategoryTree(
    categories: CategoryResponse[],
    query: string
): { filteredTree: CategoryTreeNode[]; matchedIds: Set<string>; autoExpandIds: Set<string> } {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
        const tree = buildCategoryTree(categories);
        return {
            filteredTree: tree,
            matchedIds: new Set(),
            autoExpandIds: new Set(),
        };
    }

    const catMap = new Map<string, CategoryResponse>();
    categories.forEach((c) => catMap.set(c.id, c));

    const matchedIds = new Set<string>();
    const autoExpandIds = new Set<string>();
    const includeIds = new Set<string>();

    // 1. Identify directly matching categories
    for (const cat of categories) {
        const nameMatch = cat.name.toLowerCase().includes(trimmed);
        const slugMatch = cat.slug.toLowerCase().includes(trimmed);
        const descMatch = (cat.description || "").toLowerCase().includes(trimmed);

        if (nameMatch || slugMatch || descMatch) {
            matchedIds.add(cat.id);
            includeIds.add(cat.id);

            // Traverse ancestors and add them so the path to this match is preserved
            let currParentId = cat.parentId;
            while (currParentId && catMap.has(currParentId)) {
                includeIds.add(currParentId);
                autoExpandIds.add(currParentId);
                const parent = catMap.get(currParentId)!;
                currParentId = parent.parentId;
            }
        }
    }

    // Filter categories to only those in includeIds
    const filteredList = categories.filter((c) => includeIds.has(c.id));
    const filteredTree = buildCategoryTree(filteredList);

    return {
        filteredTree,
        matchedIds,
        autoExpandIds,
    };
}

export interface ReorderResult {
    updatedCategories: CategoryResponse[];
    changedCategories: { id: string; sortOrder: number; parentId?: string | null }[];
}

/**
 * Reorders a category relative to another category (before or after it)
 * and recalculates clean sequential sortOrder values for all affected siblings.
 */
export function reorderCategoryList(
    categories: CategoryResponse[],
    sourceId: string,
    targetId: string,
    position: "before" | "after"
): ReorderResult | null {
    if (sourceId === targetId) return null;

    const sourceCat = categories.find((c) => c.id === sourceId);
    const targetCat = categories.find((c) => c.id === targetId);
    if (!sourceCat || !targetCat) return null;

    // Prevent dragging a parent category into its own descendants
    if (targetCat.ancestors && targetCat.ancestors.includes(sourceId)) {
        return null;
    }

    const targetParentId = targetCat.parentId || null;
    const isChangingParent = (sourceCat.parentId || null) !== targetParentId;

    // Get all siblings in target's parent group, sorted by existing sortOrder then name
    const siblings = categories
        .filter((c) => (c.parentId || null) === targetParentId && c.id !== sourceId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    // Find insertion index in siblings
    const targetIndex = siblings.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) return null;

    const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
    siblings.splice(insertIndex, 0, {
        ...sourceCat,
        parentId: targetParentId,
    });

    // Recompute sortOrder with clean increments (e.g. 0, 10, 20, 30...)
    const changedCategories: { id: string; sortOrder: number; parentId?: string | null }[] = [];
    const updatedOrderMap = new Map<string, { sortOrder: number; parentId?: string | null }>();

    siblings.forEach((cat, idx) => {
        const newSortOrder = idx * 10;
        const parentChanged = cat.id === sourceId && isChangingParent;
        if (cat.sortOrder !== newSortOrder || parentChanged) {
            changedCategories.push({
                id: cat.id,
                sortOrder: newSortOrder,
                ...(parentChanged ? { parentId: targetParentId } : {}),
            });
            updatedOrderMap.set(cat.id, {
                sortOrder: newSortOrder,
                ...(parentChanged ? { parentId: targetParentId } : {}),
            });
        }
    });

    // Update overall categories list
    const updatedCategories = categories.map((c) => {
        const update = updatedOrderMap.get(c.id);
        if (update) {
            return {
                ...c,
                sortOrder: update.sortOrder,
                ...(update.parentId !== undefined ? { parentId: update.parentId } : {}),
            };
        }
        return c;
    });

    return {
        updatedCategories,
        changedCategories,
    };
}

