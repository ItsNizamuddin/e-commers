"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import type {
    Recipe,
    RawMaterial,
    RawMaterialUnit,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    FormField,
    Select,
    SearchableSelect,
    Textarea,
    Modal,
    toast,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Plus,
    Trash2,
    TrendingUp,
    Sparkles,
    Scale,
    Layers,
    Save,
    Printer,
} from "lucide-react";
import { BatchSheetModal } from "./batch-sheet-modal";

function generateDefaultRecipeCode(product: any, unit: string = "1KG"): string {
    if (!product) return "";
    const slugOrTitle = product.slug || product.title || "ITEM";
    const clean = slugOrTitle
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 14);
    return `RCP-${clean}-${unit}`;
}

function generateDefaultRecipeName(product: any, unit: string = "1 kg"): string {
    if (!product) return "";
    return `${product.title} (${unit} Master Formula)`;
}

const UNITS: Array<{ label: string; value: RawMaterialUnit }> = [
    { label: "kg", value: "kg" },
    { label: "g", value: "g" },
    { label: "l", value: "l" },
    { label: "ml", value: "ml" },
    { label: "pcs", value: "pcs" },
    { label: "pack", value: "pack" },
];

export function toBaseMultiplier(qty: number, fromUnit: RawMaterialUnit, baseUnit: RawMaterialUnit): number {
    const f = fromUnit.toLowerCase();
    const b = baseUnit.toLowerCase();
    if (f === b) return qty;
    if (f === "g" && b === "kg") return qty / 1000;
    if (f === "kg" && b === "g") return qty * 1000;
    if (f === "ml" && b === "l") return qty / 1000;
    if (f === "l" && b === "ml") return qty * 1000;
    return qty;
}

interface IngredientRow {
    rawMaterialId: string;
    quantity: string;
    unit: RawMaterialUnit;
    wastagePercent: string;
}

interface PackagingRow {
    rawMaterialId: string;
    quantity: string;
    unit: RawMaterialUnit;
}

interface RecipeBuilderProps {
    initialRecipe?: Recipe | null;
    isEditing?: boolean;
}

function parseVariantWeight(variant: any): { value: number; unit: string } | null {
    if (!variant) return null;

    if (typeof variant.weight === "number" && variant.weight > 0) {
        const u = (variant.weightUnit || "g").toLowerCase();
        if (u === "kg") return { value: variant.weight * 1000, unit: "g" };
        if (u === "l" || u === "ltr" || u === "litre") return { value: variant.weight * 1000, unit: "ml" };
        return { value: variant.weight, unit: u };
    }

    const searchStr = `${variant.title || ""} ${variant.sku || ""}`;
    const match = searchStr.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|litre|litres|ml|pcs|pack|packs|pieces)?/i);
    if (match && match[1]) {
        const num = parseFloat(match[1]);
        const unitStr = (match[2] || "g").toLowerCase();
        if (unitStr === "kg") return { value: num * 1000, unit: "g" };
        if (["l", "ltr", "litre", "litres"].includes(unitStr)) return { value: num * 1000, unit: "ml" };
        if (["g", "gm", "gms"].includes(unitStr)) return { value: num, unit: "g" };
        if (["ml"].includes(unitStr)) return { value: num, unit: "ml" };
        return { value: num, unit: unitStr };
    }

    return null;
}

function extractId(val: any): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val._id?.toString() || val.id?.toString() || "";
}

