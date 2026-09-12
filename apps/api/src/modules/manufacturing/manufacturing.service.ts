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
    ProductionFeasibilityCheck,
    AuditActor,
} from "@ecommers/types";
import { RawMaterialModel, RawMaterialDocument } from "./raw-material.model.js";
import { RawMaterialLotModel, RawMaterialLotDocument } from "./raw-material-lot.model.js";
import { RawMaterialStockMovementModel } from "./raw-material-ledger.model.js";
import { RecipeModel, RecipeDocument } from "./recipe.model.js";
import { ProductionRunModel, ProductionRunDocument } from "./production-run.model.js";
import { RepackagingRunModel, RepackagingRunDocument } from "./repackaging-run.model.js";
import { InventoryModel } from "../inventory/models/inventory.model.js";
import { StockMovementModel } from "../inventory/models/stock-movement.model.js";
import { ProductModel } from "../products/product.model.js";
import { convertUnits, normalizeToBaseUnit } from "./unit-conversion.js";
import { resolveActor } from "../../utils/audit.js";

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

        return RawMaterialModel.find(filter).sort({ name: 1 }).lean();
    }

    async getRawMaterialById(id: string) {
        const rm = await RawMaterialModel.findById(id).lean();
        if (!rm) {
            throw new Error(`Raw material with ID '${id}' not found.`);
        }
        return rm;
    }

    async createRawMaterial(input: CreateRawMaterialInput, actor?: any) {
        const existing = await RawMaterialModel.findOne({
            code: input.code.trim().toUpperCase(),
        });
        if (existing) {
            throw new Error(`Raw material code '${input.code}' already exists.`);
        }

        const rm = new RawMaterialModel({
            code: input.code.trim().toUpperCase(),
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
            rm.linkedProductId = input.linkedProductId ? new Types.ObjectId(input.linkedProductId) : undefined;
        }
        if (input.linkedVariantId !== undefined) {
            rm.linkedVariantId = input.linkedVariantId ? new Types.ObjectId(input.linkedVariantId) : undefined;
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

        // 4. Create RawMaterialLot
        const lot = new RawMaterialLotModel({
            rawMaterialId: rm._id,
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

        return RawMaterialLotModel.find(filter)
            .populate("rawMaterialId", "code name unit category")
            .sort({ expiryDate: 1 })
            .lean();
    }

    async listLedger(query?: { rawMaterialId?: string | undefined; limit?: number | undefined }) {
        const filter: Record<string, any> = {};
        if (query?.rawMaterialId) {
            filter.rawMaterialId = new Types.ObjectId(query.rawMaterialId);
        }

        return RawMaterialStockMovementModel.find(filter)
            .populate("rawMaterialId", "code name unit")
            .sort({ createdAt: -1 })
            .limit(query?.limit || 100)
            .lean();
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

        return RecipeModel.find(filter)
            .populate("productId", "title slug baseCurrency variants")
            .populate("ingredients.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .populate("packagingMaterials.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .sort({ code: 1, version: -1 })
            .lean();
    }

    async getRecipeById(id: string) {
        const recipe = await RecipeModel.findById(id)
            .populate("productId", "title slug baseCurrency variants")
            .populate("ingredients.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .populate("packagingMaterials.rawMaterialId", "code name unit averageCost lastPurchasePrice")
            .lean();

        if (!recipe) {
            throw new Error(`Recipe with ID '${id}' not found.`);
        }

        // Recalculate dynamic live estimated costs based on current raw material values
        const costs = await this.calculateRecipeEstimatedCost(recipe as any);
        return {
            ...recipe,
            estimatedCostWac: costs.estimatedCostWac,
            estimatedCostHighest: costs.estimatedCostHighest,
        };
    }

    async calculateRecipeEstimatedCost(recipe: RecipeDocument) {
        let totalWac = 0;
        let totalHighest = 0;

        // 1. Ingredients
        for (const ing of recipe.ingredients) {
            const rm = await RawMaterialModel.findById(ing.rawMaterialId);
            if (!rm) continue;

            const baseQty = normalizeToBaseUnit(ing.quantity, ing.unit, rm.unit);
            const wastageMultiplier = 1 + (ing.wastagePercent || 0) / 100;
            const effectiveQty = baseQty * wastageMultiplier;

            totalWac += effectiveQty * (rm.averageCost || 0);
            totalHighest += effectiveQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        // 2. Packaging Materials
        for (const pkg of recipe.packagingMaterials || []) {
            const rm = await RawMaterialModel.findById(pkg.rawMaterialId);
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
            const lots = await RawMaterialLotModel.find({
                rawMaterialId: rm._id,
                isDepleted: false,
                availableQuantity: { $gt: 0 },
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
            throw new Error(`Cannot execute production run: Insufficient stock for ${missingNames}`);
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

        for (const alloc of check.fefoAllocations) {
            const lot = await RawMaterialLotModel.findById(alloc.lotId);
            if (!lot) {
                throw new Error(`Lot with ID '${alloc.lotId}' vanished during allocation.`);
            }

            const deductQty = alloc.allocatedQuantity;
            if (lot.availableQuantity < deductQty) {
                throw new Error(`Insufficient quantity in lot '${lot.lotNumber}' for material '${alloc.rawMaterialName}'.`);
            }

            lot.availableQuantity -= deductQty;
            if (lot.availableQuantity <= 0.0001) {
                lot.availableQuantity = 0;
                lot.isDepleted = true;
            }
            await lot.save();

            // Deduct RawMaterial stock cache
            const rm = await RawMaterialModel.findById(lot.rawMaterialId);
            if (rm) {
                const prevStock = rm.currentStock;
                const newStock = Math.max(0, prevStock - deductQty);
                rm.currentStock = newStock;
                await rm.save();

                // Log Raw Material Ledger
                const ledger = new RawMaterialStockMovementModel({
                    rawMaterialId: rm._id,
                    lotId: lot._id,
                    lotNumber: lot.lotNumber,
                    type: "MANUFACTURING_CONSUMPTION",
                    quantityDelta: -deductQty,
                    unit: rm.unit,
                    previousStock: prevStock,
                    newStock: newStock,
                    referenceType: "PRODUCTION_RUN",
                    referenceId: batchNumber,
                    reason: `Consumed for batch ${batchNumber} (${recipe.name} v${recipe.version})`,
                    actor: resolvedActor,
                });
                await ledger.save();
            }

            const itemCost = deductQty * lot.costPerUnit;
            actualTotalCost += itemCost;

            lotsConsumed.push({
                rawMaterialId: lot.rawMaterialId,
                rawMaterialName: alloc.rawMaterialName,
                lotId: lot._id as Types.ObjectId,
                lotNumber: lot.lotNumber,
                quantity: deductQty,
                unit: alloc.unit,
                costPerUnit: lot.costPerUnit,
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
            reason: `Manufactured batch ${batchNumber} (${recipe.name} v${recipe.version}, Best Before: ${check.recommendedBestBeforeDate.slice(0, 10)})`,
            actor: resolvedActor,
        });
        await finishedMovement.save();

        // 5. Create ProductionRun record
        const variantObj = product.variants.find((v: any) => v.id === variantId?.toString());

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
            expiryDate: new Date(check.recommendedBestBeforeDate),
            lotsConsumed,
            actualTotalCost: Math.round(actualTotalCost * 100) / 100,
            actualUnitCost,
            estimatedUnitCost,
            costVariance,
            notes: input.notes?.trim(),
        });
        await productionRun.save();

        return productionRun.toObject();
    }

    // -------------------------------------------------------------------------
    // 6. CONTROLLED MANUFACTURING REVERSAL FLOW
    // -------------------------------------------------------------------------

    async reverseProductionRun(batchId: string, input: ReverseProductionInput, actor?: any) {
        const resolvedActor = await getActorSnapshot(actor);

        const run = await ProductionRunModel.findById(batchId);
        if (!run) {
            throw new Error(`Production run with ID '${batchId}' not found.`);
        }

        if (run.status === "REVERSED") {
            throw new Error(`Production run '${run.batchNumber}' has already been reversed.`);
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

        if (!inventory || inventory.onHand < run.actualQuantity) {
            throw new Error(
                `Cannot reverse production batch: ${run.actualQuantity} units were manufactured, but only ${inventory?.onHand || 0} units are currently on hand in the warehouse (some units may have already been fulfilled or shipped).`
            );
        }

        // 2. Decrement Finished Inventory
        const prevOnHand = inventory.onHand;
        const newOnHand = prevOnHand - run.actualQuantity;
        inventory.onHand = newOnHand;
        if (resolvedActor) {
            inventory.updatedBy = resolvedActor;
        }
        await inventory.save();

        const reversalRef = `${run.batchNumber}-REV-001`;

        const finishedMovement = new StockMovementModel({
            inventoryId: inventory._id,
            productId: run.productId,
            variantId: run.variantId || inventory.variantId,
            warehouseId: run.warehouseId,
            type: "DAMAGE_WRITE_OFF",
            quantityDelta: -run.actualQuantity,
            previousOnHand: prevOnHand,
            newOnHand: newOnHand,
            previousReserved: inventory.reserved,
            newReserved: inventory.reserved,
            previousBackordered: inventory.backordered,
            newBackordered: inventory.backordered,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: reversalRef,
            reason: `Reversal of batch ${run.batchNumber}: ${input.reason}`,
            actor: resolvedActor,
        });
        await finishedMovement.save();

        // 3. Restore Raw Material Lots & Raw Material Stock Ledger
        for (const item of run.lotsConsumed) {
            const lot = await RawMaterialLotModel.findById(item.lotId);
            if (lot) {
                lot.availableQuantity += item.quantity;
                lot.isDepleted = false;
                await lot.save();
            }

            const rm = await RawMaterialModel.findById(item.rawMaterialId);
            if (rm) {
                const prevStock = rm.currentStock;
                const newStock = prevStock + item.quantity;
                rm.currentStock = newStock;
                await rm.save();

                const ledger = new RawMaterialStockMovementModel({
                    rawMaterialId: rm._id,
                    lotId: item.lotId,
                    lotNumber: item.lotNumber,
                    type: "MANUFACTURING_REVERSAL",
                    quantityDelta: item.quantity,
                    unit: item.unit,
                    previousStock: prevStock,
                    newStock: newStock,
                    referenceType: "PRODUCTION_RUN",
                    referenceId: reversalRef,
                    reason: `Reversal of batch ${run.batchNumber}: ${input.reason}`,
                    actor: resolvedActor,
                });
                await ledger.save();
            }
        }

        // 4. Update ProductionRun Status
        run.status = "REVERSED";
        run.reversalDetails = {
            reversedAt: new Date(),
            reversalReference: reversalRef,
            reason: input.reason.trim(),
            reversedBy: resolvedActor,
        };
        await run.save();

        return run.toObject();
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

        return ProductionRunModel.find(filter)
            .populate("warehouseId", "name code")
            .sort({ manufacturingDate: -1 })
            .limit(query?.limit || 50)
            .lean();
    }

    // -------------------------------------------------------------------------
    // 7. SYNC VARIANT COST (DYNAMIC MATCHING, NO HARDCODED prices[0])
    // -------------------------------------------------------------------------

    async syncVariantCost(input: SyncVariantCostInput) {
        const product = await ProductModel.findById(input.productId);
        if (!product) {
            throw new Error(`Product with ID '${input.productId}' not found.`);
        }

        const variant = product.variants.find((v: any) => v.id === input.variantId);
        if (!variant) {
            throw new Error(`Variant with ID '${input.variantId}' not found on product '${product.title}'.`);
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
        } else {
            const newPrice: any = {
                currency: targetCurrency,
                amount: 0,
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
            currency: targetPrice?.currency || targetCurrency,
        };
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

        return RepackagingRunModel.find(filter)
            .populate("warehouseId", "name code")
            .sort({ createdAt: -1 })
            .lean();
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

        // 5. Deduct from Source Lot
        sourceLot.availableQuantity -= totalSourceQuantityNeeded;
        if (sourceLot.availableQuantity <= 0.0001) {
            sourceLot.availableQuantity = 0;
            sourceLot.isDepleted = true;
        }
        await sourceLot.save();

        // 6. Deduct from Source Raw Material currentStock & log ledger
        const prevStock = sourceMaterial.currentStock;
        const newStock = Math.max(0, prevStock - totalSourceQuantityNeeded);
        sourceMaterial.currentStock = newStock;
        await sourceMaterial.save();

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
            warehouseId,
            totalCost,
            unitCost,
            status: "COMPLETED",
            expiryDate: sourceLot.expiryDate,
            notes: input.notes?.trim(),
        });

        await repackagingRun.save();
        return repackagingRun.toObject();
    }

    async reverseRepackagingRun(runId: string, input: ReverseRepackagingRunInput, actor?: any) {
        const resolvedActor = await getActorSnapshot(actor);

        const run = await RepackagingRunModel.findById(runId);
        if (!run) {
            throw new Error(`Repackaging run with ID '${runId}' not found.`);
        }

        if (run.status === "REVERSED") {
            throw new Error(`Repackaging run '${run.runNumber}' has already been reversed.`);
        }

        // 1. Verify Finished Inventory is still available
        const invQuery = {
            productId: run.targetProductId,
            variantId: run.targetVariantId,
            warehouseId: run.warehouseId,
        };

        const inventory = await InventoryModel.findOne(invQuery);
        if (!inventory || inventory.onHand < run.packageUnitsProduced) {
            throw new Error(
                `Cannot reverse repackaging run: ${run.packageUnitsProduced} units were produced, but only ${inventory?.onHand || 0} units are currently on hand in the warehouse (some units may have already been sold or dispatched).`
            );
        }

        // 2. Deduct from finished goods inventory
        const prevOnHand = inventory.onHand;
        const newOnHand = prevOnHand - run.packageUnitsProduced;
        inventory.onHand = newOnHand;
        if (resolvedActor) {
            inventory.updatedBy = resolvedActor;
        }
        await inventory.save();

        const contraFinishedMovement = new StockMovementModel({
            inventoryId: inventory._id,
            productId: run.targetProductId,
            variantId: run.targetVariantId,
            warehouseId: run.warehouseId,
            type: "DAMAGE_WRITE_OFF",
            quantityDelta: -run.packageUnitsProduced,
            previousOnHand: prevOnHand,
            newOnHand: newOnHand,
            previousReserved: inventory.reserved,
            newReserved: inventory.reserved,
            previousBackordered: inventory.backordered,
            newBackordered: inventory.backordered,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: `REV-${run.runNumber}`,
            reason: `Reversal of repackaging run ${run.runNumber}: ${input.reason}`,
            actor: resolvedActor,
        });
        await contraFinishedMovement.save();

        // 3. Restore bulk stock to source lot
        const sourceLot = await RawMaterialLotModel.findById(run.sourceLotId);
        if (sourceLot) {
            sourceLot.availableQuantity += run.sourceQuantity;
            sourceLot.isDepleted = false;
            await sourceLot.save();
        }

        // 4. Restore bulk stock in RawMaterialModel & log contra-ledger
        const sourceMaterial = await RawMaterialModel.findById(run.sourceRawMaterialId);
        if (sourceMaterial) {
            const prevStock = sourceMaterial.currentStock;
            const newStock = prevStock + run.sourceQuantity;
            sourceMaterial.currentStock = newStock;
            await sourceMaterial.save();

            const contraRawMovement = new RawMaterialStockMovementModel({
                rawMaterialId: sourceMaterial._id,
                lotId: run.sourceLotId,
                lotNumber: run.sourceLotNumber,
                type: "REPACKAGING_REVERSAL",
                quantityDelta: run.sourceQuantity,
                unit: run.sourceUnit,
                previousStock: prevStock,
                newStock: newStock,
                referenceType: "REPACKAGING_RUN",
                referenceId: run.runNumber,
                reason: `Reversal of repackaging run ${run.runNumber}: ${input.reason}`,
                actor: resolvedActor,
            });
            await contraRawMovement.save();
        }

        // 5. If packaging materials were used, restore them
        if (run.packagingMaterialId && run.packagingMaterialQuantity) {
            const packRm = await RawMaterialModel.findById(run.packagingMaterialId);
            if (packRm) {
                const prevPackStock = packRm.currentStock;
                packRm.currentStock += run.packagingMaterialQuantity;
                await packRm.save();

                const contraPackaging = new RawMaterialStockMovementModel({
                    rawMaterialId: packRm._id,
                    type: "REPACKAGING_REVERSAL",
                    quantityDelta: run.packagingMaterialQuantity,
                    unit: packRm.unit,
                    previousStock: prevPackStock,
                    newStock: packRm.currentStock,
                    referenceType: "REPACKAGING_RUN",
                    referenceId: run.runNumber,
                    reason: `Reversal of packaging used in repackaging run ${run.runNumber}: ${input.reason}`,
                    actor: resolvedActor,
                });
                await contraPackaging.save();
            }
        }

        // 6. Mark Run as REVERSED
        run.status = "REVERSED";
        run.reversalDetails = {
            reversedAt: new Date(),
            reversalReference: `REV-${run.runNumber}`,
            reason: input.reason.trim(),
            reversedBy: resolvedActor,
        };
        await run.save();

        return run.toObject();
    }
}

export const manufacturingService = new ManufacturingService();

