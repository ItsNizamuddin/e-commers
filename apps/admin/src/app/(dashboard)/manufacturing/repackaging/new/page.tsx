"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    useGetRawMaterialsQuery,
    useGetProductsQuery,
    useGetAdminLocationsQuery,
    useGetRawMaterialLotsQuery,
    useCreateRepackagingRunMutation,
} from "../../../../../store/api";
import type {
    RawMaterialUnit,
    ProductVariant,
} from "@ecommers/types";
import {
    Card,
    Button,
    Input,
    Spinner,
    FormField,
    SearchableSelect,
    toast,
} from "@ecommers/ui";
import {
    Layers,
    ArrowLeft,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Store,
    ShieldCheck,
    Coins,
} from "lucide-react";

const UNIT_CONVERSIONS: Record<string, number> = {
    // Mass to grams
    mg: 0.001,
    g: 1,
    kg: 1000,
    ton: 1000000,
    // Volume to ml
    ml: 1,
    l: 1000,
    // Count
    pcs: 1,
    units: 1,
    pack: 1,
    box: 1,
};

function convertQuantity(qty: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return qty;
    const fromFactor = UNIT_CONVERSIONS[fromUnit];
    const toFactor = UNIT_CONVERSIONS[toUnit];
    if (fromFactor && toFactor) {
        return (qty * fromFactor) / toFactor;
    }
    return qty;
}

function formatStock(val: number | undefined | null, maxDecimals: number = 2): string {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return Number(val.toFixed(maxDecimals)).toString();
}

function parseVariantUnitSize(v: ProductVariant | undefined): { qty: number; unit: RawMaterialUnit } | null {
    if (!v) return null;
    if (v.weight && v.weight > 0) {
        const wu = (v.weightUnit || "g").toLowerCase();
        let u: RawMaterialUnit = "g";
        if (wu === "kg") u = "kg";
        else if (wu === "g" || wu === "gm" || wu === "gms") u = "g";
        else if (wu === "l" || wu === "ltr" || wu === "liter") u = "l";
        else if (wu === "ml") u = "ml";
        return { qty: v.weight, unit: u };
    }
    const text = `${v.title || ""} ${v.sku || ""}`.toLowerCase();
    const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|liter|liters|ml|pcs|pack)/i);
    if (match) {
        const val = parseFloat(match[1]);
        const uRaw = match[2].toLowerCase();
        let u: RawMaterialUnit = "kg";
        if (uRaw === "kg") u = "kg";
        else if (uRaw === "g" || uRaw === "gm" || uRaw === "gms") u = "g";
        else if (uRaw === "l" || uRaw === "ltr" || uRaw === "liter" || uRaw === "liters") u = "l";
        else if (uRaw === "ml") u = "ml";
        else if (uRaw === "pcs") u = "pcs";
        else if (uRaw === "pack") u = "pack";
        return { qty: val, unit: u };
    }
    return null;
}