export function RecipeBuilder({ initialRecipe, isEditing = false }: RecipeBuilderProps) {
    const router = useRouter();

    // Catalog state
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [code, setCode] = useState(initialRecipe?.code || "");
    const [name, setName] = useState(initialRecipe?.name || "");
    const [productId, setProductId] = useState(() => extractId(initialRecipe?.productId));
    const [variantId, setVariantId] = useState(() => {
        const directId = extractId(initialRecipe?.variantId);
        if (directId) return directId;
        if (!initialRecipe) return "__STANDARD_1KG__";
        const unit = (initialRecipe.batchYield?.unit || "").toLowerCase();
        const qty = initialRecipe.batchYield?.quantity || 1;
        if (unit === "kg" && qty === 1) return "__STANDARD_1KG__";
        if (unit === "l" && qty === 1) return "__STANDARD_1L__";
        return "";
    });
    const [shelfLifeDays, setShelfLifeDays] = useState(initialRecipe?.shelfLifeDays?.toString() || "30");
    const [yieldQty, setYieldQty] = useState(() => {
        if (initialRecipe?.batchYield?.quantity) {
            return initialRecipe.batchYield.quantity.toString();
        }
        return "1";
    });
    const [yieldUnit, setYieldUnit] = useState(() => {
        if (initialRecipe?.batchYield?.unit) {
            return initialRecipe.batchYield.unit;
        }
        return "kg";
    });
    const [laborOverhead, setLaborOverhead] = useState(initialRecipe?.laborOverheadCost?.toString() || "0");
    const [instructions, setInstructions] = useState(initialRecipe?.instructions || "");
    const [changeLog, setChangeLog] = useState("");
    const [bumpVersion, setBumpVersion] = useState(false);

    // Dynamic rows
    const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
        if (initialRecipe?.ingredients && initialRecipe.ingredients.length > 0) {
            return initialRecipe.ingredients.map((i: any) => ({
                rawMaterialId: extractId(i.rawMaterialId),
                quantity: i.quantity.toString(),
                unit: i.unit,
                wastagePercent: (i.wastagePercent || 0).toString(),
            }));
        }
        return [{ rawMaterialId: "", quantity: "1", unit: "kg", wastagePercent: "0" }];
    });

    const [packaging, setPackaging] = useState<PackagingRow[]>(() => {
        if (initialRecipe?.packagingMaterials && initialRecipe.packagingMaterials.length > 0) {
            return initialRecipe.packagingMaterials.map((p: any) => ({
                rawMaterialId: extractId(p.rawMaterialId),
                quantity: p.quantity.toString(),
                unit: p.unit,
            }));
        }
        return [];
    });

    // Costing Switcher in Sidebar Widget
    const [costingStrategy, setCostingStrategy] = useState<"WAC" | "HIGHEST">("WAC");

    // Sync to Variant Cost Modal
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Batch Sheet / Scaled Work Order Modal
    const [isBatchSheetOpen, setIsBatchSheetOpen] = useState<boolean>(false);

    // Sync state if initialRecipe changes
    useEffect(() => {
        if (!initialRecipe) return;
        if (initialRecipe.code) setCode(initialRecipe.code);
        if (initialRecipe.name) setName(initialRecipe.name);
        const pId = extractId(initialRecipe.productId);
        if (pId) setProductId(pId);

        const vId = extractId(initialRecipe.variantId);
        if (vId) {
            setVariantId(vId);
        } else {
            const unit = (initialRecipe.batchYield?.unit || "").toLowerCase();
            const qty = initialRecipe.batchYield?.quantity || 1;
            if (unit === "kg" && qty === 1) setVariantId("__STANDARD_1KG__");
            else if (unit === "l" && qty === 1) setVariantId("__STANDARD_1L__");
            else setVariantId("");
        }

        if (initialRecipe.shelfLifeDays) setShelfLifeDays(initialRecipe.shelfLifeDays.toString());
        if (initialRecipe.batchYield?.quantity) setYieldQty(initialRecipe.batchYield.quantity.toString());
        if (initialRecipe.batchYield?.unit) setYieldUnit(initialRecipe.batchYield.unit);
        if (initialRecipe.laborOverheadCost !== undefined) setLaborOverhead(initialRecipe.laborOverheadCost.toString());
        if (initialRecipe.instructions) setInstructions(initialRecipe.instructions);

        if (initialRecipe.ingredients && initialRecipe.ingredients.length > 0) {
            setIngredients(initialRecipe.ingredients.map((i: any) => ({
                rawMaterialId: extractId(i.rawMaterialId),
                quantity: i.quantity.toString(),
                unit: i.unit,
                wastagePercent: (i.wastagePercent || 0).toString(),
            })));
        }

        if (initialRecipe.packagingMaterials && initialRecipe.packagingMaterials.length > 0) {
            setPackaging(initialRecipe.packagingMaterials.map((p: any) => ({
                rawMaterialId: extractId(p.rawMaterialId),
                quantity: p.quantity.toString(),
                unit: p.unit,
            })));
        }
    }, [initialRecipe]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [matsData, prodsRes] = await Promise.all([
                api.manufacturing.listRawMaterials(),
                api.products.list({ limit: 100 }),
            ]);
            setMaterials(matsData || []);

            const productList: any[] = Array.isArray(prodsRes)
                ? prodsRes
                : (prodsRes?.items || (prodsRes as any)?.data || []);

            // If initialRecipe has a populated product, ensure it exists in products list
            const populatedProd = (initialRecipe as any)?.product ||
                (typeof initialRecipe?.productId === "object" ? initialRecipe.productId : null);
            if (populatedProd) {
                const popId = extractId(populatedProd);
                if (popId && !productList.some((p: any) => extractId(p) === popId)) {
                    productList.unshift({
                        ...populatedProd,
                        id: popId,
                        variants: (populatedProd.variants || []).map((v: any) => ({
                            ...v,
                            id: extractId(v),
                        })),
                    });
                }
            }

            setProducts(productList);

            if (!productId && productList.length > 0) {
                const firstProd = productList[0];
                const firstId = extractId(firstProd);
                setProductId(firstId);
                if (!initialRecipe) {
                    setCode((prev) => prev || generateDefaultRecipeCode(firstProd, "1KG"));
                    setName((prev) => prev || generateDefaultRecipeName(firstProd, "1 kg"));
                }
            }
        } catch (err) {
            console.error("Failed to load builder prerequisites:", err);
            toast.error("Failed to load catalog data.");
        } finally {
            setLoading(false);
        }
    }, [productId, initialRecipe]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const selectedProduct = useMemo(() => {
        const cleanProductId = extractId(productId);
        if (!cleanProductId) return null;
        const fromCatalog = products.find((p) => extractId(p) === cleanProductId || p.slug === cleanProductId);
        if (fromCatalog) return fromCatalog;

        const populatedProd = (initialRecipe as any)?.product ||
            (typeof initialRecipe?.productId === "object" ? initialRecipe.productId : null);
        if (populatedProd && (extractId(populatedProd) === cleanProductId || !cleanProductId)) {
            return {
                ...populatedProd,
                id: extractId(populatedProd),
                variants: (populatedProd.variants || []).map((v: any) => ({
                    ...v,
                    id: extractId(v),
                })),
            };
        }
        return null;
    }, [products, productId, initialRecipe]);

    const variants = useMemo(() => {
        return (selectedProduct?.variants || []).map((v: any) => ({
            ...v,
            id: extractId(v),
        }));
    }, [selectedProduct]);

    const selectedVariant = useMemo(() => {
        if (variantId && !variantId.startsWith("__STANDARD_")) {
            return variants.find((v: any) => extractId(v) === variantId);
        }
        return variants[0];
    }, [variants, variantId]);

    const sellingPrice = useMemo(() => {
        return selectedVariant?.prices?.[0]?.amount || 0;
    }, [selectedVariant]);

    const handleProductChange = (newPid: string) => {
        setProductId(newPid);
        const prod = products.find((p) => extractId(p) === newPid || p.slug === newPid);
        setVariantId("__STANDARD_1KG__");
        setYieldQty("1");
        setYieldUnit("kg");
        if (prod && !isEditing) {
            setCode(generateDefaultRecipeCode(prod, "1KG"));
            setName(generateDefaultRecipeName(prod, "1 kg"));
        }
    };

    const handleReferenceBaseChange = (val: string) => {
        setVariantId(val);
        if (val === "__STANDARD_1KG__") {
            setYieldQty("1");
            setYieldUnit("kg");
            if (selectedProduct && !isEditing) {
                setCode(generateDefaultRecipeCode(selectedProduct, "1KG"));
                setName(generateDefaultRecipeName(selectedProduct, "1 kg"));
            }
        } else if (val === "__STANDARD_1L__") {
            setYieldQty("1");
            setYieldUnit("l");
            if (selectedProduct && !isEditing) {
                setCode(generateDefaultRecipeCode(selectedProduct, "1L"));
                setName(generateDefaultRecipeName(selectedProduct, "1 L"));
            }
        } else {
            const v = variants.find((item: any) => extractId(item) === val);
            if (v && selectedProduct && !isEditing) {
                const vWeight = parseVariantWeight(v);
                const unitLabel = vWeight ? `${vWeight.value}${vWeight.unit}`.toUpperCase() : "VAR";
                setCode(generateDefaultRecipeCode(selectedProduct, unitLabel));
                setName(`${selectedProduct.title} (${v.title || unitLabel})`);
            }
        }
    };

    const handleAutoFillCodeAndName = () => {
        if (!selectedProduct) {
            toast.error("Please select a target finished product first.");
            return;
        }
        const unitSuffix = yieldUnit.toLowerCase() === "l" ? "1L" : "1KG";
        const unitText = yieldUnit.toLowerCase() === "l" ? "1 L" : "1 kg";
        setCode(generateDefaultRecipeCode(selectedProduct, unitSuffix));
        setName(generateDefaultRecipeName(selectedProduct, unitText));
        toast.success("Auto-filled Recipe Code and Name from product!");
    };

    // Filter materials by category for Ingredients vs Packaging
    const ingredientMaterials = useMemo(() => {
        return materials.filter((m) => m.category !== "PACKAGING");
    }, [materials]);

    const packagingMaterials = useMemo(() => {
        return materials.filter((m) => m.category === "PACKAGING");
    }, [materials]);

    const getIngredientOptions = useCallback(
        (selectedId: string) => {
            let list = ingredientMaterials;
            if (selectedId && !list.some((m) => extractId(m) === selectedId)) {
                const found = materials.find((m) => extractId(m) === selectedId);
                if (found) list = [found, ...list];
            }
            if (list.length === 0) {
                return [{ label: "No ingredients found", value: "" }];
            }
            return list.map((m) => ({
                label: m.name,
                subText: m.code,
                value: extractId(m),
                badge: `${m.currentStock ?? 0} ${m.unit}`,
            }));
        },
        [ingredientMaterials, materials]
    );

    const getPackagingOptions = useCallback(
        (selectedId: string) => {
            let list = packagingMaterials;
            if (selectedId && !list.some((m) => extractId(m) === selectedId)) {
                const found = materials.find((m) => extractId(m) === selectedId);
                if (found) list = [found, ...list];
            }
            if (list.length === 0) {
                return [{ label: "No packaging materials found (set category to PACKAGING)", value: "" }];
            }
            return list.map((m) => ({
                label: m.name,
                subText: m.code,
                value: extractId(m),
                badge: `${m.currentStock ?? 0} ${m.unit}`,
            }));
        },
        [packagingMaterials, materials]
    );

    const productOptions = useMemo(() => {
        return products.map((p) => ({
            label: p.title,
            subText: p.slug,
            value: extractId(p),
            badge: `${p.variants?.length || 0} variants`,
        }));
    }, [products]);

    // Add / Remove rows
    const addIngredientRow = () => {
        const defaultRm = ingredientMaterials[0] || materials[0];
        setIngredients((prev) => [
            ...prev,
            {
                rawMaterialId: defaultRm ? extractId(defaultRm) : "",
                quantity: "1",
                unit: defaultRm?.unit || "kg",
                wastagePercent: "0",
            },
        ]);
    };

    const removeIngredientRow = (index: number) => {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const addPackagingRow = () => {
        const defaultRm = packagingMaterials[0];
        setPackaging((prev) => [
            ...prev,
            {
                rawMaterialId: defaultRm ? extractId(defaultRm) : "",
                quantity: "1",
                unit: (defaultRm?.unit as any) || "pcs",
            },
        ]);
    };

    const removePackagingRow = (index: number) => {
        setPackaging((prev) => prev.filter((_, i) => i !== index));
    };

    // Live Calculation Engine
    const calculation = useMemo(() => {
        let totalIngredientsWac = 0;
        let totalIngredientsHighest = 0;
        let totalPackagingWac = 0;
        let totalPackagingHighest = 0;

        for (const ing of ingredients) {
            const qty = parseFloat(ing.quantity) || 0;
            const waste = (parseFloat(ing.wastagePercent) || 0) / 100;
            const effectiveQty = qty * (1 + waste);
            const ingRmId = extractId(ing.rawMaterialId);
            const rm = materials.find((m) => extractId(m) === ingRmId) || (ing as any).rawMaterial;
            if (!rm) continue;

            const baseQty = toBaseMultiplier(effectiveQty, ing.unit, rm.unit);
            totalIngredientsWac += baseQty * (rm.averageCost || 0);
            totalIngredientsHighest += baseQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        for (const pkg of packaging) {
            const qty = parseFloat(pkg.quantity) || 0;
            const pkgRmId = extractId(pkg.rawMaterialId);
            const rm = materials.find((m) => extractId(m) === pkgRmId) || (pkg as any).rawMaterial;
            if (!rm) continue;

            const baseQty = toBaseMultiplier(qty, pkg.unit, rm.unit);
            totalPackagingWac += baseQty * (rm.averageCost || 0);
            totalPackagingHighest += baseQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        const overhead = parseFloat(laborOverhead) || 0;
        const totalBatchWac = totalIngredientsWac + totalPackagingWac + overhead;
        const totalBatchHighest = totalIngredientsHighest + totalPackagingHighest + overhead;

        const yieldCount = parseFloat(yieldQty) || 1;
        const unitCostWac = yieldCount > 0 ? totalBatchWac / yieldCount : totalBatchWac;
        const unitCostHighest = yieldCount > 0 ? totalBatchHighest / yieldCount : totalBatchHighest;

        const activeUnitCost = costingStrategy === "WAC" ? unitCostWac : unitCostHighest;
        const activeTotalBatch = costingStrategy === "WAC" ? totalBatchWac : totalBatchHighest;
        const grossMarginPercent = sellingPrice > 0 ? ((sellingPrice - activeUnitCost) / sellingPrice) * 100 : 0;

        return {
            ingredientsSubtotal: costingStrategy === "WAC" ? totalIngredientsWac : totalIngredientsHighest,
            packagingSubtotal: costingStrategy === "WAC" ? totalPackagingWac : totalPackagingHighest,
            overheadSubtotal: overhead,
            totalBatchCost: Math.round(activeTotalBatch * 100) / 100,
            unitCost: Math.round(activeUnitCost * 100) / 100,
            unitCostWac: Math.round(unitCostWac * 100) / 100,
            unitCostHighest: Math.round(unitCostHighest * 100) / 100,
            grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
        };
    }, [ingredients, packaging, laborOverhead, yieldQty, materials, costingStrategy, sellingPrice]);

    // Live preview recipe for the Production Batch Sheet & Scaled Slip Modal
    const previewRecipeForBatchSheet = useMemo<Recipe | null>(() => {
        const prodObj = selectedProduct || { id: productId, title: name || "Product" };
        const baseQty = parseFloat(yieldQty) || 1;
        const bUnit = yieldUnit || "kg";

        const ingList = ingredients.map((i) => {
            const rm = materials.find((m) => extractId(m) === extractId(i.rawMaterialId));
            return {
                rawMaterialId: i.rawMaterialId as any,
                rawMaterial: rm,
                quantity: parseFloat(i.quantity) || 0,
                unit: i.unit,
                wastagePercent: parseFloat(i.wastagePercent) || 0,
            };
        });

        const pkgList = packaging.map((p) => {
            const rm = materials.find((m) => extractId(m) === extractId(p.rawMaterialId));
            return {
                rawMaterialId: p.rawMaterialId as any,
                rawMaterial: rm,
                quantity: parseFloat(p.quantity) || 0,
                unit: p.unit,
            };
        });

        if (initialRecipe) {
            return {
                ...initialRecipe,
                name: name || initialRecipe.name,
                code: code || initialRecipe.code,
                productId: prodObj as any,
                batchYield: {
                    quantity: baseQty,
                    unit: bUnit,
                },
                ingredients: ingList as any,
                packagingMaterials: pkgList as any,
                instructions,
                estimatedCostWac: calculation.unitCostWac,
                estimatedCostHighest: calculation.unitCostHighest,
            };
        }

        return {
            id: "preview",
            code: code || "RCP-PREVIEW",
            name: name || selectedProduct?.title || "Master Recipe",
            version: 1,
            productId: prodObj as any,
            variantId: variantId || undefined,
            batchYield: {
                quantity: baseQty,
                unit: bUnit,
            },
            shelfLifeDays: parseInt(shelfLifeDays, 10) || 30,
            ingredients: ingList as any,
            packagingMaterials: pkgList as any,
            instructions,
            laborOverheadCost: parseFloat(laborOverhead) || 0,
            estimatedCostWac: calculation.unitCostWac,
            estimatedCostHighest: calculation.unitCostHighest,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        } as any;
    }, [
        initialRecipe,
        selectedProduct,
        productId,
        name,
        code,
        yieldQty,
        yieldUnit,
        ingredients,
        materials,
        packaging,
        instructions,
        calculation,
        variantId,
        shelfLifeDays,
        laborOverhead,
    ]);

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !name.trim() || !productId) {
            toast.error("Please fill in Recipe Code, Name, and Finished Product.");
            return;
        }

        const validIngredients = ingredients
            .filter((i) => i.rawMaterialId && parseFloat(i.quantity) > 0)
            .map((i) => ({
                rawMaterialId: i.rawMaterialId,
                quantity: parseFloat(i.quantity),
                unit: i.unit,
                wastagePercent: parseFloat(i.wastagePercent) || 0,
            }));

        if (validIngredients.length === 0) {
            toast.error("Please add at least one valid ingredient.");
            return;
        }

        const validPackaging = packaging
            .filter((p) => p.rawMaterialId && parseFloat(p.quantity) > 0)
            .map((p) => ({
                rawMaterialId: p.rawMaterialId,
                quantity: parseFloat(p.quantity),
                unit: p.unit,
            }));

        setIsSaving(true);
        try {
            if (isEditing && initialRecipe) {
                const res = await api.manufacturing.updateRecipe(initialRecipe.id, {
                    name: name.trim(),
                    shelfLifeDays: parseInt(shelfLifeDays, 10) || 30,
                    batchYield: {
                        quantity: parseFloat(yieldQty) || 1,
                        unit: yieldUnit.trim(),
                    },
                    ingredients: validIngredients,
                    packagingMaterials: validPackaging,
                    laborOverheadCost: parseFloat(laborOverhead) || 0,
                    instructions: instructions.trim() || undefined,
                    changeLog: changeLog.trim() || undefined,
                    bumpVersion,
                });

                toast.success(bumpVersion ? `Bumped recipe to v${res.version}!` : "Recipe updated successfully!");
                router.push("/recipes");
            } else {
                const sanitizedVariantId = (variantId && !variantId.startsWith("__STANDARD_")) ? variantId : undefined;
                await api.manufacturing.createRecipe({
                    code: code.trim().toUpperCase(),
                    name: name.trim(),
                    productId,
                    variantId: sanitizedVariantId,
                    shelfLifeDays: parseInt(shelfLifeDays, 10) || 30,
                    batchYield: {
                        quantity: parseFloat(yieldQty) || 1,
                        unit: yieldUnit.trim(),
                    },
                    ingredients: validIngredients,
                    packagingMaterials: validPackaging,
                    laborOverheadCost: parseFloat(laborOverhead) || 0,
                    instructions: instructions.trim() || undefined,
                    changeLog: changeLog.trim() || "Initial recipe formulation",
                });

                toast.success("Master recipe created successfully!");
                router.push("/recipes");
            }
        } catch (err: unknown) {
            console.error("Failed to save recipe:", err);
            const msg = err instanceof Error ? err.message : "Failed to save recipe.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncCostToVariant = async () => {
        if (!selectedProduct || !selectedVariant) {
            toast.error("No product or variant selected.");
            return;
        }

        setIsSyncing(true);
        try {
            await api.manufacturing.syncVariantCost({
                productId: selectedProduct.id,
                variantId: selectedVariant.id,
                costAmount: calculation.unitCost,
                currency: selectedProduct.baseCurrency || "INR",
            });
            toast.success(
                `Synced production cost ₹${calculation.unitCost.toFixed(2)} to ${selectedProduct.title} (${selectedVariant.title})!`
            );
            setIsSyncModalOpen(false);
        } catch (err: unknown) {
            console.error("Failed to sync cost:", err);
            const msg = err instanceof Error ? err.message : "Failed to sync cost.";
            toast.error(msg);
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-28">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading recipe formula engine...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSaveRecipe} className="space-y-6 pb-24 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/recipes"
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {isEditing ? `Edit Recipe: ${name || code}` : "Formulate New Recipe (BOM)"}
                            </h1>
                            {isEditing && initialRecipe && (
                                <Badge variant="primary" size="sm">
                                    v{initialRecipe.version}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Define raw material composition, cooking loss/wastage, packaging, and shelf life
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBatchSheetOpen(true)}
                        className="gap-1.5 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300"
                    >
                        <Printer size={13} />
                        <span>Batch Slip / Work Order</span>
                    </Button>
                    <Link href="/recipes">
                        <Button type="button" variant="outline" size="sm">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSaving}
                        className="gap-1.5 font-bold px-4"
                    >
                        {isSaving ? <Spinner size="sm" /> : <Save size={14} />}
                        <span>{isEditing ? (bumpVersion ? "Bump to Next Version" : "Save Changes") : "Create Recipe"}</span>
                    </Button>
                </div>
            </div>

            {/* Layout: Main Form Left (2/3) + Sticky Live Cost Widget Right (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Recipe Form Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Recipe Information */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Layers size={16} className="text-blue-600" />
                                <span>1. Finished Product Assignment & Base Formula</span>
                            </h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoFillCodeAndName}
                                className="gap-1 text-[11px] h-7 px-2.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60"
                            >
                                <Sparkles size={12} />
                                <span>✨ Auto-Fill Code & Name</span>
                            </Button>
                        </div>

                        {/* First Row: Target Finished Product & Formula Reference Base */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField label="Target Finished Product" required>
                                <SearchableSelect
                                    value={productId}
                                    onChange={handleProductChange}
                                    options={productOptions}
                                    placeholder="-- Select finished product --"
                                    searchPlaceholder="Search product by title, slug..."
                                    size="sm"
                                    pageSize={15}
                                />
                            </FormField>

                            <FormField label="Formula Reference Base">
                                <Select
                                    value={variantId}
                                    onChange={(e) => handleReferenceBaseChange(e.target.value)}
                                    options={[
                                        { label: "⭐ Standard 1 kg Base (Universal Master Formula - Recommended)", value: "__STANDARD_1KG__" },
                                        { label: "⭐ Standard 1 Liter Base (Universal Master Formula - Recommended)", value: "__STANDARD_1L__" },
                                        { label: "Generic Master / All Variants", value: "" },
                                        ...variants.map((v: any) => ({
                                            label: `Specific Variant: ${v.title} (SKU: ${v.sku})`,
                                            value: extractId(v),
                                        })),
                                    ]}
                                />
                            </FormField>
                        </div>

                        {/* Second Row: Recipe Code / SKU & Recipe Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField label="Recipe Code / SKU" required>
                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="e.g. RCP-SWEET-1KG"
                                    className="font-mono text-xs uppercase"
                                    disabled={isEditing}
                                    required
                                />
                            </FormField>

                            <FormField label="Recipe Name" required>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Sweet product (1 kg Master Formula)"
                                    className="text-xs"
                                    required
                                />
                            </FormField>
                        </div>

                        <div className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2.5">
                            <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-blue-950 dark:text-blue-200 font-bold">
                                    {variantId === "__STANDARD_1L__"
                                        ? "Standard 1 Liter Base Mode Active"
                                        : variantId === "__STANDARD_1KG__" || (!variantId && yieldUnit.toLowerCase() === "kg")
                                            ? "Standard 1 kg Base Mode Active (Best Practice)"
                                            : `Specific Variant Base Mode: ${selectedVariant?.title || "Selected Variety"}`}
                                </p>
                                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                                    {variantId === "__STANDARD_1KG__" || (!variantId && yieldUnit.toLowerCase() === "kg")
                                        ? "Enter ingredients required to make 1 kg of finished product. You can instantly scale raw materials to any production quantity (e.g. 50 kg, 100 kg) and print production slips using the Factory Batch Slip button."
                                        : variantId === "__STANDARD_1L__"
                                            ? "Enter ingredients required to make 1 Liter of finished liquid product. You can instantly scale raw materials to any batch quantity and print production slips using the Factory Batch Slip button."
                                            : `Enter ingredients for this recipe (${selectedVariant?.title || "selected"}). You can scale to any batch quantity and print production slips using the Factory Batch Slip button.`}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-1">
                            <FormField label="Batch Output Yield" required>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0.001"
                                    value={yieldQty}
                                    onChange={(e) => setYieldQty(e.target.value)}
                                    placeholder="10"
                                    className="font-mono text-xs"
                                    required
                                />
                            </FormField>

                            <FormField label="Yield Unit" required>
                                <Input
                                    value={yieldUnit}
                                    onChange={(e) => setYieldUnit(e.target.value)}
                                    placeholder="boxes / packs"
                                    className="text-xs"
                                    required
                                />
                            </FormField>

                            <FormField label="Shelf Life (Days)" required>
                                <Input
                                    type="number"
                                    min="1"
                                    value={shelfLifeDays}
                                    onChange={(e) => setShelfLifeDays(e.target.value)}
                                    placeholder="30"
                                    className="font-mono text-xs"
                                    required
                                />
                            </FormField>
                        </div>
                    </Card>

                    {/* Ingredients Section */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Scale size={16} className="text-emerald-600" />
                                    <span>2. Raw Material Ingredients</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Specify exact ingredient quantities and optional cooking loss/moisture shrinkage percentage
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addIngredientRow}
                                className="gap-1 text-xs h-7"
                            >
                                <Plus size={12} />
                                <span>Add Ingredient</span>
                            </Button>
                        </div>

                        <div className="space-y-2.5">
                            {ingredients.map((row, idx) => {
                                const rowRmId = extractId(row.rawMaterialId);
                                const rm = materials.find((m) => extractId(m) === rowRmId) || (row as any).rawMaterial;
                                const unitRate = costingStrategy === "WAC" ? (rm?.averageCost || 0) : (rm?.lastPurchasePrice || rm?.averageCost || 0);
                                const qty = parseFloat(row.quantity) || 0;
                                const waste = (parseFloat(row.wastagePercent) || 0) / 100;
                                const effectiveQty = qty * (1 + waste);
                                const baseQty = rm ? toBaseMultiplier(effectiveQty, row.unit, rm.unit) : 0;
                                const lineAmount = baseQty * unitRate;

                                return (
                                    <div
                                        key={idx}
                                        className="p-3 bg-slate-50/80 dark:bg-neutral-900/60 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Raw Material
                                            </label>
                                            <SearchableSelect
                                                value={rowRmId}
                                                onChange={(val) => {
                                                    const found = materials.find((m) => extractId(m) === val);
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) =>
                                                            i === idx
                                                                ? { ...r, rawMaterialId: val, unit: found ? found.unit : r.unit }
                                                                : r
                                                        )
                                                    );
                                                }}
                                                options={getIngredientOptions(rowRmId)}
                                                placeholder="-- Select ingredient --"
                                                searchPlaceholder="Search ingredient name, code..."
                                                size="sm"
                                                pageSize={15}
                                            />
                                        </div>

                                        <div className="w-20 shrink-0">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Quantity
                                            </label>
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0.001"
                                                value={row.quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                                                    );
                                                }}
                                                className="text-xs font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="w-20 shrink-0">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Unit
                                            </label>
                                            <Select
                                                value={row.unit}
                                                onChange={(e) => {
                                                    const val = e.target.value as RawMaterialUnit;
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, unit: val } : r))
                                                    );
                                                }}
                                                options={UNITS}
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="w-20 shrink-0">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1" title="Cooking / moisture evaporation loss percentage">
                                                Wastage %
                                            </label>
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0"
                                                max="100"
                                                value={row.wastagePercent}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, wastagePercent: val } : r))
                                                    );
                                                }}
                                                placeholder="0"
                                                className="text-xs font-mono"
                                            />
                                        </div>

                                        <div className="w-28 shrink-0 text-right">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Amount / Rate
                                            </label>
                                            <div className="h-8 flex flex-col justify-center">
                                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                                    ₹{lineAmount.toFixed(2)}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block -mt-0.5">
                                                    @ ₹{unitRate.toFixed(2)}/{rm?.unit || "unit"}{waste > 0 ? ` (+${(waste * 100).toFixed(0)}%)` : ""}
                                                </span>
                                            </div>
                                        </div>

                                        {ingredients.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => removeIngredientRow(idx)}
                                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 mt-5"
                                                title="Remove ingredient"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        ) : (
                                            <div className="w-7 shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Packaging Materials Section */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles size={16} className="text-purple-600" />
                                    <span>3. Packaging Materials (Boxes, Pouches, Labels)</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Packaging items consumed per batch to reflect true Cost of Goods Sold (COGS)
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addPackagingRow}
                                className="gap-1 text-xs h-7"
                            >
                                <Plus size={12} />
                                <span>Add Packaging</span>
                            </Button>
                        </div>

                        {packagingMaterials.length === 0 && (
                            <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                                💡 Tip: To add items like boxes, pouches, or labels here, go to <strong>Raw Materials</strong> and set their category to <strong>&quot;Packaging Materials&quot;</strong>.
                            </div>
                        )}

                        {packaging.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 text-center">
                                <p className="text-xs text-slate-400">
                                    No packaging materials added yet. Click &quot;Add Packaging&quot; to include boxes or labels.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {packaging.map((row, idx) => {
                                    const rowRmId = extractId(row.rawMaterialId);
                                    const rm = materials.find((m) => extractId(m) === rowRmId) || (row as any).rawMaterial;
                                    const unitRate = costingStrategy === "WAC" ? (rm?.averageCost || 0) : (rm?.lastPurchasePrice || rm?.averageCost || 0);
                                    const qty = parseFloat(row.quantity) || 0;
                                    const baseQty = rm ? toBaseMultiplier(qty, row.unit, rm.unit) : 0;
                                    const pkgAmount = baseQty * unitRate;

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3 bg-slate-50/80 dark:bg-neutral-900/60 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Packaging Item
                                                </label>
                                                <SearchableSelect
                                                    value={rowRmId}
                                                    onChange={(val) => {
                                                        const found = materials.find((m) => extractId(m) === val);
                                                        setPackaging((prev) =>
                                                            prev.map((r, i) =>
                                                                i === idx
                                                                    ? { ...r, rawMaterialId: val, unit: found ? (found.unit as any) : r.unit }
                                                                    : r
                                                            )
                                                        );
                                                    }}
                                                    options={getPackagingOptions(rowRmId)}
                                                    placeholder="-- Select packaging item --"
                                                    searchPlaceholder="Search packaging item, code..."
                                                    size="sm"
                                                    pageSize={15}
                                                />
                                            </div>

                                            <div className="w-24 shrink-0">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Quantity
                                                </label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="0.001"
                                                    value={row.quantity}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setPackaging((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                                                        );
                                                    }}
                                                    className="text-xs font-mono"
                                                    required
                                                />
                                            </div>

                                            <div className="w-20 shrink-0">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Unit
                                                </label>
                                                <Select
                                                    value={row.unit}
                                                    onChange={(e) => {
                                                        const val = e.target.value as RawMaterialUnit;
                                                        setPackaging((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, unit: val } : r))
                                                        );
                                                    }}
                                                    options={UNITS}
                                                    className="text-xs"
                                                />
                                            </div>

                                            <div className="w-28 shrink-0 text-right">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Amount / Rate
                                                </label>
                                                <div className="h-8 flex flex-col justify-center">
                                                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                                        ₹{pkgAmount.toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block -mt-0.5">
                                                        @ ₹{unitRate.toFixed(2)}/{rm?.unit || "unit"}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removePackagingRow(idx)}
                                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 mt-5"
                                                title="Remove packaging item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Overheads & Instructions */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            4. Overheads & Instructions
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Batch Overhead / Cooking Gas / Labor (₹)">
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={laborOverhead}
                                    onChange={(e) => setLaborOverhead(e.target.value)}
                                    placeholder="0.00"
                                    className="text-xs font-mono"
                                />
                            </FormField>

                            <FormField label="Version Changelog / Notes">
                                <Input
                                    value={changeLog}
                                    onChange={(e) => setChangeLog(e.target.value)}
                                    placeholder="e.g. Decreased sugar by 5%, added cardamom"
                                    className="text-xs"
                                />
                            </FormField>
                        </div>

                        <FormField label="Kitchen Preparation Steps / Cook Notes">
                            <Textarea
                                rows={3}
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="1. Boil milk slowly until 50% reduced. 2. Knead dough..."
                                className="text-xs"
                            />
                        </FormField>

                        {isEditing && (
                            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                                        Bump Version to v{(initialRecipe?.version || 1) + 1}?
                                    </span>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                        Archives v{initialRecipe?.version} and creates a new immutable version for future production.
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-200">
                                    <input
                                        type="checkbox"
                                        checked={bumpVersion}
                                        onChange={(e) => setBumpVersion(e.target.checked)}
                                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>Bump Version</span>
                                </label>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Side: Sticky Live Costing & Margin Widget */}
                <div className="space-y-4">
                    <div className="sticky top-20 space-y-4">
                        <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-600" />
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Live Cost Breakdown
                                    </h3>
                                </div>
                                <Badge variant="primary" size="sm">Real-Time</Badge>
                            </div>

                            {/* Mode Switcher */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Calculation Mode:
                                </label>
                                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setCostingStrategy("WAC")}
                                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${costingStrategy === "WAC"
                                            ? "bg-white dark:bg-[#151515] text-blue-600 shadow-xs"
                                            : "text-slate-500 hover:text-slate-900"
                                            }`}
                                    >
                                        WAC (Stock)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCostingStrategy("HIGHEST")}
                                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${costingStrategy === "HIGHEST"
                                            ? "bg-white dark:bg-[#151515] text-rose-600 shadow-xs"
                                            : "text-slate-500 hover:text-slate-900"
                                            }`}
                                    >
                                        Highest / Replace
                                    </button>
                                </div>
                            </div>

                            {/* Cost Items */}
                            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-neutral-800/60 pt-1">
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-500">Ingredients Subtotal:</span>
                                    <span className="font-mono font-semibold">₹{calculation.ingredientsSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-500">Packaging Subtotal:</span>
                                    <span className="font-mono font-semibold">₹{calculation.packagingSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-500">Batch Overhead / Gas:</span>
                                    <span className="font-mono font-semibold">₹{calculation.overheadSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t font-bold">
                                    <span className="text-slate-800 dark:text-slate-200">Total Batch Cost:</span>
                                    <span className="font-mono text-blue-600">₹{calculation.totalBatchCost.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Unit Cost Hero Display */}
                            <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 text-center">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Estimated Cost per {yieldUnit || "Unit"}
                                </span>
                                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                                    ₹{calculation.unitCost.toFixed(2)}
                                </p>
                                <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400 mt-1.5">
                                    <span>WAC: ₹{calculation.unitCostWac.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>Highest: ₹{calculation.unitCostHighest.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Profit Margin Preview */}
                            {sellingPrice > 0 && (
                                <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-neutral-900 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-emerald-800 dark:text-emerald-300 font-medium">Selling Price:</span>
                                        <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100">
                                            ₹{sellingPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-emerald-800 dark:text-emerald-300 font-medium">Gross Profit Margin:</span>
                                        <span className="font-mono font-extrabold text-emerald-600 text-sm">
                                            {calculation.grossMarginPercent}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsBatchSheetOpen(true)}
                                    className="w-full text-xs font-semibold gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 shadow-xs"
                                >
                                    <Printer size={13} />
                                    <span>🖨️ Factory Batch Slip / Scale</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsSyncModalOpen(true)}
                                    className="w-full text-xs font-semibold"
                                >
                                    Apply Cost to Product Variant
                                </Button>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    disabled={isSaving}
                                    className="w-full font-bold gap-2 text-xs"
                                >
                                    {isSaving ? <Spinner size="sm" /> : <Save size={14} />}
                                    <span>{isEditing ? (bumpVersion ? "Bump to Next Version" : "Save Formula") : "Save Recipe"}</span>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Sync Cost Confirmation Modal */}
            <Modal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                title="Sync Recipe Cost to Product Variant"
                maxWidth="md"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-xs text-slate-600 dark:text-neutral-300">
                        This will update the cost price (<span className="font-mono font-bold">costAmount</span>) for:
                    </p>

                    <div className="p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs space-y-1">
                        <p><span className="text-slate-400">Product:</span> <span className="font-bold">{selectedProduct?.title}</span></p>
                        <p><span className="text-slate-400">Variant:</span> <span className="font-bold">{selectedVariant?.title || "Default"}</span></p>
                        <p><span className="text-slate-400">Currency:</span> <span className="font-bold font-mono">{selectedProduct?.baseCurrency || "INR"}</span></p>
                        <p><span className="text-slate-400">New Cost Amount:</span> <span className="font-bold font-mono text-emerald-600">₹{calculation.unitCost.toFixed(2)}</span></p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSyncModalOpen(false)}
                            disabled={isSyncing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSyncCostToVariant}
                            disabled={isSyncing}
                            className="gap-1.5 font-bold"
                        >
                            {isSyncing && <Spinner size="sm" />}
                            <span>Confirm & Sync Cost</span>
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Production Batch Sheet & Scaled Work Order Modal */}
            <BatchSheetModal
                isOpen={isBatchSheetOpen}
                onClose={() => setIsBatchSheetOpen(false)}
                recipe={previewRecipeForBatchSheet}
                onBatchCreated={(batchNum) => {
                    toast.success(`Production batch ${batchNum} scheduled!`);
                    router.push("/recipes");
                }}
            />
        </form>
    );
}
