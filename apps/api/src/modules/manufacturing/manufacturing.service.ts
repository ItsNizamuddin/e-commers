import { Types } from "mongoose";
import {
    RawMaterialUnit,
    CreateRawMaterialInput,
    UpdateRawMaterialInput,
    RecordPurchaseIntakeInput,
    CreateRecipeInput,
    UpdateRecipeInput,
    ExecuteProductionInput,
    ReverseProductionInput,
    CreateRepackagingRunInput,
    ReverseRepackagingRunInput,
    SyncVariantCostInput,
    BatchSyncVariantPricingInput,
    AutoGenerateVariantRecipesInput,
    ProductionFeasibilityCheck,
    AuditActor,
    CreateVendorInput,
    UpdateVendorInput,
} from "@ecommers/types";
import { RawMaterialModel, RawMaterialDocument } from "./raw-material.model.js";
import { RawMaterialLotModel, RawMaterialLotDocument } from "./raw-material-lot.model.js";
import { RawMaterialStockMovementModel } from "./raw-material-ledger.model.js";
import { VendorModel, VendorDocument } from "./vendor.model.js";
import { RecipeModel, RecipeDocument } from "./recipe.model.js";
import { ProductionRunModel, ProductionRunDocument } from "./production-run.model.js";
import { RepackagingRunModel, RepackagingRunDocument } from "./repackaging-run.model.js";
import { InventoryModel } from "../inventory/models/inventory.model.js";
import { StockMovementModel } from "../inventory/models/stock-movement.model.js";
import { ProductModel } from "../products/product.model.js";
import { convertUnits, normalizeToBaseUnit } from "./unit-conversion.js";
import { resolveActor } from "../../utils/audit.js";
import { AppError } from "../../utils/app-error.js";
import { outboxService } from "../outbox/outbox.service.js";
import { outboxDispatcher } from "../outbox/outbox.dispatcher.js";