export default function NewRepackagingRunPage() {
    const router = useRouter();

    const { data: materials = [], isLoading: loadingMaterials } = useGetRawMaterialsQuery();
    const { data: productsData, isLoading: loadingProducts } = useGetProductsQuery({ limit: 100 });
    const { data: locations = [], isLoading: loadingLocations } = useGetAdminLocationsQuery();

    const products = productsData?.items || [];
    const loadingData = loadingMaterials || loadingProducts || loadingLocations;

    const packagingMaterials = useMemo(() => {
        return materials.filter((m) => m.category === "PACKAGING");
    }, [materials]);

    // Form selection states
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
    const [selectedLotId, setSelectedLotId] = useState<string>("");

    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");

    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
    const [selectedPackagingMaterialId, setSelectedPackagingMaterialId] = useState<string>("");

    // Quantities
    const [packageUnitsProduced, setPackageUnitsProduced] = useState<number>(10);
    const [unitSizeQuantity, setUnitSizeQuantity] = useState<number>(1);
    const [unitSizeUnit, setUnitSizeUnit] = useState<RawMaterialUnit>("kg");
    const [wastageQuantity, setWastageQuantity] = useState<number>(0);
    const [notes, setNotes] = useState<string>("");

    const [createRepackagingRun, { isLoading: submitting }] = useCreateRepackagingRunMutation();

    // Repackable Materials Filter:
    // Only show manufactured bulk foods from cooking batches or sellable bulk commodities.
    // Exclude packaging materials (jars, caps) and raw internal cooking spices with no retail variety.
    const repackableMaterials = useMemo(() => {
        return materials.filter((m) => {
            if (m.category === "PACKAGING") return false;
            // Always include manufactured bulk items or items with linked products or items with bulk code
            if (m.code?.startsWith("BLK-") || m.name?.toLowerCase().includes("bulk") || m.linkedProductId) return true;
            // Include commodities configured for selling or both
            if (m.usage === "SELLABLE" || m.usage === "BOTH") return true;
            return false;
        });
    }, [materials]);

    const sortedRepackableMaterials = useMemo(() => {
        return [...repackableMaterials].sort((a, b) => {
            const aIsBulk = a.code?.startsWith("BLK-") || a.linkedProductId || a.name?.toLowerCase().includes("bulk") ? 1 : 0;
            const bIsBulk = b.code?.startsWith("BLK-") || b.linkedProductId || b.name?.toLowerCase().includes("bulk") ? 1 : 0;
            if (aIsBulk !== bIsBulk) return bIsBulk - aIsBulk;

            if ((a.currentStock > 0) !== (b.currentStock > 0)) {
                return a.currentStock > 0 ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [repackableMaterials]);

    // Default material: prioritize manufactured bulk stock with available balance
    useEffect(() => {
        if (!selectedMaterialId && sortedRepackableMaterials.length > 0) {
            const defaultMat =
                sortedRepackableMaterials.find((m) => (m.code?.startsWith("BLK-") || m.linkedProductId) && m.currentStock > 0) ||
                sortedRepackableMaterials.find((m) => m.currentStock > 0) ||
                sortedRepackableMaterials[0];
            if (defaultMat) {
                const mId = defaultMat.id || (defaultMat as any)._id || "";
                setSelectedMaterialId(mId);
                setUnitSizeUnit(defaultMat.unit);
            }
        }
    }, [sortedRepackableMaterials, selectedMaterialId]);

    // Default warehouse
    useEffect(() => {
        if (!selectedWarehouseId && locations.length > 0) {
            setSelectedWarehouseId(locations[0]!.id);
        }
    }, [locations, selectedWarehouseId]);

    // Query active lots for selected material
    const {
        data: rawLots = [],
        isLoading: loadingLots,
    } = useGetRawMaterialLotsQuery(
        { rawMaterialId: selectedMaterialId },
        { skip: !selectedMaterialId }
    );

    const materialLots = useMemo(() => {
        return (rawLots || []).filter((l) => !l.isDepleted && l.availableQuantity > 0);
    }, [rawLots]);

    // When materialLots change, auto-select first lot
    useEffect(() => {
        if (materialLots.length > 0) {
            setSelectedLotId((prev) => {
                if (prev && materialLots.some((l) => (l.id || (l as any)._id) === prev)) {
                    return prev;
                }
                return materialLots[0]!.id || (materialLots[0]! as any)._id || "";
            });
        } else {
            setSelectedLotId("");
        }
    }, [materialLots]);

    // When Material changes: pre-select linked product and variant
    useEffect(() => {
        if (!selectedMaterialId) return;
        const currentMat = materials.find((m) => String(m.id || (m as any)._id) === String(selectedMaterialId));
        if (!currentMat) return;

        // 1. Direct link on raw material document
        if (currentMat.linkedProductId) {
            const rawProdId = String((currentMat.linkedProductId as any)?._id || currentMat.linkedProductId);
            setSelectedProductId(rawProdId);
            if (currentMat.linkedVariantId) {
                const rawVarId = String((currentMat.linkedVariantId as any)?._id || currentMat.linkedVariantId);
                setSelectedVariantId(rawVarId);
            } else {
                setSelectedVariantId("");
            }
            return;
        }

        // 2. Intelligent match by product title
        const cleanMatName = currentMat.name
            .replace(/\(Bulk\)/i, "")
            .replace(/\(1 kg Master Formula\)/i, "")
            .trim()
            .toLowerCase();

        const matchedProd = products.find((p) => {
            const pTitle = p.title.toLowerCase();
            return pTitle.includes(cleanMatName) || cleanMatName.includes(pTitle);
        });

        if (matchedProd) {
            setSelectedProductId(String(matchedProd.id || (matchedProd as any)._id));
            setSelectedVariantId("");
        } else {
            // Material has no matching product: reset both product & variant
            setSelectedProductId("");
            setSelectedVariantId("");
        }
    }, [selectedMaterialId, materials, products]);

    // Selected entities
    const selectedMaterial = useMemo(() => {
        return materials.find((m) => String(m.id || (m as any)._id) === String(selectedMaterialId));
    }, [materials, selectedMaterialId]);

    const materialOptions = useMemo(() => {
        return sortedRepackableMaterials.map((m, idx) => {
            const mId = m.id || (m as any)._id || m.code || `mat-${idx}`;
            const isManufactured = m.code?.startsWith("BLK-") || m.name?.toLowerCase().includes("bulk") || m.linkedProductId;
            return {
                value: mId,
                label: isManufactured ? `★ ${m.name}` : m.name,
                subText: `${m.code} • ${isManufactured ? "Manufactured Bulk Food" : "Bulk Commodity"}`,
                badge: `${formatStock(m.currentStock)} ${m.unit} avail`,
                description: isManufactured ? "Manufactured in cooking batch; ready for retail jars" : `Usage: ${m.usage}`,
            };
        });
    }, [sortedRepackableMaterials]);

    const selectedLot = useMemo(() => {
        return materialLots.find((l) => String(l.id || (l as any)._id) === String(selectedLotId));
    }, [materialLots, selectedLotId]);

    const lotOptions = useMemo(() => {
        return materialLots.map((lot, idx) => {
            const lId = lot.id || (lot as any)._id || lot.lotNumber || `lot-${idx}`;
            const expStr = lot.expiryDate ? ` • Exp: ${new Date(lot.expiryDate).toLocaleDateString()}` : "";
            return {
                value: lId,
                label: `Lot: ${lot.lotNumber}`,
                subText: `${formatStock(lot.availableQuantity)} ${lot.unit} avail`,
                badge: `₹${lot.costPerUnit.toFixed(2)}/${lot.unit}`,
                description: expStr ? `Expiry: ${new Date(lot.expiryDate!).toLocaleDateString()}` : "No expiry recorded",
            };
        });
    }, [materialLots]);

    const selectedProduct = useMemo(() => {
        return products.find((p) => String(p.id || (p as any)._id) === String(selectedProductId));
    }, [products, selectedProductId]);

    const productOptions = useMemo(() => {
        if (!selectedMaterial) return [];

        const targetMat = selectedMaterial;
        const linkedId = targetMat?.linkedProductId
            ? String((targetMat.linkedProductId as any)?._id || targetMat.linkedProductId)
            : "";

        // If this bulk material is explicitly linked to a product, only show that product
        if (linkedId) {
            const linkedProd = products.find((p) => String(p.id || (p as any)._id) === linkedId);
            if (linkedProd) {
                return [
                    {
                        value: String(linkedProd.id || (linkedProd as any)._id),
                        label: `★ ${linkedProd.title} (Designated Linked Product)`,
                        subText: linkedProd.slug,
                        badge: `${linkedProd.variants?.length || 0} variants`,
                    },
                ];
            }
        }

        // Otherwise filter compatible products
        const cleanMatName = targetMat.name
            .replace(/\(Bulk\)/i, "")
            .replace(/\(1 kg Master Formula\)/i, "")
            .trim()
            .toLowerCase();

        const compatibleProds = products.filter((p) => {
            const pTitle = p.title.toLowerCase();
            const pId = String(p.id || (p as any)._id);

            // Exclude products that are already dedicated to another bulk material
            const otherMatLinked = materials.some((m) => {
                const mLinkedId = m.linkedProductId ? String((m.linkedProductId as any)?._id || m.linkedProductId) : "";
                return mLinkedId === pId && String(m.id || (m as any)._id) !== String(targetMat.id || (targetMat as any)._id);
            });
            if (otherMatLinked) return false;

            // Category sanity checks
            if (targetMat.category === "OIL" && !pTitle.includes("oil")) {
                return false;
            }
            if (targetMat.category === "SPICE") {
                const spiceBase = targetMat.name.toLowerCase().replace(/powder|seeds/i, "").trim();
                if (!pTitle.includes(spiceBase)) return false;
            }

            return true;
        });

        return compatibleProds.map((p, idx) => {
            const pId = String(p.id || (p as any)._id || `prod-${idx}`);
            const pTitle = p.title.toLowerCase();
            const isNameMatch = pTitle.includes(cleanMatName) || cleanMatName.includes(pTitle);
            return {
                value: pId,
                label: isNameMatch ? `★ ${p.title} (Matched)` : p.title,
                subText: p.slug,
                badge: `${p.variants?.length || 0} variants`,
            };
        });
    }, [products, selectedMaterial, materials]);

    // Variants for selected product
    const availableVariants = useMemo<ProductVariant[]>(() => {
        if (!selectedProduct || !selectedProduct.variants) return [];
        return selectedProduct.variants;
    }, [selectedProduct]);

    const variantOptions = useMemo(() => {
        return availableVariants.map((v, idx) => {
            const vId = String(v.id || (v as any)._id || v.sku || `var-${idx}`);
            const price = v.prices?.[0]?.amount;
            const weightStr = v.weight ? ` (${v.weight}${v.weightUnit || "g"})` : "";
            return {
                value: vId,
                label: `${v.title || v.sku}${weightStr}`,
                subText: v.sku,
                badge: price ? `₹${price}` : undefined,
            };
        });
    }, [availableVariants]);

    // Auto-select first variant if selected product changed and variant not valid
    useEffect(() => {
        if (availableVariants.length > 0) {
            const exists = availableVariants.some((v) => (v.id || (v as any)._id) === selectedVariantId);
            if (!exists) {
                setSelectedVariantId(availableVariants[0]!.id || (availableVariants[0]! as any)._id || "");
            }
        } else {
            setSelectedVariantId("");
        }
    }, [availableVariants, selectedVariantId]);

    const selectedVariant = useMemo(() => {
        return availableVariants.find((v) => (v.id || (v as any)._id) === selectedVariantId);
    }, [availableVariants, selectedVariantId]);

    // Auto-fill Unit Size Quantity and Unit of Measure from variant title (e.g. 500g, 1kg, 250ml)
    useEffect(() => {
        if (selectedVariant) {
            const parsed = parseVariantUnitSize(selectedVariant);
            if (parsed) {
                setUnitSizeQuantity(parsed.qty);
                setUnitSizeUnit(parsed.unit);
            }
        }
    }, [selectedVariant]);

    const selectedPackagingMaterial = useMemo(() => {
        return packagingMaterials.find((m) => (m.id || (m as any)._id) === selectedPackagingMaterialId);
    }, [packagingMaterials, selectedPackagingMaterialId]);

    // Material & Product Compatibility Validation
    const compatibility = useMemo(() => {
        if (!selectedMaterial) {
            return { isCompatible: false, reason: "Please select a bulk source material." };
        }
        if (!selectedProduct) {
            return {
                isCompatible: false,
                reason: `No retail product selected for bulk material "${selectedMaterial.name}". Please link or select a matching retail product.`,
            };
        }

        // 1. Explicit link validation
        if (selectedMaterial.linkedProductId) {
            const linkedId = String((selectedMaterial.linkedProductId as any)?._id || selectedMaterial.linkedProductId);
            const prodId = String(selectedProduct.id || (selectedProduct as any)._id);
            if (linkedId !== prodId) {
                return {
                    isCompatible: false,
                    reason: `Mismatch: "${selectedMaterial.name}" is linked exclusively to its designated retail product. It cannot be repackaged into "${selectedProduct.title}".`,
                };
            }
        }

        // 2. Physical dimension validation (Liquid vs Solid)
        const matUnit = selectedMaterial.unit;
        const isLiquidMat = matUnit === "l" || matUnit === "ml";
        const isLiquidPack = unitSizeUnit === "l" || unitSizeUnit === "ml";
        const isCountPack = unitSizeUnit === "pcs" || unitSizeUnit === "pack";
        if (isLiquidMat && !isLiquidPack && !isCountPack) {
            return {
                isCompatible: false,
                reason: `Dimension mismatch: Bulk material "${selectedMaterial.name}" is measured in liquid volume (${matUnit}), but target pack unit is measured in mass (${unitSizeUnit}). Direct repackaging without density calibration is invalid.`,
            };
        }
        if (!isLiquidMat && isLiquidPack) {
            return {
                isCompatible: false,
                reason: `Dimension mismatch: Bulk material "${selectedMaterial.name}" is measured in solid mass (${matUnit}), but target pack unit is measured in liquid volume (${unitSizeUnit}).`,
            };
        }

        // 3. Category & name sanity checks
        if (selectedMaterial.category === "OIL" && !selectedProduct.title.toLowerCase().includes("oil")) {
            return {
                isCompatible: false,
                reason: `Product mismatch: Bulk oil "${selectedMaterial.name}" cannot be packaged as retail product "${selectedProduct.title}".`,
            };
        }

        return { isCompatible: true, reason: "" };
    }, [selectedMaterial, selectedProduct, unitSizeUnit]);

    // Conversions and Live Validation
    const calculation = useMemo(() => {
        if (!selectedMaterial || !selectedLot || !selectedProduct || !selectedVariant || !compatibility.isCompatible) {
            return {
                bulkQuantityRequired: 0,
                isSufficient: false,
                lotRemaining: selectedLot ? selectedLot.availableQuantity : 0,
                deficit: 0,
                bulkCost: 0,
                packagingCost: 0,
                totalCost: 0,
                costPerUnit: 0,
            };
        }

        const totalNetMass = packageUnitsProduced * unitSizeQuantity + (wastageQuantity || 0);
        const bulkQuantityRequired = convertQuantity(
            totalNetMass,
            unitSizeUnit,
            selectedMaterial.unit
        );

        const lotRemaining = selectedLot.availableQuantity;
        const isSufficient = bulkQuantityRequired <= lotRemaining;
        const deficit = Math.max(0, bulkQuantityRequired - lotRemaining);

        const bulkCost = bulkQuantityRequired * selectedLot.costPerUnit;
        const packagingCost = selectedPackagingMaterial
            ? packageUnitsProduced * selectedPackagingMaterial.averageCost
            : 0;

        const totalCost = bulkCost + packagingCost;
        const costPerUnit = packageUnitsProduced > 0 ? totalCost / packageUnitsProduced : 0;

        return {
            bulkQuantityRequired,
            isSufficient,
            lotRemaining,
            deficit,
            bulkCost,
            packagingCost,
            totalCost,
            costPerUnit,
        };
    }, [
        selectedMaterial,
        selectedLot,
        selectedProduct,
        selectedVariant,
        compatibility.isCompatible,
        packageUnitsProduced,
        unitSizeQuantity,
        unitSizeUnit,
        wastageQuantity,
        selectedPackagingMaterial,
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedMaterialId) {
            toast.error("Please select a source bulk material.");
            return;
        }
        if (!selectedLotId) {
            toast.error("Please select an active material lot.");
            return;
        }
        if (!selectedProductId) {
            toast.error("Please select a target sellable product.");
            return;
        }
        if (!compatibility.isCompatible) {
            toast.error(compatibility.reason);
            return;
        }
        if (!selectedVariantId) {
            toast.error("Please select a product variant.");
            return;
        }
        if (!selectedWarehouseId) {
            toast.error("Please select a destination warehouse.");
            return;
        }
        if (packageUnitsProduced <= 0) {
            toast.error("Package units produced must be at least 1.");
            return;
        }
        if (unitSizeQuantity <= 0) {
            toast.error("Unit size quantity must be greater than 0.");
            return;
        }
        if (!calculation.isSufficient) {
            toast.error(
                `Insufficient lot stock: requires ${calculation.bulkQuantityRequired.toFixed(
                    2
                )} ${selectedMaterial?.unit}, but only ${calculation.lotRemaining.toFixed(
                    2
                )} available in lot.`
            );
            return;
        }

        try {
            await createRepackagingRun({
                sourceRawMaterialId: selectedMaterialId,
                sourceLotId: selectedLotId,
                targetProductId: selectedProductId,
                targetVariantId: selectedVariantId,
                packageUnitsProduced,
                unitSizeQuantity,
                unitSizeUnit,
                warehouseId: selectedWarehouseId,
                packagingMaterialId: selectedPackagingMaterialId || undefined,
                wastageQuantity: wastageQuantity > 0 ? wastageQuantity : undefined,
                notes: notes.trim() || undefined,
            }).unwrap();

            toast.success(
                `Successfully transformed bulk lot into ${packageUnitsProduced} retail pack units!`
            );
            router.push("/manufacturing/repackaging");
        } catch (err: any) {
            console.error("Failed to execute repackaging run:", err);
            toast.error(err?.data?.message || err?.message || "Failed to execute repackaging run.");
        }
    };

    if (loadingData) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/manufacturing/repackaging"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Repackaging Runs
                        </Link>
                    </div>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl flex items-center gap-3">
                        <Layers className="h-8 w-8 text-primary" />
                        Execute Stock Repackaging / Transformation
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Transform bulk raw material inventory into packaged retail product variants
                        while retaining full lot traceability, expiry dates, and cost attribution.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left 2 Columns: Input Controls */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Step 1: Bulk Source Material & Lot Selection */}
                    <Card className="p-6 border-l-4 border-l-primary">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                                1
                            </span>
                            <h2 className="text-base font-semibold text-gray-900">
                                Source Bulk Material & Lot
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            Select the raw material and specific batch/lot from which bulk stock will
                            be deducted.
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Bulk Raw Material" required>
                                <SearchableSelect
                                    value={selectedMaterialId}
                                    onChange={setSelectedMaterialId}
                                    options={materialOptions}
                                    placeholder="-- Search or select bulk material --"
                                    searchPlaceholder="Search by material name, code..."
                                    pageSize={15}
                                />
                            </FormField>

                            <FormField
                                label="Source Lot / Batch"
                                required
                                helperText={
                                    loadingLots
                                        ? "Loading active lots..."
                                        : `${materialLots.length} active lots with stock`
                                }
                            >
                                <SearchableSelect
                                    value={selectedLotId}
                                    onChange={setSelectedLotId}
                                    options={lotOptions}
                                    disabled={loadingLots || materialLots.length === 0}
                                    placeholder={materialLots.length === 0 ? "No active lots with remaining stock" : "-- Select active lot --"}
                                    searchPlaceholder="Search lot number..."
                                    pageSize={15}
                                />
                            </FormField>
                        </div>

                        {/* Lot Meta Badge Box */}
                        {selectedLot && (
                            <div className="mt-4 rounded-lg bg-gray-50 p-3.5 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span className="text-gray-500 block">Lot Number</span>
                                    <span className="font-mono font-bold text-gray-900">
                                        {selectedLot.lotNumber}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Available Balance</span>
                                    <span className="font-bold text-emerald-700">
                                        {formatStock(selectedLot.availableQuantity)} {selectedLot.unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Lot Cost / Unit</span>
                                    <span className="font-bold text-gray-900">
                                        ₹{selectedLot.costPerUnit.toFixed(2)} / {selectedLot.unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Expiry Date</span>
                                    <span className="font-medium text-gray-700">
                                        {selectedLot.expiryDate
                                            ? new Date(selectedLot.expiryDate).toLocaleDateString()
                                            : "No Expiry Recorded"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Step 2: Target Sellable Product & Variant */}
                    <Card className="p-6 border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                                2
                            </span>
                            <h2 className="text-base font-semibold text-gray-900">
                                Target Sellable Product & Variant
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            Choose the retail catalog product and specific packaging variant to credit.
                        </p>

                        {selectedMaterial && productOptions.length === 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold uppercase tracking-wider text-amber-800">
                                        No Compatible Retail Product in Catalog
                                    </div>
                                    <p className="mt-1 text-amber-700 leading-relaxed">
                                        "{selectedMaterial.name}" has no matching retail product in the catalog.
                                        Repackaging converts bulk raw materials into sellable consumer packages (e.g. bottles or jars).
                                        Please create a corresponding retail product in the Products Catalog or link it to this material.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Target Retail Product"
                                    required
                                    helperText={
                                        selectedMaterial?.linkedProductId
                                            ? "Exclusively linked to this bulk formula"
                                            : undefined
                                    }
                                >
                                    <SearchableSelect
                                        value={selectedProductId}
                                        onChange={setSelectedProductId}
                                        options={productOptions}
                                        disabled={!!selectedMaterial?.linkedProductId && productOptions.length === 1}
                                        placeholder="-- Select retail product --"
                                        searchPlaceholder="Search retail product title, slug..."
                                        pageSize={15}
                                    />
                                </FormField>

                                <FormField
                                    label="Target Product Variant"
                                    required
                                    helperText={
                                        availableVariants.length === 0
                                            ? "No variants found"
                                            : `${availableVariants.length} packaging variants`
                                    }
                                >
                                    <SearchableSelect
                                        value={selectedVariantId}
                                        onChange={setSelectedVariantId}
                                        options={variantOptions}
                                        disabled={availableVariants.length === 0}
                                        placeholder="-- Select packaging variant --"
                                        searchPlaceholder="Search variant name, SKU..."
                                        pageSize={15}
                                    />
                                </FormField>
                            </div>
                        )}

                        {selectedVariant && compatibility.isCompatible && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded border border-emerald-200">
                                <Store className="h-4 w-4 shrink-0" />
                                <span>
                                    Retail Stock will be credited for SKU:{" "}
                                    <strong>{selectedVariant.sku}</strong> (Title:{" "}
                                    {selectedVariant.title || "Default"})
                                </span>
                            </div>
                        )}

                        {selectedProduct && !compatibility.isCompatible && (
                            <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 bg-rose-50 px-3 py-2.5 rounded border border-rose-200">
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{compatibility.reason}</span>
                            </div>
                        )}
                    </Card>

                    {/* Step 3: Packaging Parameters & Destination */}
                    <Card className="p-6 border-l-4 border-l-indigo-500">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                3
                            </span>
                            <h2 className="text-base font-semibold text-gray-900">
                                Pack Configuration & Quantities
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField label="Units to Produce" required>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={packageUnitsProduced}
                                    onChange={(e) =>
                                        setPackageUnitsProduced(Math.max(1, parseInt(e.target.value) || 1))
                                    }
                                    placeholder="e.g. 20"
                                />
                            </FormField>

                            <FormField label="Unit Net Weight / Volume" required>
                                <Input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={unitSizeQuantity}
                                    onChange={(e) =>
                                        setUnitSizeQuantity(
                                            Math.max(0.001, parseFloat(e.target.value) || 0)
                                        )
                                    }
                                    placeholder="e.g. 250"
                                />
                            </FormField>

                            <FormField label="Unit of Measure (UoM)" required>
                                <select
                                    value={unitSizeUnit}
                                    onChange={(e) =>
                                        setUnitSizeUnit(e.target.value as RawMaterialUnit)
                                    }
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option key="unit-kg" value="kg">kg (Kilogram)</option>
                                    <option key="unit-g" value="g">g (Gram)</option>
                                    <option key="unit-l" value="l">l (Liter)</option>
                                    <option key="unit-ml" value="ml">ml (Milliliter)</option>
                                    <option key="unit-pcs" value="pcs">pcs (Pieces)</option>
                                    <option key="unit-pack" value="pack">pack (Pack)</option>
                                </select>
                            </FormField>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                                label="Target Warehouse"
                                required
                                helperText="Inventory location for finished goods"
                            >
                                <select
                                    value={selectedWarehouseId}
                                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {locations.map((loc, idx) => {
                                        const locId = loc.id || (loc as any)._id || `loc-${idx}`;
                                        return (
                                            <option key={locId} value={locId}>
                                                {loc.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </FormField>

                            <FormField
                                label="Packaging Material (Optional)"
                                helperText="e.g. Pouches, Glass Jars, Tins"
                            >
                                <select
                                    value={selectedPackagingMaterialId}
                                    onChange={(e) => setSelectedPackagingMaterialId(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option key="__none_prepackaged__" value="">-- None / Pre-packaged --</option>
                                    {packagingMaterials.map((pkg, idx) => {
                                        const pkgId = pkg.id || (pkg as any)._id || pkg.code || `pkg-${idx}`;
                                        return (
                                            <option key={pkgId} value={pkgId}>
                                                {pkg.name} (Stock: {formatStock(pkg.currentStock)} {pkg.unit} @ ₹
                                                {pkg.averageCost.toFixed(2)})
                                            </option>
                                        );
                                    })}
                                </select>
                            </FormField>

                            <FormField
                                label={`Wastage Allowance (${unitSizeUnit})`}
                                helperText="Spillage or sampling loss"
                            >
                                <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={wastageQuantity}
                                    onChange={(e) =>
                                        setWastageQuantity(
                                            Math.max(0, parseFloat(e.target.value) || 0)
                                        )
                                    }
                                    placeholder="0"
                                />
                            </FormField>
                        </div>

                        <div className="mt-4">
                            <FormField label="Operational Notes / Quality Checklist (Optional)">
                                <Input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Packed with nitrogen flush sealing; Passed manual weight check"
                                />
                            </FormField>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Live Transformation Simulator & Action Card */}
                <div className="space-y-6">
                    <Card className="p-6 bg-gradient-to-br from-gray-50 to-white shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold text-sm">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Live Transformation Simulator
                        </div>

                        {/* Feasibility Indicator */}
                        {!selectedProduct || !selectedVariant ? (
                            <div className="rounded-lg p-4 border border-slate-200 bg-slate-50 text-slate-700 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        Awaiting Target Product Selection
                                    </div>
                                    <p className="text-xs mt-0.5 text-slate-600">
                                        Please select a compatible retail product and packaging variant in Step 2 to simulate the transformation run.
                                    </p>
                                </div>
                            </div>
                        ) : !compatibility.isCompatible ? (
                            <div className="rounded-lg p-4 border border-rose-200 bg-rose-50 text-rose-900 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
                                        Incompatible Product / Material
                                    </div>
                                    <p className="text-xs mt-0.5 text-rose-700">
                                        {compatibility.reason}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`rounded-lg p-4 border flex items-start gap-3 ${
                                    calculation.isSufficient
                                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                        : "bg-rose-50/70 border-rose-200 text-rose-900"
                                }`}
                            >
                                {calculation.isSufficient ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider">
                                        {calculation.isSufficient
                                            ? "Sufficient Bulk Lot Stock"
                                            : "Lot Deficit Detected"}
                                    </div>
                                    <p className="text-xs mt-0.5">
                                        {calculation.isSufficient
                                            ? `Lot ${selectedLot?.lotNumber || ""} has sufficient balance to fulfill this run.`
                                            : `Shortfall of ${calculation.deficit.toFixed(2)} ${
                                                  selectedMaterial?.unit || ""
                                              }. Please reduce quantity or select another lot.`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Breakdown Metrics */}
                        <div className="mt-5 space-y-3.5 divide-y divide-gray-100 text-xs">
                            <div className="pt-2 flex justify-between items-center">
                                <span className="text-gray-500">Bulk Material Required:</span>
                                <span className="font-mono font-bold text-gray-900">
                                    {calculation.bulkQuantityRequired.toFixed(3)}{" "}
                                    {selectedMaterial?.unit || ""}
                                </span>
                            </div>

                            <div className="pt-2 flex justify-between items-center">
                                <span className="text-gray-500">Lot Stock Available:</span>
                                <span className="font-mono font-semibold text-gray-700">
                                    {calculation.lotRemaining.toFixed(3)}{" "}
                                    {selectedLot?.unit || ""}
                                </span>
                            </div>

                            <div className="pt-2 flex justify-between items-center">
                                <span className="text-gray-500">Target Retail Yield:</span>
                                <span className="font-bold text-emerald-700">
                                    {packageUnitsProduced} × {unitSizeQuantity} {unitSizeUnit}
                                </span>
                            </div>

                            <div className="pt-2 flex justify-between items-center">
                                <span className="text-gray-500">Bulk Material Cost:</span>
                                <span className="font-mono font-medium text-gray-800">
                                    ₹{calculation.bulkCost.toFixed(2)}
                                </span>
                            </div>

                            {calculation.packagingCost > 0 && (
                                <div className="pt-2 flex justify-between items-center">
                                    <span className="text-gray-500">Packaging Materials:</span>
                                    <span className="font-mono font-medium text-gray-800">
                                        ₹{calculation.packagingCost.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="pt-3 flex justify-between items-center text-sm font-semibold">
                                <span className="text-gray-900">Total Run Cost:</span>
                                <span className="text-primary font-bold">
                                    ₹{calculation.totalCost.toFixed(2)}
                                </span>
                            </div>

                            <div className="pt-2 flex justify-between items-center bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
                                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                                    <Coins className="h-4 w-4" />
                                    <span>Realized Cost / Pack:</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-900 text-sm">
                                    ₹{calculation.costPerUnit.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Traceability Guarantee */}
                        <div className="mt-5 rounded-md bg-blue-50/60 p-3 border border-blue-100 text-[11px] text-blue-800 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold">
                                <ShieldCheck className="h-4 w-4 text-blue-600" />
                                <span>Complete Lot Traceability Guaranteed</span>
                            </div>
                            <p className="text-blue-700 leading-relaxed">
                                Retail inventory movement will carry <code>sourceLotId</code> and{" "}
                                <code>sourceLotNumber ({selectedLot?.lotNumber || "—"})</code>. If
                                quality issues arise, all sellable units can be traced immediately.
                            </p>
                        </div>

                        {/* Submit Buttons */}
                        <div className="mt-6 flex flex-col gap-2">
                            <Button
                                type="submit"
                                disabled={
                                    submitting ||
                                    !selectedMaterialId ||
                                    !selectedLotId ||
                                    !selectedProductId ||
                                    !selectedVariantId ||
                                    !compatibility.isCompatible ||
                                    !calculation.isSufficient
                                }
                                className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-sm shadow"
                            >
                                {submitting ? (
                                    <>
                                        <Spinner size="sm" />
                                        Executing Repackaging...
                                    </>
                                ) : (
                                    <>
                                        <Layers className="h-4 w-4" />
                                        Execute Repackaging Run
                                    </>
                                )}
                            </Button>

                            <Link href="/manufacturing/repackaging" className="w-full">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full text-xs"
                                    disabled={submitting}
                                >
                                    Cancel & Return
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </form>
        </div>
    );
}