async function getActorSnapshot(actor?: any): Promise<AuditActor | undefined> {
    if (!actor) return undefined;
    if (actor.name && actor.email) return actor as AuditActor;
    if (actor.id) {
        try {
            return await resolveActor(actor.id);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

export class ManufacturingService {
    // -------------------------------------------------------------------------
    // 1. RAW MATERIALS MANAGEMENT
    // -------------------------------------------------------------------------

    async listRawMaterials(query?: {
        search?: string | undefined;
        category?: string | undefined;
        usage?: string | undefined;
        isActive?: boolean | undefined;
    }) {
        const filter: Record<string, any> = {};

        if (query?.isActive !== undefined) {
            filter.isActive = query.isActive;
        }

        if (query?.category) {
            filter.category = query.category;
        }

        if (query?.usage) {
            filter.usage = query.usage;
        }

        if (query?.search?.trim()) {
            const regex = new RegExp(query.search.trim(), "i");
            filter.$or = [{ name: regex }, { code: regex }];
        }

        const items = await RawMaterialModel.find(filter).sort({ name: 1 }).lean();
        return items.map((rm: any) => ({
            ...rm,
            id: rm._id?.toString() || rm.id,
        }));
    }

    async getRawMaterialById(id: string) {
        const rm = await RawMaterialModel.findById(id).lean();
        if (!rm) {
            throw new Error(`Raw material with ID '${id}' not found.`);
        }
        return {
            ...rm,
            id: (rm as any)._id?.toString() || (rm as any).id,
        };
    }

    async generateUniqueRawMaterialCode(name: string, preferredCode?: string): Promise<string> {
        let baseCode = "";
        if (preferredCode?.trim()) {
            baseCode = preferredCode.trim().toUpperCase();
        } else {
            const baseSlug = name
                .trim()
                .replace(/[^\w\s-]/g, " ")
                .replace(/[\s_]+/g, " ")
                .trim()
                .split(" ")
                .map((w) => w.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                .filter(Boolean)
                .slice(0, 4)
                .join("-")
                .slice(0, 24) || "ITEM";
            baseCode = `RM-${baseSlug}`;
        }

        const existing = await RawMaterialModel.findOne({ code: baseCode }).select("_id").lean();
        if (!existing) {
            return baseCode;
        }

        let counter = 1;
        while (counter <= 999) {
            const suffix = counter < 10 ? `0${counter}` : `${counter}`;
            const candidate = `${baseCode}-${suffix}`;
            const exists = await RawMaterialModel.findOne({ code: candidate }).select("_id").lean();
            if (!exists) {
                return candidate;
            }
            counter++;
        }

        return `${baseCode}-${Date.now().toString().slice(-4)}`;
    }

    async checkCodeAvailability(code: string): Promise<{
        code: string;
        isAvailable: boolean;
        suggestedCode?: string;
    }> {
        const cleanCode = (code || "").trim().toUpperCase();
        if (!cleanCode) {
            return { code: "", isAvailable: false };
        }

        const existing = await RawMaterialModel.findOne({ code: cleanCode }).select("_id").lean();
        if (!existing) {
            return { code: cleanCode, isAvailable: true };
        }

        const suggestedCode = await this.generateUniqueRawMaterialCode("", cleanCode);
        return {
            code: cleanCode,
            isAvailable: false,
            suggestedCode,
        };
    }

    async createRawMaterial(input: CreateRawMaterialInput, actor?: any) {
        let finalCode = input.code?.trim().toUpperCase();
        if (!finalCode) {
            finalCode = await this.generateUniqueRawMaterialCode(input.name);
        } else {
            const existing = await RawMaterialModel.findOne({
                code: finalCode,
            });
            if (existing) {
                throw new Error(`Raw material code '${finalCode}' already exists.`);
            }
        }

        const rm = new RawMaterialModel({
            code: finalCode,
            name: input.name.trim(),
            category: input.category,
            usage: input.usage || "RAW_MATERIAL",
            linkedProductId: input.linkedProductId ? new Types.ObjectId(input.linkedProductId) : undefined,
            linkedVariantId: input.linkedVariantId ? new Types.ObjectId(input.linkedVariantId) : undefined,
            unit: input.unit,
            currentStock: input.initialStock || 0,
            reorderThreshold: input.reorderThreshold ?? 5,
            averageCost: input.initialCostPerUnit || 0,
            lastPurchasePrice: input.initialCostPerUnit || 0,
            warehouseId: input.warehouseId ? new Types.ObjectId(input.warehouseId) : undefined,
            isActive: true,
        });

        await rm.save();

        const resolvedActor = await getActorSnapshot(actor);

        // If initial stock provided, create an initial opening lot and ledger record
        if (input.initialStock && input.initialStock > 0) {
            const initialLotNumber = `OPENING-${rm.code}-${Date.now().toString().slice(-4)}`;
            const lot = new RawMaterialLotModel({
                rawMaterialId: rm._id,
                lotNumber: initialLotNumber,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
                receivedDate: new Date(),
                initialQuantity: input.initialStock,
                availableQuantity: input.initialStock,
                unit: rm.unit,
                costPerUnit: input.initialCostPerUnit || 0,
                sourceType: "EXTERNAL_VENDOR",
                supplier: { name: "Opening Stock" },
                isDepleted: false,
                notes: "Initial inventory setup",
            });
            await lot.save();

            const ledger = new RawMaterialStockMovementModel({
                rawMaterialId: rm._id,
                lotId: lot._id,
                lotNumber: lot.lotNumber,
                type: "PURCHASE_INTAKE",
                quantityDelta: input.initialStock,
                unit: rm.unit,
                previousStock: 0,
                newStock: input.initialStock,
                referenceType: "PURCHASE",
                referenceId: initialLotNumber,
                reason: "Initial opening stock",
                actor: resolvedActor,
            });
            await ledger.save();
        }

        return rm.toObject();
    }

    async updateRawMaterial(id: string, input: UpdateRawMaterialInput) {
        const rm = await RawMaterialModel.findById(id);
        if (!rm) {
            throw new Error(`Raw material with ID '${id}' not found.`);
        }

        if (input.name !== undefined) rm.name = input.name.trim();
        if (input.category !== undefined) rm.category = input.category;
        if (input.usage !== undefined) rm.usage = input.usage;
        if (input.linkedProductId !== undefined) {
            rm.linkedProductId = (input.linkedProductId && input.linkedProductId.trim() !== "")
                ? new Types.ObjectId(input.linkedProductId)
                : undefined;
        }
        if (input.linkedVariantId !== undefined) {
            rm.linkedVariantId = (input.linkedVariantId && input.linkedVariantId.trim() !== "")
                ? new Types.ObjectId(input.linkedVariantId)
                : undefined;
        }
        if (input.reorderThreshold !== undefined) rm.reorderThreshold = input.reorderThreshold;
        if (input.isActive !== undefined) rm.isActive = input.isActive;

        await rm.save();
        return rm.toObject();
    }

    // -------------------------------------------------------------------------
    // 2. RAW MATERIAL PURCHASES & INTAKES (WAC & LOT TRACKING)
    // -------------------------------------------------------------------------

    async recordPurchaseIntake(input: RecordPurchaseIntakeInput, actor?: any) {
        const rm = await RawMaterialModel.findById(input.rawMaterialId);
        if (!rm) {
            throw new Error(`Raw material with ID '${input.rawMaterialId}' not found.`);
        }

        // 1. Normalize quantity to RawMaterial base unit
        const quantityInBase = normalizeToBaseUnit(input.quantity, input.unit, rm.unit);
        if (quantityInBase <= 0) {
            throw new Error("Quantity must be greater than 0.");
        }

        // 2. Calculate cost per base unit and total intake cost
        let costPerBaseUnit = 0;
        let totalCost = 0;
        if (input.totalCost !== undefined && input.totalCost >= 0) {
            totalCost = input.totalCost;
            costPerBaseUnit = quantityInBase > 0 ? totalCost / quantityInBase : 0;
        } else if (input.costPerUnit !== undefined && input.costPerUnit >= 0) {
            costPerBaseUnit = input.costPerUnit;
            totalCost = costPerBaseUnit * quantityInBase;
        }

        // 3. Generate Lot Number if not provided
        const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
        const dateStr = purchaseDate.toISOString().slice(0, 10).replace(/-/g, "");
        const randStr = Math.floor(1000 + Math.random() * 9000);
        const prefix = input.sourceType === "OWN_FARM" ? "FARM" : "LOT";
        const lotNumber =
            input.lotNumber?.trim().toUpperCase() ||
            `${prefix}-${rm.code}-${dateStr}-${randStr}`;

        // 3.1 Resolve and update Vendor if external purchase
        let resolvedVendorId: Types.ObjectId | undefined = undefined;
        if (input.sourceType === "EXTERNAL_VENDOR") {
            if (input.vendorId && Types.ObjectId.isValid(input.vendorId)) {
                const existingVendor = await VendorModel.findById(input.vendorId);
                if (existingVendor) {
                    resolvedVendorId = existingVendor._id;
                    existingVendor.totalIntakes = (existingVendor.totalIntakes || 0) + 1;
                    existingVendor.totalSpend = (existingVendor.totalSpend || 0) + totalCost;
                    existingVendor.lastPurchaseDate = purchaseDate;
                    if (!existingVendor.contactNumber && input.supplier?.contact) {
                        existingVendor.contactNumber = input.supplier.contact;
                    }
                    await existingVendor.save();
                }
            } else if (input.supplier?.name?.trim()) {
                const cleanName = input.supplier.name.trim();
                let vendor = await VendorModel.findOne({
                    name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
                });
                if (!vendor) {
                    vendor = new VendorModel({
                        name: cleanName,
                        contactNumber: input.supplier.contact?.trim() || "",
                        status: "ACTIVE",
                        totalIntakes: 1,
                        totalSpend: totalCost,
                        lastPurchaseDate: purchaseDate,
                    });
                } else {
                    vendor.totalIntakes = (vendor.totalIntakes || 0) + 1;
                    vendor.totalSpend = (vendor.totalSpend || 0) + totalCost;
                    vendor.lastPurchaseDate = purchaseDate;
                    if (!vendor.contactNumber && input.supplier.contact?.trim()) {
                        vendor.contactNumber = input.supplier.contact.trim();
                    }
                }
                await vendor.save();
                resolvedVendorId = vendor._id;
            }
        }

        // 4. Create RawMaterialLot
        const lot = new RawMaterialLotModel({
            rawMaterialId: rm._id,
            vendorId: resolvedVendorId,
            lotNumber,
            expiryDate: new Date(input.expiryDate),
            receivedDate: purchaseDate,
            initialQuantity: quantityInBase,
            availableQuantity: quantityInBase,
            unit: rm.unit,
            costPerUnit: costPerBaseUnit,
            sourceType: input.sourceType,
            supplier: input.sourceType === "EXTERNAL_VENDOR" ? input.supplier : undefined,
            farmDetails: input.sourceType === "OWN_FARM" ? input.farmDetails : undefined,
            isDepleted: false,
            notes: input.notes?.trim(),
        });
        await lot.save();

        // 5. Update RawMaterial WAC (Weighted Average Cost) and Stock
        const prevStock = rm.currentStock;
        const newStock = prevStock + quantityInBase;

        // WAC Formula: ((previousStock * previousAvgCost) + totalCost) / newStock
        let newAverageCost = costPerBaseUnit;
        if (prevStock > 0 && rm.averageCost > 0) {
            newAverageCost = (prevStock * rm.averageCost + totalCost) / newStock;
        } else if (prevStock <= 0) {
            newAverageCost = costPerBaseUnit;
        }

        rm.currentStock = newStock;
        rm.averageCost = Math.round(newAverageCost * 100) / 100;
        rm.lastPurchasePrice = Math.round(costPerBaseUnit * 100) / 100;
        await rm.save();

        const resolvedActor = await getActorSnapshot(actor);

        // 6. Write Immutable Ledger Entry
        const ledger = new RawMaterialStockMovementModel({
            rawMaterialId: rm._id,
            lotId: lot._id,
            lotNumber: lot.lotNumber,
            type: "PURCHASE_INTAKE",
            quantityDelta: quantityInBase,
            unit: rm.unit,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: "PURCHASE",
            referenceId: lot.lotNumber,
            reason:
                input.sourceType === "OWN_FARM"
                    ? `Harvest intake from ${input.farmDetails?.farmName || "Own Farm"}`
                    : `Purchase from ${input.supplier?.name || "Supplier"}`,
            actor: resolvedActor,
        });
        await ledger.save();

        return {
            rawMaterial: rm.toObject(),
            lot: lot.toObject(),
            movement: ledger.toObject(),
        };
    }

    async listLots(query?: { rawMaterialId?: string | undefined; isDepleted?: boolean | undefined }) {
        const filter: Record<string, any> = {};
        if (query?.rawMaterialId) {
            filter.rawMaterialId = new Types.ObjectId(query.rawMaterialId);
        }
        if (query?.isDepleted !== undefined) {
            filter.isDepleted = query.isDepleted;
        }

        const lots = await RawMaterialLotModel.find(filter)
            .populate("rawMaterialId", "code name unit category")
            .sort({ expiryDate: 1 })
            .lean();
        return lots.map((l: any) => ({
            ...l,
            id: l._id?.toString() || l.id,
        }));
    }

    async listLedger(query?: { rawMaterialId?: string | undefined; limit?: number | undefined }) {
        const filter: Record<string, any> = {};
        if (query?.rawMaterialId) {
            filter.rawMaterialId = new Types.ObjectId(query.rawMaterialId);
        }

        const movements = await RawMaterialStockMovementModel.find(filter)
            .populate("rawMaterialId", "code name unit")
            .sort({ createdAt: -1 })
            .limit(query?.limit || 100)
            .lean();
        return movements.map((m: any) => ({
            ...m,
            id: m._id?.toString() || m.id,
        }));
    }

    // -------------------------------------------------------------------------
    // 3. RECIPES (BILL OF MATERIALS)
    // -------------------------------------------------------------------------

    async listRecipes(query?: { productId?: string | undefined; status?: string | undefined }) {
        const filter: Record<string, any> = {};
        if (query?.productId) {
            filter.productId = new Types.ObjectId(query.productId);
        }
        if (query?.status) {
            filter.status = query.status;
        }

        const recipes = await RecipeModel.find(filter)
            .populate("productId", "title slug baseCurrency variants")
            .populate("ingredients.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .populate("packagingMaterials.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .sort({ code: 1, version: -1 })
            .lean();
        return recipes.map((r: any) => ({
            ...r,
            id: r._id?.toString() || r.id,
        }));
    }

    async getRecipeById(id: string) {
        const recipe = await RecipeModel.findById(id)
            .populate("productId", "title slug baseCurrency variants")
            .populate("ingredients.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .populate("packagingMaterials.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .lean();

        if (!recipe) {
            throw new AppError(`Recipe with ID '${id}' not found.`, 404, "NOT_FOUND");
        }

        // Recalculate dynamic live estimated costs based on current raw material values
        const costs = await this.calculateRecipeEstimatedCost(recipe as any);

        const prodObj = recipe.productId as any;
        const productIdStr = prodObj?._id ? prodObj._id.toString() : (recipe.productId?.toString() || "");

        return {
            ...recipe,
            id: recipe._id.toString(),
            productId: productIdStr,
            product: prodObj && typeof prodObj === "object" ? {
                ...prodObj,
                id: prodObj._id?.toString() || prodObj.id,
                variants: (prodObj.variants || []).map((v: any) => ({
                    ...v,
                    id: v._id?.toString() || v.id,
                })),
            } : undefined,
            variantId: recipe.variantId ? recipe.variantId.toString() : undefined,
            ingredients: (recipe.ingredients || []).map((ing: any) => ({
                ...ing,
                rawMaterialId: ing.rawMaterialId?._id ? ing.rawMaterialId._id.toString() : (ing.rawMaterialId?.toString() || ""),
                rawMaterial: ing.rawMaterialId && typeof ing.rawMaterialId === "object" ? {
                    ...ing.rawMaterialId,
                    id: ing.rawMaterialId._id?.toString() || ing.rawMaterialId.id,
                } : undefined,
            })),
            packagingMaterials: (recipe.packagingMaterials || []).map((pkg: any) => ({
                ...pkg,
                rawMaterialId: pkg.rawMaterialId?._id ? pkg.rawMaterialId._id.toString() : (pkg.rawMaterialId?.toString() || ""),
                rawMaterial: pkg.rawMaterialId && typeof pkg.rawMaterialId === "object" ? {
                    ...pkg.rawMaterialId,
                    id: pkg.rawMaterialId._id?.toString() || pkg.rawMaterialId.id,
                } : undefined,
            })),
            estimatedCostWac: costs.estimatedCostWac,
            estimatedCostHighest: costs.estimatedCostHighest,
        };
    }

    async calculateRecipeEstimatedCost(recipe: RecipeDocument) {
        let totalWac = 0;
        let totalHighest = 0;

        // 1. Ingredients
        for (const ing of recipe.ingredients) {
            const rmId = (ing.rawMaterialId as any)?._id || ing.rawMaterialId;
            const rm = await RawMaterialModel.findById(rmId);
            if (!rm) continue;

            const baseQty = normalizeToBaseUnit(ing.quantity, ing.unit, rm.unit);
            const wastageMultiplier = 1 + (ing.wastagePercent || 0) / 100;
            const effectiveQty = baseQty * wastageMultiplier;

            totalWac += effectiveQty * (rm.averageCost || 0);
            totalHighest += effectiveQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        // 2. Packaging Materials
        for (const pkg of recipe.packagingMaterials || []) {
            const pkgRmId = (pkg.rawMaterialId as any)?._id || pkg.rawMaterialId;
            const rm = await RawMaterialModel.findById(pkgRmId);
            if (!rm) continue;

            const baseQty = normalizeToBaseUnit(pkg.quantity, pkg.unit, rm.unit);
            totalWac += baseQty * (rm.averageCost || 0);
            totalHighest += baseQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        // 3. Labor & Overhead
        const overhead = recipe.laborOverheadCost || 0;
        totalWac += overhead;
        totalHighest += overhead;

        const yieldQty = recipe.batchYield?.quantity || 1;
        return {
            estimatedCostWac: Math.round((totalWac / yieldQty) * 100) / 100,
            estimatedCostHighest: Math.round((totalHighest / yieldQty) * 100) / 100,
            totalBatchWac: Math.round(totalWac * 100) / 100,
            totalBatchHighest: Math.round(totalHighest * 100) / 100,
        };
    }

    async createRecipe(input: CreateRecipeInput) {
        const existing = await RecipeModel.findOne({
            code: input.code.trim().toUpperCase(),
            version: 1,
        });
        if (existing) {
            throw new Error(`Recipe with code '${input.code}' (v1) already exists.`);
        }

        const product = await ProductModel.findById(input.productId);
        if (!product) {
            throw new Error(`Product with ID '${input.productId}' not found.`);
        }

        const recipe = new RecipeModel({
            code: input.code.trim().toUpperCase(),
            name: input.name.trim(),
            version: 1,
            status: "ACTIVE",
            productId: product._id,
            variantId: input.variantId ? new Types.ObjectId(input.variantId) : undefined,
            shelfLifeDays: input.shelfLifeDays,
            batchYield: input.batchYield,
            ingredients: input.ingredients.map((i) => ({
                rawMaterialId: new Types.ObjectId(i.rawMaterialId),
                quantity: i.quantity,
                unit: i.unit,
                wastagePercent: i.wastagePercent || 0,
            })),
            packagingMaterials: (input.packagingMaterials || []).map((p) => ({
                rawMaterialId: new Types.ObjectId(p.rawMaterialId),
                quantity: p.quantity,
                unit: p.unit,
            })),
            laborOverheadCost: input.laborOverheadCost || 0,
            instructions: input.instructions?.trim(),
            changeLog: input.changeLog?.trim() || "Initial recipe formulation",
        });

        // Compute estimated costs
        const costs = await this.calculateRecipeEstimatedCost(recipe);
        recipe.estimatedCostWac = costs.estimatedCostWac;
        recipe.estimatedCostHighest = costs.estimatedCostHighest;

        await recipe.save();
        return recipe.toObject();
    }

    async updateRecipe(id: string, input: UpdateRecipeInput) {
        const recipe = await RecipeModel.findById(id);
        if (!recipe) {
            throw new Error(`Recipe with ID '${id}' not found.`);
        }

        // If bumpVersion requested, archive old and create new version
        if (input.bumpVersion) {
            recipe.status = "ARCHIVED";
            await recipe.save();

            const nextVersion = recipe.version + 1;
            const newRecipe = new RecipeModel({
                code: recipe.code,
                name: input.name?.trim() || recipe.name,
                version: nextVersion,
                status: "ACTIVE",
                productId: recipe.productId,
                variantId: recipe.variantId,
                shelfLifeDays: input.shelfLifeDays ?? recipe.shelfLifeDays,
                batchYield: input.batchYield ?? recipe.batchYield,
                ingredients: input.ingredients
                    ? input.ingredients.map((i) => ({
                        rawMaterialId: new Types.ObjectId(i.rawMaterialId),
                        quantity: i.quantity,
                        unit: i.unit,
                        wastagePercent: i.wastagePercent || 0,
                    }))
                    : recipe.ingredients,
                packagingMaterials: input.packagingMaterials
                    ? input.packagingMaterials.map((p) => ({
                        rawMaterialId: new Types.ObjectId(p.rawMaterialId),
                        quantity: p.quantity,
                        unit: p.unit,
                    }))
                    : recipe.packagingMaterials,
                laborOverheadCost: input.laborOverheadCost ?? recipe.laborOverheadCost,
                instructions: input.instructions?.trim() ?? recipe.instructions,
                changeLog: input.changeLog?.trim() || `Bumped to v${nextVersion}`,
            });

            const costs = await this.calculateRecipeEstimatedCost(newRecipe);
            newRecipe.estimatedCostWac = costs.estimatedCostWac;
            newRecipe.estimatedCostHighest = costs.estimatedCostHighest;

            await newRecipe.save();
            return newRecipe.toObject();
        }

        // In-place update of current draft/active version
        if (input.name !== undefined) recipe.name = input.name.trim();
        if (input.shelfLifeDays !== undefined) recipe.shelfLifeDays = input.shelfLifeDays;
        if (input.batchYield !== undefined) recipe.batchYield = input.batchYield;
        if (input.ingredients !== undefined) {
            recipe.ingredients = input.ingredients.map((i) => ({
                rawMaterialId: new Types.ObjectId(i.rawMaterialId),
                quantity: i.quantity,
                unit: i.unit,
                wastagePercent: i.wastagePercent || 0,
            })) as any;
        }
        if (input.packagingMaterials !== undefined) {
            recipe.packagingMaterials = input.packagingMaterials.map((p) => ({
                rawMaterialId: new Types.ObjectId(p.rawMaterialId),
                quantity: p.quantity,
                unit: p.unit,
            })) as any;
        }
        if (input.laborOverheadCost !== undefined) recipe.laborOverheadCost = input.laborOverheadCost;
        if (input.instructions !== undefined) recipe.instructions = input.instructions.trim();
        if (input.changeLog !== undefined) recipe.changeLog = input.changeLog.trim();

        const costs = await this.calculateRecipeEstimatedCost(recipe);
        recipe.estimatedCostWac = costs.estimatedCostWac;
        recipe.estimatedCostHighest = costs.estimatedCostHighest;

        await recipe.save();
        return recipe.toObject();
    }

    // -------------------------------------------------------------------------
    // 4. PRODUCTION PRE-FLIGHT CHECK (FEFO ALLOCATION & EXPIRY SHIELD)
    // -------------------------------------------------------------------------

    async checkProductionFeasibility(
        recipeId: string,
        targetQuantity: number,
        manufacturingDateStr?: string
    ): Promise<ProductionFeasibilityCheck> {
        const recipe = await RecipeModel.findById(recipeId);
        if (!recipe) {
            throw new Error(`Recipe with ID '${recipeId}' not found.`);
        }

        const mfgDate = manufacturingDateStr ? new Date(manufacturingDateStr) : new Date();
        const batchYieldQty = recipe.batchYield.quantity || 1;
        const multiplier = targetQuantity / batchYieldQty;

        const shortages: ProductionFeasibilityCheck["shortages"] = [];
        const fefoAllocations: ProductionFeasibilityCheck["fefoAllocations"] = [];
        let shortestPerishableExpiry: Date | null = null;
        let perishableWarningMessage: string | undefined = undefined;

        // Combine ingredients and packaging into required material checklist
        const itemsToCheck: Array<{
            rawMaterialId: Types.ObjectId;
            quantityNeeded: number;
            unit: RawMaterialUnit;
            wastagePercent?: number;
        }> = [];

        for (const ing of recipe.ingredients) {
            const wastageFactor = 1 + (ing.wastagePercent || 0) / 100;
            itemsToCheck.push({
                rawMaterialId: ing.rawMaterialId,
                quantityNeeded: ing.quantity * multiplier * wastageFactor,
                unit: ing.unit,
            });
        }

        for (const pkg of recipe.packagingMaterials || []) {
            itemsToCheck.push({
                rawMaterialId: pkg.rawMaterialId,
                quantityNeeded: pkg.quantity * multiplier,
                unit: pkg.unit,
            });
        }

        for (const item of itemsToCheck) {
            const rm = await RawMaterialModel.findById(item.rawMaterialId);
            if (!rm) continue;

            const neededInBase = normalizeToBaseUnit(item.quantityNeeded, item.unit, rm.unit);

            // Fetch active lots sorted FEFO (nearest expiry date first)
            // NATIVE QUERY GUARD: only allocate lots with status AVAILABLE and expiryDate > mfgDate
            const lots = await RawMaterialLotModel.find({
                rawMaterialId: rm._id,
                status: "AVAILABLE",
                isDepleted: false,
                availableQuantity: { $gt: 0 },
                expiryDate: { $gt: mfgDate },
            }).sort({ expiryDate: 1 });

            let remainingToAllocate = neededInBase;

            for (const lot of lots) {
                if (remainingToAllocate <= 0) break;

                const take = Math.min(lot.availableQuantity, remainingToAllocate);
                remainingToAllocate -= take;

                const isExpired = new Date(lot.expiryDate) < mfgDate;
                if (!shortestPerishableExpiry || new Date(lot.expiryDate) < shortestPerishableExpiry) {
                    shortestPerishableExpiry = new Date(lot.expiryDate);
                }

                fefoAllocations.push({
                    rawMaterialId: rm._id.toString(),
                    rawMaterialName: rm.name,
                    lotId: lot._id.toString(),
                    lotNumber: lot.lotNumber,
                    expiryDate: lot.expiryDate.toISOString(),
                    allocatedQuantity: Math.round(take * 1000) / 1000,
                    unit: rm.unit,
                    costPerUnit: lot.costPerUnit,
                    isExpired,
                });
            }

            const totalAvailable = lots.reduce((acc, l) => acc + l.availableQuantity, 0);
            if (remainingToAllocate > 0.0001) {
                shortages.push({
                    rawMaterialId: rm._id.toString(),
                    rawMaterialName: rm.name,
                    required: Math.round(neededInBase * 1000) / 1000,
                    available: Math.round(totalAvailable * 1000) / 1000,
                    unit: rm.unit,
                    deficit: Math.round(remainingToAllocate * 1000) / 1000,
                });
            }
        }

        // Calculate Best Before Date based on shelfLifeDays
        const standardBestBefore = new Date(
            mfgDate.getTime() + recipe.shelfLifeDays * 24 * 60 * 60 * 1000
        );
        let recommendedBestBefore = standardBestBefore;
        let hasPerishableWarning = false;

        if (shortestPerishableExpiry && shortestPerishableExpiry < standardBestBefore) {
            hasPerishableWarning = true;
            recommendedBestBefore = shortestPerishableExpiry;
            perishableWarningMessage = `A perishable raw material lot expires on ${shortestPerishableExpiry.toISOString().slice(0, 10)}, which is sooner than the standard ${recipe.shelfLifeDays}-day shelf life.`;
        }

        const costs = await this.calculateRecipeEstimatedCost(recipe);

        return {
            canProduce: shortages.length === 0,
            shortages,
            fefoAllocations,
            estimatedCostWac: costs.estimatedCostWac,
            estimatedCostHighest: costs.estimatedCostHighest,
            recommendedBestBeforeDate: recommendedBestBefore.toISOString(),
            hasPerishableWarning,
            perishableWarningMessage,
        };
    }

    // -------------------------------------------------------------------------
    // 5. PRODUCTION BATCH EXECUTION & LOT CONSUMPTION
    // -------------------------------------------------------------------------

    async executeProductionRun(input: ExecuteProductionInput, actor?: any) {
        const resolvedActor = await getActorSnapshot(actor);

        const recipe = await RecipeModel.findById(input.recipeId);
        if (!recipe) {
            throw new Error(`Recipe with ID '${input.recipeId}' not found.`);
        }

        const product = await ProductModel.findById(recipe.productId);
        if (!product) {
            throw new Error(`Finished Product with ID '${recipe.productId}' not found.`);
        }

        const mfgDate = input.manufacturingDate ? new Date(input.manufacturingDate) : new Date();

        // 1. Pre-flight Feasibility Check
        const check = await this.checkProductionFeasibility(
            input.recipeId,
            input.plannedQuantity,
            mfgDate.toISOString()
        );

        if (!check.canProduce) {
            const missingNames = check.shortages.map((s) => `${s.rawMaterialName} (need ${s.deficit} more ${s.unit})`).join(", ");
            throw new AppError(`Cannot execute production run: Insufficient stock for ${missingNames}`, 400, "INSUFFICIENT_STOCK", check.shortages);
        }

        // 2. Generate Unique Batch Number: MFG-YYYYMMDD-XXXX
        const dateStr = mfgDate.toISOString().slice(0, 10).replace(/-/g, "");
        const randStr = Math.floor(1000 + Math.random() * 9000);
        const batchNumber = `MFG-${dateStr}-${randStr}`;

        // 3. Deduct Lots via FEFO and Log Ledger Movements
        const lotsConsumed: Array<{
            rawMaterialId: Types.ObjectId;
            rawMaterialName?: string;
            lotId: Types.ObjectId;
            lotNumber: string;
            quantity: number;
            unit: RawMaterialUnit;
            costPerUnit: number;
            expiryDate: Date;
        }> = [];

        let actualTotalCost = 0;
        const successfullyDeductedLots: Array<{
            lotId: Types.ObjectId;
            rawMaterialId: Types.ObjectId;
            quantity: number;
        }> = [];

        for (const alloc of check.fefoAllocations) {
            const deductQty = alloc.allocatedQuantity;

            // Atomic conditional deduction on the Lot
            // Only succeeds if availableQuantity is currently >= deductQty, status is AVAILABLE, and unexpired
            const updatedLot = await RawMaterialLotModel.findOneAndUpdate(
                {
                    _id: alloc.lotId,
                    availableQuantity: { $gte: deductQty },
                    status: "AVAILABLE",
                    isDepleted: false,
                    expiryDate: { $gt: mfgDate },
                },
                {
                    $inc: { availableQuantity: -deductQty },
                    $set: { updatedAt: new Date() },
                },
                { returnDocument: "after" }
            );

            if (!updatedLot) {
                // Concurrency race condition detected!
                // Another concurrent worker consumed this lot balance between check and execution.
                // Roll back any lots already deducted in this loop:
                for (const rollbackItem of successfullyDeductedLots) {
                    await RawMaterialLotModel.findByIdAndUpdate(rollbackItem.lotId, {
                        $inc: { availableQuantity: rollbackItem.quantity },
                        $set: { isDepleted: false, status: "AVAILABLE" },
                    });
                    await RawMaterialModel.findByIdAndUpdate(rollbackItem.rawMaterialId, {
                        $inc: { currentStock: rollbackItem.quantity },
                    });
                }

                throw new AppError(
                    `Concurrency Conflict: Lot '${alloc.lotNumber}' for '${alloc.rawMaterialName}' has insufficient available stock (${alloc.allocatedQuantity} ${alloc.unit} required). Another concurrent production run or order may have consumed this inventory. Please retry.`,
                    409,
                    "CONCURRENCY_CONFLICT"
                );
            }

            if (updatedLot.availableQuantity <= 0.0001) {
                updatedLot.availableQuantity = 0;
                updatedLot.isDepleted = true;
                updatedLot.status = "DEPLETED";
                await updatedLot.save();
            }

            // Atomic conditional update on RawMaterial currentStock
            const updatedRm = await RawMaterialModel.findOneAndUpdate(
                {
                    _id: updatedLot.rawMaterialId,
                    currentStock: { $gte: deductQty },
                },
                {
                    $inc: { currentStock: -deductQty },
                },
                { returnDocument: "after" }
            );

            if (!updatedRm) {
                // Rollback current lot as well
                await RawMaterialLotModel.findByIdAndUpdate(updatedLot._id, {
                    $inc: { availableQuantity: deductQty },
                    $set: { isDepleted: false },
                });
                for (const rollbackItem of successfullyDeductedLots) {
                    await RawMaterialLotModel.findByIdAndUpdate(rollbackItem.lotId, {
                        $inc: { availableQuantity: rollbackItem.quantity },
                        $set: { isDepleted: false },
                    });
                    await RawMaterialModel.findByIdAndUpdate(rollbackItem.rawMaterialId, {
                        $inc: { currentStock: rollbackItem.quantity },
                    });
                }
                throw new AppError(
                    `Concurrency Conflict: Raw material '${alloc.rawMaterialName}' current stock was modified concurrently. Please retry.`,
                    409,
                    "CONCURRENCY_CONFLICT"
                );
            }

            successfullyDeductedLots.push({
                lotId: updatedLot._id as Types.ObjectId,
                rawMaterialId: updatedLot.rawMaterialId as Types.ObjectId,
                quantity: deductQty,
            });

            // Log Raw Material Ledger
            const prevStock = updatedRm.currentStock + deductQty;
            const newStock = updatedRm.currentStock;
            const ledger = new RawMaterialStockMovementModel({
                rawMaterialId: updatedRm._id,
                lotId: updatedLot._id,
                lotNumber: updatedLot.lotNumber,
                type: "MANUFACTURING_CONSUMPTION",
                quantityDelta: -deductQty,
                unit: updatedRm.unit,
                previousStock: prevStock,
                newStock: newStock,
                referenceType: "PRODUCTION_RUN",
                referenceId: batchNumber,
                reason: `Consumed for batch ${batchNumber} (${recipe.name} v${recipe.version})`,
                actor: resolvedActor,
            });
            await ledger.save();

            const itemCost = deductQty * updatedLot.costPerUnit;
            actualTotalCost += itemCost;

            lotsConsumed.push({
                rawMaterialId: updatedLot.rawMaterialId,
                rawMaterialName: alloc.rawMaterialName,
                lotId: updatedLot._id as Types.ObjectId,
                lotNumber: updatedLot.lotNumber,
                quantity: deductQty,
                unit: alloc.unit,
                costPerUnit: updatedLot.costPerUnit,
                expiryDate: new Date(alloc.expiryDate),
            });
        }

        // Add overhead
        const batchYieldQty = recipe.batchYield.quantity || 1;
        const multiplier = input.actualQuantity / batchYieldQty;
        actualTotalCost += (recipe.laborOverheadCost || 0) * multiplier;

        const actualUnitCost = Math.round((actualTotalCost / input.actualQuantity) * 100) / 100;
        const estimatedUnitCost = check.estimatedCostWac;
        const costVariance = Math.round((actualUnitCost - estimatedUnitCost) * 100) / 100;

        // Calculate Expected vs Actual Wastage
        let expectedLossQuantity = 0;
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            for (const ing of recipe.ingredients) {
                const ingMultiplier = input.actualQuantity / batchYieldQty;
                const expectedGross = ing.quantity * ingMultiplier;
                const expectedLoss = expectedGross * (((ing as any).wastagePercent ?? (ing as any).lossPercentage ?? 0) / 100);
                expectedLossQuantity += expectedLoss;
            }
        }
        expectedLossQuantity = Math.round(expectedLossQuantity * 1000) / 1000;

        const actualLossQuantity = input.actualLossQuantity !== undefined
            ? input.actualLossQuantity
            : expectedLossQuantity;
        const varianceQuantity = Math.round((actualLossQuantity - expectedLossQuantity) * 1000) / 1000;

        const wastageReport = {
            expectedLossQuantity,
            actualLossQuantity,
            varianceQuantity,
            unit: (recipe.batchYield.unit || "kg") as RawMaterialUnit,
            wastageCategory: input.wastageCategory || "RECIPE_NORMAL_LOSS",
            wastageNotes: input.wastageNotes || undefined,
        };

        // Determine Expiry Date & QA Audit Trail
        const recipeShelfLifeDays = recipe.shelfLifeDays || 30;
        const recipeTheoreticalDate = new Date(mfgDate);
        recipeTheoreticalDate.setDate(recipeTheoreticalDate.getDate() + recipeShelfLifeDays);

        let shortestIngredientExpiryDate: string | undefined = undefined;
        let shortestIngredientName: string | undefined = undefined;
        if (lotsConsumed.length > 0) {
            const sortedLots = [...lotsConsumed].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
            shortestIngredientExpiryDate = sortedLots[0]!.expiryDate.toISOString();
            shortestIngredientName = sortedLots[0]!.rawMaterialName;
        }

        const systemRecommendedDate = check.recommendedBestBeforeDate;
        let finalExpiryDate = systemRecommendedDate;
        let decisionType: "ACCEPTED_SYSTEM_RECOMMENDATION" | "QA_OVERRIDE" | "MANUAL_SPECIFICATION" =
            "ACCEPTED_SYSTEM_RECOMMENDATION";

        if (input.customExpiryDate) {
            finalExpiryDate = new Date(input.customExpiryDate).toISOString();
            decisionType = "QA_OVERRIDE";
        }

        const expiryDetermination = {
            recipeShelfLifeDays,
            recipeTheoreticalExpiryDate: recipeTheoreticalDate.toISOString(),
            shortestIngredientExpiryDate,
            shortestIngredientName,
            systemRecommendedExpiryDate: systemRecommendedDate,
            finalExpiryDate,
            decisionType,
            qaApprovalNotes: input.qaApprovalNotes || undefined,
        };

        // 4. Record Finished Goods into Store Inventory Ledger
        const variantId = recipe.variantId || (product.variants[0] as any)?._id || product.variants[0]?.id;
        const warehouseId = new Types.ObjectId(input.warehouseId);

        const invQuery: Record<string, any> = {
            productId: product._id,
            warehouseId,
        };
        if (variantId) {
            invQuery.variantId = new Types.ObjectId(variantId);
        }

        let inventory = await InventoryModel.findOne(invQuery);

        const prevOnHand = inventory ? inventory.onHand : 0;
        const newOnHand = prevOnHand + input.actualQuantity;

        if (!inventory) {
            const invPayload: Record<string, any> = {
                productId: product._id,
                variantId: variantId ? new Types.ObjectId(variantId) : new Types.ObjectId(),
                warehouseId,
                onHand: newOnHand,
                reserved: 0,
                backordered: 0,
                safetyStock: 5,
                reorderThreshold: 10,
                allowBackorder: false,
            };
            if (resolvedActor) invPayload.updatedBy = resolvedActor;
            inventory = new InventoryModel(invPayload);
        } else {
            inventory.onHand = newOnHand;
            if (resolvedActor) {
                inventory.updatedBy = resolvedActor;
            }
        }
        await inventory.save();

        // Write immutable StockMovement for finished product
        const finishedMovement = new StockMovementModel({
            inventoryId: inventory._id,
            productId: product._id,
            variantId: inventory.variantId,
            warehouseId,
            type: "STOCK_RECEIPT",
            quantityDelta: input.actualQuantity,
            previousOnHand: prevOnHand,
            newOnHand: newOnHand,
            previousReserved: inventory.reserved,
            newReserved: inventory.reserved,
            previousBackordered: inventory.backordered,
            newBackordered: inventory.backordered,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: batchNumber,
            reason: `Manufactured batch ${batchNumber} (${recipe.name} v${recipe.version}, Best Before: ${finalExpiryDate.slice(0, 10)})`,
            actor: resolvedActor,
        });
        await finishedMovement.save();

        // 5. Create ProductionRun record
        const variantObj = product.variants.find((v: any) => v.id === variantId?.toString() || (v as any)._id?.toString() === variantId?.toString());

        const productionRun = new ProductionRunModel({
            batchNumber,
            recipeId: recipe._id,
            recipeCode: recipe.code,
            recipeName: recipe.name,
            recipeVersion: recipe.version,
            productId: product._id,
            productTitle: product.title,
            variantId: variantId ? new Types.ObjectId(variantId) : undefined,
            variantTitle: variantObj ? variantObj.title : undefined,
            warehouseId,
            plannedQuantity: input.plannedQuantity,
            actualQuantity: input.actualQuantity,
            yieldUnit: recipe.batchYield.unit,
            status: "COMPLETED",
            manufacturingDate: mfgDate,
            expiryDate: new Date(finalExpiryDate),
            expiryDetermination,
            wastageReport,
            lotsConsumed,
            actualTotalCost: Math.round(actualTotalCost * 100) / 100,
            actualUnitCost,
            estimatedUnitCost,
            costVariance,
            notes: input.notes?.trim(),
        });
        await productionRun.save();

        // 6. Record Outbox Event for Asynchronous Side Effects
        await outboxService.recordEvent({
            eventType: "PRODUCTION_BATCH_COMPLETED",
            aggregateType: "ProductionRun",
            aggregateId: productionRun._id,
            deduplicationKey: `PRODUCTION_BATCH_COMPLETED:${productionRun._id.toString()}`,
            payload: {
                productionRunId: productionRun._id.toString(),
                batchNumber: productionRun.batchNumber,
                productId: productionRun.productId.toString(),
                productTitle: productionRun.productTitle,
                actualQuantity: productionRun.actualQuantity,
                yieldUnit: productionRun.yieldUnit,
                expiryDate: productionRun.expiryDate.toISOString(),
            },
        });
        outboxDispatcher.triggerImmediate();

        return productionRun.toObject();
    }

    // -------------------------------------------------------------------------
    // 6. CONTROLLED MANUFACTURING REVERSAL FLOW
    // -------------------------------------------------------------------------

    async reverseProductionRun(batchId: string, input: ReverseProductionInput, actor?: any) {
        const resolvedActor = await getActorSnapshot(actor);

        const run = await ProductionRunModel.findById(batchId);
        if (!run) {
            throw new AppError(`Production run with ID '${batchId}' not found.`, 404, "NOT_FOUND");
        }

        const previouslyReversed = run.reversedQuantity || 0;
        const remainingBatchUnits = run.actualQuantity - previouslyReversed;
        if (remainingBatchUnits <= 0 || run.status === "REVERSED") {
            throw new AppError(`Production run '${run.batchNumber}' has already been fully reversed.`, 400, "ALREADY_REVERSED");
        }

        // 1. Verify finished inventory has not already been dispatched
        const invFilter: Record<string, any> = {
            productId: run.productId,
            warehouseId: run.warehouseId,
        };
        if (run.variantId) {
            invFilter.variantId = run.variantId;
        }
        const inventory = await InventoryModel.findOne(invFilter);

        const currentOnHand = inventory ? inventory.onHand : 0;
        const targetReverseQty = input.reverseQuantity !== undefined ? input.reverseQuantity : remainingBatchUnits;
        const soldOrReserved = Math.max(0, remainingBatchUnits - currentOnHand);

        if (targetReverseQty <= 0) {
            throw new AppError("Reversal quantity must be greater than 0.", 400, "INVALID_QUANTITY");
        }
        if (targetReverseQty > remainingBatchUnits) {
            throw new AppError(`Cannot reverse ${targetReverseQty} units: only ${remainingBatchUnits} units remain unreversed in batch ${run.batchNumber}.`, 400, "INVALID_QUANTITY");
        }

        if (!inventory || currentOnHand < targetReverseQty) {
            throw new AppError(
                `Cannot reverse production run '${run.batchNumber}': ${run.actualQuantity} units were produced, but ${soldOrReserved} units have already been sold or reserved from warehouse inventory. Currently available on hand: ${currentOnHand} units. Maximum reversible quantity: ${currentOnHand}. To reverse the remaining available stock, specify reverseQuantity: ${currentOnHand}.`,
                400,
                "CANNOT_REVERSE_SOLD_UNITS"
            );
        }

        // 1b. Atomic conditional claim on unreversed batch units (prevents concurrent double reversals)
        const lockedRun = await ProductionRunModel.findOneAndUpdate(
            {
                _id: run._id,
                status: { $ne: "REVERSED" },
                $expr: {
                    $gte: [
                        { $subtract: ["$actualQuantity", { $ifNull: ["$reversedQuantity", 0] }] },
                        targetReverseQty,
                    ],
                },
            },
            {
                $inc: { reversedQuantity: targetReverseQty },
            },
            { returnDocument: "after" }
        );

        if (!lockedRun) {
            throw new AppError(
                `Production run '${run.batchNumber}' cannot be reversed: already reversed or concurrent reversal in progress.`,
                409,
                "CONCURRENCY_CONFLICT"
            );
        }

        // 2. Decrement Finished Inventory Atomically
        const prevOnHand = inventory.onHand;
        const updatedInventory = await InventoryModel.findOneAndUpdate(
            {
                _id: inventory._id,
                onHand: { $gte: targetReverseQty },
            },
            {
                $inc: { onHand: -targetReverseQty },
                ...(resolvedActor ? { $set: { updatedBy: resolvedActor } } : {}),
            },
            { returnDocument: "after" }
        );

        if (!updatedInventory) {
            await ProductionRunModel.findByIdAndUpdate(run._id, {
                $inc: { reversedQuantity: -targetReverseQty },
            });
            throw new AppError(
                `Cannot reverse production run '${run.batchNumber}': finished inventory was already consumed or reserved.`,
                400,
                "CANNOT_REVERSE_SOLD_UNITS"
            );
        }

        const newOnHand = updatedInventory.onHand;
        const ratio = targetReverseQty / run.actualQuantity;

        const revIndex = run.status === "PARTIALLY_REVERSED" ? 2 : 1;
        const reversalRef = `${run.batchNumber}-REV-00${revIndex}`;

        const finishedMovement = new StockMovementModel({
            inventoryId: inventory._id,
            productId: run.productId,
            variantId: run.variantId || inventory.variantId,
            warehouseId: run.warehouseId,
            type: "DAMAGE_WRITE_OFF",
            quantityDelta: -targetReverseQty,
            previousOnHand: prevOnHand,
            newOnHand: newOnHand,
            previousReserved: inventory.reserved,
            newReserved: inventory.reserved,
            previousBackordered: inventory.backordered,
            newBackordered: inventory.backordered,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: reversalRef,
            reason: `Reversal of ${targetReverseQty} units of batch ${run.batchNumber}: ${input.reason}`,
            actor: resolvedActor,
        });
        await finishedMovement.save();

        // 3. Restore Raw Material Lots & Raw Material Stock Ledger Proportionally
        for (const item of run.lotsConsumed) {
            const restoreQty = Math.round(item.quantity * ratio * 1000) / 1000;
            const lot = await RawMaterialLotModel.findById(item.lotId);
            if (lot) {
                lot.availableQuantity += restoreQty;
                lot.isDepleted = false;
                await lot.save();
            }

            const rm = await RawMaterialModel.findById(item.rawMaterialId);
            if (rm) {
                const prevStock = rm.currentStock;
                const newStock = prevStock + restoreQty;
                rm.currentStock = newStock;
                await rm.save();

                const ledger = new RawMaterialStockMovementModel({
                    rawMaterialId: rm._id,
                    lotId: item.lotId,
                    lotNumber: item.lotNumber,
                    type: "MANUFACTURING_REVERSAL",
                    quantityDelta: restoreQty,
                    unit: item.unit,
                    previousStock: prevStock,
                    newStock: newStock,
                    referenceType: "PRODUCTION_RUN",
                    referenceId: reversalRef,
                    reason: `Reversal of ${targetReverseQty} units of batch ${run.batchNumber}: ${input.reason}`,
                    actor: resolvedActor,
                });
                await ledger.save();
            }
        }

        // 4. Update ProductionRun Status
        const newTotalReversed = lockedRun.reversedQuantity || 0;
        lockedRun.status = newTotalReversed >= lockedRun.actualQuantity ? "REVERSED" : "PARTIALLY_REVERSED";
        lockedRun.reversalDetails = {
            reversedAt: new Date(),
            reversalReference: reversalRef,
            reason: input.reason.trim(),
            reversedBy: resolvedActor,
            reversedQuantity: targetReverseQty,
            originalQuantity: lockedRun.actualQuantity,
            soldOrReservedAtReversal: soldOrReserved,
            isPartial: lockedRun.status === "PARTIALLY_REVERSED",
        };
        await lockedRun.save();

        // 5. Record Outbox Event for Reversal
        await outboxService.recordEvent({
            eventType: "PRODUCTION_BATCH_REVERSED",
            aggregateType: "ProductionRun",
            aggregateId: lockedRun._id,
            deduplicationKey: `PRODUCTION_BATCH_REVERSED:${lockedRun._id.toString()}:${reversalRef}`,
            payload: {
                productionRunId: lockedRun._id.toString(),
                batchNumber: lockedRun.batchNumber,
                reversedQuantity: targetReverseQty,
                remainingBatchUnits: lockedRun.actualQuantity - newTotalReversed,
                reason: input.reason.trim(),
                isPartial: lockedRun.status === "PARTIALLY_REVERSED",
                actor: resolvedActor,
            },
        });
        outboxDispatcher.triggerImmediate();

        return lockedRun.toObject();
    }

    async listProductionRuns(query?: {
        productId?: string | undefined;
        recipeId?: string | undefined;
        status?: string | undefined;
        limit?: number | undefined;
    }) {
        const filter: Record<string, any> = {};
        if (query?.productId) filter.productId = new Types.ObjectId(query.productId);
        if (query?.recipeId) filter.recipeId = new Types.ObjectId(query.recipeId);
        if (query?.status) filter.status = query.status;

        const runs = await ProductionRunModel.find(filter)
            .populate("warehouseId", "name code")
            .sort({ manufacturingDate: -1 })
            .limit(query?.limit || 50)
            .lean();
        return runs.map((r: any) => ({
            ...r,
            id: r._id?.toString() || r.id,
        }));
    }

    // -------------------------------------------------------------------------
    // 7. SYNC VARIANT COST (DYNAMIC MATCHING, NO HARDCODED prices[0])
    // -------------------------------------------------------------------------

    async syncVariantCost(input: SyncVariantCostInput) {
        const product = await ProductModel.findById(input.productId);
        if (!product) {
            throw new AppError(`Product with ID '${input.productId}' not found.`, 404, "NOT_FOUND");
        }

        const variant = product.variants.find((v: any) => v.id === input.variantId || v._id?.toString() === input.variantId);
        if (!variant) {
            throw new AppError(`Variant with ID '${input.variantId}' not found on product '${product.title}'.`, 404, "NOT_FOUND");
        }

        // Find the matching price tier by currency and locationCode
        const targetCurrency = input.currency || product.baseCurrency || "INR";
        let targetPrice = variant.prices.find((p: any) => {
            const currMatch = p.currency?.toUpperCase() === targetCurrency.toUpperCase();
            if (input.locationCode) {
                return currMatch && p.locationCode?.toLowerCase() === input.locationCode.toLowerCase();
            }
            return currMatch;
        });

        if (!targetPrice && variant.prices.length > 0) {
            targetPrice = variant.prices[0];
        }

        if (targetPrice) {
            targetPrice.costAmount = input.costAmount;
            if (input.sellingPrice !== undefined && input.sellingPrice >= 0) {
                targetPrice.amount = input.sellingPrice;
            }
        } else {
            const newPrice: any = {
                currency: targetCurrency,
                amount: input.sellingPrice !== undefined && input.sellingPrice >= 0 ? input.sellingPrice : 0,
                costAmount: input.costAmount,
            };
            if (input.locationCode) {
                newPrice.locationCode = input.locationCode;
            }
            variant.prices.push(newPrice);
        }

        await product.save();
        return {
            productId: product._id.toString(),
            variantId: variant.id,
            updatedCostAmount: input.costAmount,
            updatedSellingPrice: targetPrice?.amount,
            currency: targetPrice?.currency || targetCurrency,
        };
    }

    async batchSyncVariantPricing(input: BatchSyncVariantPricingInput) {
        const product = await ProductModel.findById(input.productId);
        if (!product) {
            throw new AppError(`Product with ID '${input.productId}' not found.`, 404, "NOT_FOUND");
        }

        const results: Array<{
            variantId: string;
            costAmount?: number | undefined;
            sellingPrice?: number | undefined;
            currency: string;
        }> = [];

        for (const update of input.updates) {
            const variant = product.variants.find(
                (v: any) => v.id === update.variantId || v._id?.toString() === update.variantId
            );
            if (!variant) continue;

            const targetCurrency = update.currency || product.baseCurrency || "INR";
            let targetPrice = variant.prices.find((p: any) => {
                const currMatch = p.currency?.toUpperCase() === targetCurrency.toUpperCase();
                if (update.locationCode) {
                    return currMatch && p.locationCode?.toLowerCase() === update.locationCode.toLowerCase();
                }
                return currMatch;
            });

            if (!targetPrice && variant.prices.length > 0) {
                targetPrice = variant.prices[0];
            }

            if (targetPrice) {
                if (update.costAmount !== undefined && update.costAmount >= 0) {
                    targetPrice.costAmount = update.costAmount;
                }
                if (update.sellingPrice !== undefined && update.sellingPrice >= 0) {
                    targetPrice.amount = update.sellingPrice;
                }
            } else {
                const newPrice: any = {
                    currency: targetCurrency,
                    amount: update.sellingPrice !== undefined && update.sellingPrice >= 0 ? update.sellingPrice : 0,
                    costAmount: update.costAmount !== undefined && update.costAmount >= 0 ? update.costAmount : 0,
                };
                if (update.locationCode) {
                    newPrice.locationCode = update.locationCode;
                }
                variant.prices.push(newPrice);
            }

            results.push({
                variantId: (variant.id || (variant as any)._id?.toString()) as string,
                costAmount: targetPrice?.costAmount ?? update.costAmount,
                sellingPrice: targetPrice?.amount ?? update.sellingPrice,
                currency: targetPrice?.currency || targetCurrency,
            });
        }

        await product.save();
        return {
            productId: product._id.toString(),
            updatedVariants: results.length,
            updates: results,
        };
    }

    async autoGenerateVariantRecipes(input: AutoGenerateVariantRecipesInput) {
        const baseRecipe = await RecipeModel.findById(input.baseRecipeId);
        if (!baseRecipe) {
            throw new AppError(`Base recipe with ID '${input.baseRecipeId}' not found.`, 404, "NOT_FOUND");
        }

        const product = await ProductModel.findById(baseRecipe.productId);
        if (!product) {
            throw new AppError(`Product with ID '${baseRecipe.productId}' not found.`, 404, "NOT_FOUND");
        }

        // Helper to extract numeric grams / units
        const getVariantNumericWeight = (v: any): number => {
            if (v.weight && v.weight > 0) {
                const unit = (v.weightUnit || "g").toLowerCase();
                if (unit === "kg" || unit === "l") return v.weight * 1000;
                return v.weight;
            }
            const match = (v.title || "").match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|l|ltr|litre|litres|ml|pcs|pack|packs|pieces)?/i);
            if (match) {
                const val = parseFloat(match[1]);
                const unit = (match[2] || "g").toLowerCase();
                if (unit === "kg" || unit === "l" || unit.startsWith("ltr") || unit.startsWith("litre")) {
                    return val * 1000;
                }
                return val;
            }
            return 1;
        };

        const baseVariantId = baseRecipe.variantId?.toString();
        const baseVariant = baseVariantId
            ? product.variants.find((v: any) => (v.id || v._id?.toString()) === baseVariantId)
            : null;

        // When not anchored to a specific variant, calculate base weight from the recipe's batch yield (e.g. 1kg = 1,000g, 100kg = 100,000g)
        let baseWeight = 1000;
        if (!baseVariant) {
            const unit = (baseRecipe.batchYield?.unit || "kg").toLowerCase();
            const qty = baseRecipe.batchYield?.quantity || 1;
            if (unit === "kg" || unit === "l" || unit.startsWith("ltr") || unit.startsWith("litre")) {
                baseWeight = qty * 1000;
            } else if (unit === "g" || unit === "gm" || unit === "gms" || unit === "ml") {
                baseWeight = qty;
            } else {
                baseWeight = qty * 1000;
            }
        } else {
            baseWeight = getVariantNumericWeight(baseVariant);
        }

        const isUniversalMaster = !baseVariant;

        const targetVariants = product.variants.filter((v: any) => {
            const vId = v.id || v._id?.toString();
            if (!isUniversalMaster && baseVariant && (baseVariant.id || (baseVariant as any)._id?.toString()) === vId) {
                return false; // Skip base variant itself only if a specific variant was explicitly formulated
            }
            if (input.targetVariantIds && input.targetVariantIds.length > 0) {
                return input.targetVariantIds.includes(vId);
            }
            return true;
        });

        const createdRecipes: RecipeDocument[] = [];

        for (const variant of targetVariants) {
            const vId = variant.id || (variant as any)._id?.toString();
            const targetWeight = getVariantNumericWeight(variant);
            const calculatedRatio = baseWeight > 0 ? targetWeight / baseWeight : 1;
            const ratio = (input.customRatios && typeof input.customRatios[vId] === "number" && input.customRatios[vId]! > 0)
                ? input.customRatios[vId]!
                : calculatedRatio;

            const prefix = input.prefixCode?.trim() || baseRecipe.code.replace(/-\d+(?:G|KG|ML|L)$/i, "");
            const suffix = variant.sku ? variant.sku.replace(/^.*?-/, "") : variant.title.replace(/\s+/g, "").toUpperCase();
            const generatedCode = `${prefix}-${suffix}`;

            let existing = await RecipeModel.findOne({
                productId: product._id,
                variantId: new Types.ObjectId(vId),
                status: "ACTIVE",
            });

            if (existing) {
                existing.ingredients = baseRecipe.ingredients.map((ing) => ({
                    rawMaterialId: ing.rawMaterialId,
                    quantity: Math.round(ing.quantity * ratio * 1000) / 1000,
                    unit: ing.unit,
                    wastagePercent: ing.wastagePercent || 0,
                }));
                existing.packagingMaterials = baseRecipe.packagingMaterials.map((pkg) => ({
                    rawMaterialId: pkg.rawMaterialId,
                    quantity: pkg.quantity,
                    unit: pkg.unit,
                }));
                existing.laborOverheadCost = Math.round((baseRecipe.laborOverheadCost || 0) * ratio * 100) / 100;
                const costs = await this.calculateRecipeEstimatedCost(existing);
                existing.estimatedCostWac = costs.estimatedCostWac;
                existing.estimatedCostHighest = costs.estimatedCostHighest;
                await existing.save();
                createdRecipes.push(existing);
            } else {
                let finalCode = generatedCode;
                const codeCollision = await RecipeModel.findOne({ code: finalCode });
                if (codeCollision) {
                    finalCode = `${generatedCode}-${Math.floor(100 + Math.random() * 900)}`;
                }

                const newRecipe = new RecipeModel({
                    code: finalCode,
                    name: `${baseRecipe.name} (${variant.title})`,
                    version: 1,
                    status: "ACTIVE",
                    productId: product._id,
                    variantId: new Types.ObjectId(vId),
                    shelfLifeDays: baseRecipe.shelfLifeDays,
                    batchYield: baseRecipe.batchYield,
                    ingredients: baseRecipe.ingredients.map((ing) => ({
                        rawMaterialId: ing.rawMaterialId,
                        quantity: Math.round(ing.quantity * ratio * 1000) / 1000,
                        unit: ing.unit,
                        wastagePercent: ing.wastagePercent || 0,
                    })),
                    packagingMaterials: baseRecipe.packagingMaterials.map((pkg) => ({
                        rawMaterialId: pkg.rawMaterialId,
                        quantity: pkg.quantity,
                        unit: pkg.unit,
                    })),
                    laborOverheadCost: Math.round((baseRecipe.laborOverheadCost || 0) * ratio * 100) / 100,
                    instructions: baseRecipe.instructions,
                    changeLog: `Auto-generated from base recipe ${baseRecipe.code} with ${ratio.toFixed(2)}x ratio`,
                });

                const costs = await this.calculateRecipeEstimatedCost(newRecipe);
                newRecipe.estimatedCostWac = costs.estimatedCostWac;
                newRecipe.estimatedCostHighest = costs.estimatedCostHighest;
                await newRecipe.save();
                createdRecipes.push(newRecipe);
            }
        }

        return createdRecipes.map((r) => r.toObject());
    }

    // -------------------------------------------------------------------------
    // 8. STOCK TRANSFORMATION & REPACKAGING (BULK TO RETAIL VARIANT)
    // -------------------------------------------------------------------------

    async listRepackagingRuns(query?: {
        sourceRawMaterialId?: string | undefined;
        targetProductId?: string | undefined;
        status?: string | undefined;
    }) {
        const filter: Record<string, any> = {};
        if (query?.sourceRawMaterialId) {
            filter.sourceRawMaterialId = new Types.ObjectId(query.sourceRawMaterialId);
        }
        if (query?.targetProductId) {
            filter.targetProductId = new Types.ObjectId(query.targetProductId);
        }
        if (query?.status) {
            filter.status = query.status;
        }

        const runs = await RepackagingRunModel.find(filter)
            .populate("warehouseId", "name code")
            .sort({ createdAt: -1 })
            .lean();
        return runs.map((r: any) => ({
            ...r,
            id: r._id?.toString() || r.id,
        }));
    }

    async createRepackagingRun(input: CreateRepackagingRunInput, actor?: any) {
        const resolvedActor = await getActorSnapshot(actor);

        // 1. Validate Source Raw Material & Lot
        const sourceMaterial = await RawMaterialModel.findById(input.sourceRawMaterialId);
        if (!sourceMaterial) {
            throw new Error(`Source bulk material with ID '${input.sourceRawMaterialId}' not found.`);
        }

        const sourceLot = await RawMaterialLotModel.findById(input.sourceLotId);
        if (!sourceLot) {
            throw new Error(`Source lot with ID '${input.sourceLotId}' not found.`);
        }

        if (sourceLot.rawMaterialId.toString() !== sourceMaterial._id.toString()) {
            throw new Error(`Lot '${sourceLot.lotNumber}' does not belong to raw material '${sourceMaterial.name}'.`);
        }

        // 2. Validate Target Product & Variant
        const targetProduct = await ProductModel.findById(input.targetProductId);
        if (!targetProduct) {
            throw new Error(`Target retail product with ID '${input.targetProductId}' not found.`);
        }

        const targetVariant = targetProduct.variants.find((v: any) => v.id === input.targetVariantId);
        if (!targetVariant) {
            throw new Error(`Variant with ID '${input.targetVariantId}' not found on product '${targetProduct.title}'.`);
        }

        // 3. Compute bulk quantity required from source lot
        const totalNetContentInSourceUnit = convertUnits(
            input.packageUnitsProduced * input.unitSizeQuantity,
            input.unitSizeUnit,
            sourceMaterial.unit
        );
        const wastage = input.wastageQuantity || 0;
        const totalSourceQuantityNeeded = Math.round((totalNetContentInSourceUnit + wastage) * 1000) / 1000;
        const expectedLoss = input.expectedLossQuantity !== undefined ? input.expectedLossQuantity : wastage;
        const variance = Math.round((wastage - expectedLoss) * 1000) / 1000;

        const wastageReport = (wastage > 0 || input.expectedLossQuantity !== undefined) ? {
            expectedLossQuantity: expectedLoss,
            actualLossQuantity: wastage,
            varianceQuantity: variance,
            unit: sourceMaterial.unit as RawMaterialUnit,
            wastageCategory: input.wastageCategory || "RECIPE_NORMAL_LOSS",
            wastageNotes: input.wastageNotes || undefined,
        } : undefined;

        if (sourceLot.availableQuantity < totalSourceQuantityNeeded) {
            throw new Error(
                `Insufficient stock in source lot '${sourceLot.lotNumber}'. Required: ${totalSourceQuantityNeeded} ${sourceMaterial.unit}, Available: ${sourceLot.availableQuantity} ${sourceMaterial.unit}.`
            );
        }

        // 4. Generate Unique Run Number: RPK-YYYYMMDD-XXXX
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const randStr = Math.floor(1000 + Math.random() * 9000);
        const runNumber = `RPK-${dateStr}-${randStr}`;

        // 5. Concurrency-Safe Atomic Deduct from Source Lot
        const updatedSourceLot = await RawMaterialLotModel.findOneAndUpdate(
            { _id: sourceLot._id, availableQuantity: { $gte: totalSourceQuantityNeeded } },
            {
                $inc: { availableQuantity: -totalSourceQuantityNeeded },
                $set: { updatedAt: new Date() },
            },
            { returnDocument: "after" }
        );

        if (!updatedSourceLot) {
            throw new AppError(
                `Concurrency Conflict: Source lot '${sourceLot.lotNumber}' does not have sufficient available stock (${totalSourceQuantityNeeded} ${sourceMaterial.unit} required). Another concurrent operation may have allocated this stock.`,
                409,
                "CONCURRENCY_CONFLICT"
            );
        }

        if (updatedSourceLot.availableQuantity <= 0.0001) {
            updatedSourceLot.availableQuantity = 0;
            updatedSourceLot.isDepleted = true;
            await updatedSourceLot.save();
        }

        // 6. Deduct from Source Raw Material currentStock & log ledger
        const updatedSourceMaterial = await RawMaterialModel.findOneAndUpdate(
            { _id: sourceMaterial._id, currentStock: { $gte: totalSourceQuantityNeeded } },
            {
                $inc: { currentStock: -totalSourceQuantityNeeded },
                $set: { updatedAt: new Date() },
            },
            { returnDocument: "after" }
        );

        if (!updatedSourceMaterial) {
            // Rollback lot deduction if material stock was unexpectedly lower
            await RawMaterialLotModel.updateOne(
                { _id: sourceLot._id },
                { $inc: { availableQuantity: totalSourceQuantityNeeded }, $set: { isDepleted: false } }
            );
            throw new AppError(
                `Concurrency Conflict: Source raw material '${sourceMaterial.name}' does not have sufficient aggregate stock (${totalSourceQuantityNeeded} ${sourceMaterial.unit} required).`,
                409,
                "CONCURRENCY_CONFLICT"
            );
        }

        const prevStock = updatedSourceMaterial.currentStock + totalSourceQuantityNeeded;
        const newStock = updatedSourceMaterial.currentStock;

        const rawMovement = new RawMaterialStockMovementModel({
            rawMaterialId: sourceMaterial._id,
            lotId: sourceLot._id,
            lotNumber: sourceLot.lotNumber,
            type: "REPACKAGING_CONSUMPTION",
            quantityDelta: -totalSourceQuantityNeeded,
            unit: sourceMaterial.unit,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: "REPACKAGING_RUN",
            referenceId: runNumber,
            reason: `Repackaged into ${input.packageUnitsProduced} × ${input.unitSizeQuantity}${input.unitSizeUnit} packs of ${targetProduct.title} (${targetVariant.title})`,
            actor: resolvedActor,
        });
        await rawMovement.save();

        // 7. Handle optional packaging material deduction
        let packagingCost = 0;
        let packagingRmName: string | undefined = undefined;
        let packagingQty: number | undefined = undefined;

        if (input.packagingMaterialId) {
            const packagingRm = await RawMaterialModel.findById(input.packagingMaterialId);
            if (packagingRm) {
                packagingRmName = packagingRm.name;
                packagingQty = input.packageUnitsProduced; // 1 packaging unit per produced retail pack
                if (packagingRm.currentStock >= packagingQty) {
                    const prevPackStock = packagingRm.currentStock;
                    packagingRm.currentStock = Math.max(0, prevPackStock - packagingQty);
                    await packagingRm.save();

                    packagingCost = packagingQty * packagingRm.averageCost;

                    const packagingMovement = new RawMaterialStockMovementModel({
                        rawMaterialId: packagingRm._id,
                        type: "REPACKAGING_CONSUMPTION",
                        quantityDelta: -packagingQty,
                        unit: packagingRm.unit,
                        previousStock: prevPackStock,
                        newStock: packagingRm.currentStock,
                        referenceType: "REPACKAGING_RUN",
                        referenceId: runNumber,
                        reason: `Packaging pouches/containers consumed for repackaging run ${runNumber}`,
                        actor: resolvedActor,
                    });
                    await packagingMovement.save();
                }
            }
        }

        // 8. Calculate Financial Costs
        const bulkMaterialCost = totalSourceQuantityNeeded * sourceLot.costPerUnit;
        const totalCost = Math.round((bulkMaterialCost + packagingCost) * 100) / 100;
        const unitCost = Math.round((totalCost / input.packageUnitsProduced) * 100) / 100;

        // 9. Deposit Finished Goods into Store Inventory
        const warehouseId = new Types.ObjectId(input.warehouseId);
        const invQuery = {
            productId: targetProduct._id,
            variantId: new Types.ObjectId(targetVariant.id),
            warehouseId,
        };

        let inventory = await InventoryModel.findOne(invQuery);
        const prevOnHand = inventory ? inventory.onHand : 0;
        const newOnHand = prevOnHand + input.packageUnitsProduced;

        if (!inventory) {
            const invPayload: Record<string, any> = {
                productId: targetProduct._id,
                variantId: new Types.ObjectId(targetVariant.id),
                warehouseId,
                onHand: newOnHand,
                reserved: 0,
                backordered: 0,
                safetyStock: 5,
                reorderThreshold: 10,
                allowBackorder: false,
            };
            if (resolvedActor) invPayload.updatedBy = resolvedActor;
            inventory = new InventoryModel(invPayload);
        } else {
            inventory.onHand = newOnHand;
            if (resolvedActor) {
                inventory.updatedBy = resolvedActor;
            }
        }
        await inventory.save();

        // 10. Record Store Stock Movement (Traceability: references sourceLotNumber)
        const expiryDateStr = sourceLot.expiryDate ? new Date(sourceLot.expiryDate).toISOString().slice(0, 10) : "N/A";
        const stockMovement = new StockMovementModel({
            inventoryId: inventory._id,
            productId: targetProduct._id,
            variantId: inventory.variantId,
            warehouseId,
            type: "STOCK_RECEIPT",
            quantityDelta: input.packageUnitsProduced,
            previousOnHand: prevOnHand,
            newOnHand: newOnHand,
            previousReserved: inventory.reserved,
            newReserved: inventory.reserved,
            previousBackordered: inventory.backordered,
            newBackordered: inventory.backordered,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: runNumber,
            reason: `Repackaged run ${runNumber} from Bulk Lot ${sourceLot.lotNumber} (${sourceMaterial.name}, Best Before: ${expiryDateStr})`,
            actor: resolvedActor,
        });
        await stockMovement.save();

        // 11. Create RepackagingRun document
        const repackagingRun = new RepackagingRunModel({
            runNumber,
            sourceRawMaterialId: sourceMaterial._id,
            sourceRawMaterialName: sourceMaterial.name,
            sourceLotId: sourceLot._id,
            sourceLotNumber: sourceLot.lotNumber,
            sourceQuantity: totalSourceQuantityNeeded,
            sourceUnit: sourceMaterial.unit,
            targetProductId: targetProduct._id,
            targetProductTitle: targetProduct.title,
            targetVariantId: new Types.ObjectId(targetVariant.id),
            targetVariantTitle: targetVariant.title,
            packageUnitsProduced: input.packageUnitsProduced,
            unitSizeQuantity: input.unitSizeQuantity,
            unitSizeUnit: input.unitSizeUnit,
            packagingMaterialId: input.packagingMaterialId ? new Types.ObjectId(input.packagingMaterialId) : undefined,
            packagingMaterialName: packagingRmName,
            packagingMaterialQuantity: packagingQty,
            wastageQuantity: wastage,
            wastageReport,
            warehouseId,
            totalCost,
            unitCost,
            status: "COMPLETED",
            expiryDate: sourceLot.expiryDate,
            notes: input.notes?.trim(),
        });

        await repackagingRun.save();

        // 12. Record Outbox Event for Repackaging Completion
        await outboxService.recordEvent({
            eventType: "REPACKAGING_COMPLETED",
            aggregateType: "RepackagingRun",
            aggregateId: repackagingRun._id,
            deduplicationKey: `REPACKAGING_COMPLETED:${repackagingRun._id.toString()}`,
            payload: {
                repackagingRunId: repackagingRun._id.toString(),
                runNumber: repackagingRun.runNumber,
                packageUnitsProduced: repackagingRun.packageUnitsProduced,
                targetVariantSku: targetVariant.sku,
            },
        });
        outboxDispatcher.triggerImmediate();

        return repackagingRun.toObject();
    }

    async reverseRepackagingRun(runId: string, input: ReverseRepackagingRunInput, actor?: any) {
        const resolvedActor = await getActorSnapshot(actor);

        const run = await RepackagingRunModel.findById(runId);
        if (!run) {
            throw new AppError(`Repackaging run with ID '${runId}' not found.`, 404, "NOT_FOUND");
        }

        const previouslyReversed = run.reversedUnits || 0;
        const remainingBatchUnits = run.packageUnitsProduced - previouslyReversed;
        if (remainingBatchUnits <= 0 || run.status === "REVERSED") {
            throw new AppError(`Repackaging run '${run.runNumber}' has already been fully reversed.`, 400, "ALREADY_REVERSED");
        }

        // 1. Verify Finished Inventory is still available
        const invQuery = {
            productId: run.targetProductId,
            variantId: run.targetVariantId,
            warehouseId: run.warehouseId,
        };

        const inventory = await InventoryModel.findOne(invQuery);
        const currentOnHand = inventory ? inventory.onHand : 0;
        const targetReverseQty = input.reverseQuantity !== undefined ? input.reverseQuantity : remainingBatchUnits;
        const soldOrReserved = Math.max(0, remainingBatchUnits - currentOnHand);

        if (targetReverseQty <= 0) {
            throw new AppError("Reversal quantity must be greater than 0.", 400, "INVALID_QUANTITY");
        }
        if (targetReverseQty > remainingBatchUnits) {
            throw new AppError(`Cannot reverse ${targetReverseQty} units: only ${remainingBatchUnits} units remain unreversed in repackaging run ${run.runNumber}.`, 400, "INVALID_QUANTITY");
        }

        if (!inventory || currentOnHand < targetReverseQty) {
            throw new AppError(
                `Cannot reverse repackaging run '${run.runNumber}': ${run.packageUnitsProduced} units were packaged, but ${soldOrReserved} units have already been sold or reserved from warehouse inventory. Currently available on hand: ${currentOnHand} units. Maximum reversible quantity: ${currentOnHand}. To reverse the remaining available stock, specify reverseQuantity: ${currentOnHand}.`,
                400,
                "CANNOT_REVERSE_SOLD_UNITS"
            );
        }

        // 1b. Atomic conditional claim on unreversed repackaged units (prevents concurrent double reversals)
        const lockedRun = await RepackagingRunModel.findOneAndUpdate(
            {
                _id: run._id,
                status: { $ne: "REVERSED" },
                $expr: {
                    $gte: [
                        { $subtract: ["$packageUnitsProduced", { $ifNull: ["$reversedUnits", 0] }] },
                        targetReverseQty,
                    ],
                },
            },
            {
                $inc: { reversedUnits: targetReverseQty },
            },
            { returnDocument: "after" }
        );

        if (!lockedRun) {
            throw new AppError(
                `Repackaging run '${run.runNumber}' cannot be reversed: already reversed or concurrent reversal in progress.`,
                409,
                "CONCURRENCY_CONFLICT"
            );
        }

        // 2. Deduct from finished goods inventory atomically
        const prevOnHand = inventory.onHand;
        const updatedInventory = await InventoryModel.findOneAndUpdate(
            {
                _id: inventory._id,
                onHand: { $gte: targetReverseQty },
            },
            {
                $inc: { onHand: -targetReverseQty },
                ...(resolvedActor ? { $set: { updatedBy: resolvedActor } } : {}),
            },
            { returnDocument: "after" }
        );

        if (!updatedInventory) {
            await RepackagingRunModel.findByIdAndUpdate(run._id, {
                $inc: { reversedUnits: -targetReverseQty },
            });
            throw new AppError(
                `Cannot reverse repackaging run '${run.runNumber}': finished inventory was already consumed or reserved.`,
                400,
                "CANNOT_REVERSE_SOLD_UNITS"
            );
        }

        const newOnHand = updatedInventory.onHand;
        const ratio = targetReverseQty / run.packageUnitsProduced;

        const revIndex = run.status === "PARTIALLY_REVERSED" ? 2 : 1;
        const reversalRef = `${run.runNumber}-REV-00${revIndex}`;

        const contraFinishedMovement = new StockMovementModel({
            inventoryId: inventory._id,
            productId: run.targetProductId,
            variantId: run.targetVariantId,
            warehouseId: run.warehouseId,
            type: "DAMAGE_WRITE_OFF",
            quantityDelta: -targetReverseQty,
            previousOnHand: prevOnHand,
            newOnHand: newOnHand,
            previousReserved: inventory.reserved,
            newReserved: inventory.reserved,
            previousBackordered: inventory.backordered,
            newBackordered: inventory.backordered,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: reversalRef,
            reason: `Reversal of ${targetReverseQty} units of repackaging run ${run.runNumber}: ${input.reason}`,
            actor: resolvedActor,
        });
        await contraFinishedMovement.save();

        // 3. Restore bulk stock to source lot proportionally
        const restoreSourceQty = Math.round(run.sourceQuantity * ratio * 1000) / 1000;
        const sourceLot = await RawMaterialLotModel.findById(run.sourceLotId);
        if (sourceLot) {
            sourceLot.availableQuantity += restoreSourceQty;
            sourceLot.isDepleted = false;
            await sourceLot.save();
        }

        // 4. Restore bulk stock in RawMaterialModel & log contra-ledger
        const sourceMaterial = await RawMaterialModel.findById(run.sourceRawMaterialId);
        if (sourceMaterial) {
            const prevStock = sourceMaterial.currentStock;
            const newStock = prevStock + restoreSourceQty;
            sourceMaterial.currentStock = newStock;
            await sourceMaterial.save();

            const contraRawMovement = new RawMaterialStockMovementModel({
                rawMaterialId: sourceMaterial._id,
                lotId: run.sourceLotId,
                lotNumber: run.sourceLotNumber,
                type: "REPACKAGING_REVERSAL",
                quantityDelta: restoreSourceQty,
                unit: run.sourceUnit,
                previousStock: prevStock,
                newStock: newStock,
                referenceType: "REPACKAGING_RUN",
                referenceId: reversalRef,
                reason: `Reversal of ${targetReverseQty} units of repackaging run ${run.runNumber}: ${input.reason}`,
                actor: resolvedActor,
            });
            await contraRawMovement.save();
        }

        // 5. If packaging materials were used, restore them proportionally
        if (run.packagingMaterialId && run.packagingMaterialQuantity) {
            const packRm = await RawMaterialModel.findById(run.packagingMaterialId);
            if (packRm) {
                const restorePackQty = Math.round(run.packagingMaterialQuantity * ratio);
                if (restorePackQty > 0) {
                    const prevPackStock = packRm.currentStock;
                    packRm.currentStock += restorePackQty;
                    await packRm.save();

                    const contraPackaging = new RawMaterialStockMovementModel({
                        rawMaterialId: packRm._id,
                        type: "REPACKAGING_REVERSAL",
                        quantityDelta: restorePackQty,
                        unit: packRm.unit,
                        previousStock: prevPackStock,
                        newStock: packRm.currentStock,
                        referenceType: "REPACKAGING_RUN",
                        referenceId: reversalRef,
                        reason: `Reversal of ${restorePackQty} packaging units used in repackaging run ${run.runNumber}: ${input.reason}`,
                        actor: resolvedActor,
                    });
                    await contraPackaging.save();
                }
            }
        }

        // 6. Update RepackagingRun document
        const newTotalReversed = lockedRun.reversedUnits || 0;
        lockedRun.status = newTotalReversed >= lockedRun.packageUnitsProduced ? "REVERSED" : "PARTIALLY_REVERSED";
        lockedRun.reversalDetails = {
            reversedAt: new Date(),
            reversalReference: reversalRef,
            reason: input.reason.trim(),
            reversedBy: resolvedActor,
            reversedQuantity: targetReverseQty,
            originalQuantity: lockedRun.packageUnitsProduced,
            soldOrReservedAtReversal: soldOrReserved,
            isPartial: lockedRun.status === "PARTIALLY_REVERSED",
        };
        await lockedRun.save();

        // 7. Record Outbox Event for Repackaging Reversal
        await outboxService.recordEvent({
            eventType: "REPACKAGING_REVERSED",
            aggregateType: "RepackagingRun",
            aggregateId: lockedRun._id,
            deduplicationKey: `REPACKAGING_REVERSED:${lockedRun._id.toString()}:${reversalRef}`,
            payload: {
                repackagingRunId: lockedRun._id.toString(),
                runNumber: lockedRun.runNumber,
                reversedUnits: targetReverseQty,
                remainingUnits: lockedRun.packageUnitsProduced - newTotalReversed,
                reason: input.reason.trim(),
                isPartial: lockedRun.status === "PARTIALLY_REVERSED",
                actor: resolvedActor,
            },
        });
        outboxDispatcher.triggerImmediate();

        return lockedRun.toObject();
    }

    // -------------------------------------------------------------------------
    // 8. VENDOR MANAGEMENT
    // -------------------------------------------------------------------------

    async listVendors(query?: { search?: string | undefined; status?: string | undefined }) {
        const filter: Record<string, any> = {};

        if (query?.status) {
            filter.status = query.status;
        }

        if (query?.search?.trim()) {
            const term = query.search.trim();
            const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { name: { $regex: regex } },
                { contactNumber: { $regex: regex } },
                { email: { $regex: regex } },
                { gstin: { $regex: regex } },
            ];
        }

        const vendors = await VendorModel.find(filter).sort({ name: 1 }).lean();
        return vendors.map((v: any) => ({
            ...v,
            id: v._id?.toString() || (v as any).id,
        }));
    }

    async getVendorById(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid vendor ID.", 400, "INVALID_ID");
        }
        const vendor = await VendorModel.findById(id).lean();
        if (!vendor) {
            throw new AppError("Vendor not found.", 404, "NOT_FOUND");
        }
        return {
            ...vendor,
            id: (vendor as any)._id?.toString() || (vendor as any).id,
        };
    }

    async createVendor(input: CreateVendorInput) {
        const cleanName = input.name.trim();
        const existing = await VendorModel.findOne({
            name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });
        if (existing) {
            throw new AppError(`Vendor with name '${cleanName}' already exists.`, 409, "DUPLICATE_VENDOR");
        }

        const vendor = new VendorModel({
            name: cleanName,
            contactNumber: input.contactNumber?.trim() || "",
            email: input.email?.trim() || undefined,
            gstin: input.gstin?.trim()?.toUpperCase() || undefined,
            address: input.address?.trim() || undefined,
            status: input.status || "ACTIVE",
            notes: input.notes?.trim() || undefined,
            totalIntakes: 0,
            totalSpend: 0,
        });
        await vendor.save();
        return vendor.toObject();
    }

    async updateVendor(id: string, input: UpdateVendorInput) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid vendor ID.", 400, "INVALID_ID");
        }
        const vendor = await VendorModel.findById(id);
        if (!vendor) {
            throw new AppError("Vendor not found.", 404, "NOT_FOUND");
        }

        if (input.name !== undefined) {
            const cleanName = input.name.trim();
            const duplicate = await VendorModel.findOne({
                _id: { $ne: vendor._id },
                name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            });
            if (duplicate) {
                throw new AppError(`Another vendor with name '${cleanName}' already exists.`, 409, "DUPLICATE_VENDOR");
            }
            vendor.name = cleanName;
        }

        if (input.contactNumber !== undefined) vendor.contactNumber = input.contactNumber.trim();
        if (input.email !== undefined) vendor.email = input.email.trim() || undefined;
        if (input.gstin !== undefined) vendor.gstin = input.gstin.trim()?.toUpperCase() || undefined;
        if (input.address !== undefined) vendor.address = input.address.trim() || undefined;
        if (input.status !== undefined) vendor.status = input.status;
        if (input.notes !== undefined) vendor.notes = input.notes.trim() || undefined;

        await vendor.save();
        return vendor.toObject();
    }

    async getVendorPurchases(vendorId: string) {
        if (!Types.ObjectId.isValid(vendorId)) {
            throw new AppError("Invalid vendor ID.", 400, "INVALID_ID");
        }
        const vendor = await VendorModel.findById(vendorId);
        if (!vendor) {
            throw new AppError("Vendor not found.", 404, "NOT_FOUND");
        }

        const filter = {
            $or: [
                { vendorId: vendor._id },
                {
                    "supplier.name": {
                        $regex: new RegExp(`^${vendor.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                    },
                },
            ],
        };

        const lots = await RawMaterialLotModel.find(filter)
            .populate("rawMaterialId", "code name unit category")
            .sort({ receivedDate: -1 })
            .lean();

        return lots.map((l: any) => ({
            ...l,
            id: l._id?.toString() || (l as any).id,
        }));
    }
}

export const manufacturingService = new ManufacturingService();

