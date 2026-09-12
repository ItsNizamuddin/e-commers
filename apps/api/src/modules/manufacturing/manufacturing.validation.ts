import { z } from "zod";

const unitEnum = z.enum(["kg", "g", "l", "ml", "pcs", "pack"]);
const usageEnum = z.enum(["RAW_MATERIAL", "SELLABLE", "BOTH"]);
const categoryEnum = z.enum([
    "INGREDIENT",
    "DAIRY",
    "SWEETENER",
    "SPICE",
    "OIL",
    "GRAIN",
    "PACKAGING",
    "OTHER",
]);

export const createRawMaterialSchema = z.object({
    code: z.string().min(2).max(50).trim().toUpperCase(),
    name: z.string().min(2).max(150).trim(),
    category: categoryEnum,
    usage: usageEnum.optional().default("RAW_MATERIAL"),
    linkedProductId: z.string().optional(),
    linkedVariantId: z.string().optional(),
    unit: unitEnum,
    initialStock: z.number().min(0).optional(),
    initialCostPerUnit: z.number().min(0).optional(),
    reorderThreshold: z.number().min(0).optional(),
    warehouseId: z.string().optional(),
});

export const updateRawMaterialSchema = z.object({
    name: z.string().min(2).max(150).trim().optional(),
    category: categoryEnum.optional(),
    usage: usageEnum.optional(),
    linkedProductId: z.string().optional(),
    linkedVariantId: z.string().optional(),
    reorderThreshold: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
});

export const recordPurchaseIntakeSchema = z.object({
    rawMaterialId: z.string().min(1),
    sourceType: z.enum(["EXTERNAL_VENDOR", "OWN_FARM"]),
    supplier: z
        .object({
            name: z.string().min(1).trim(),
            contact: z.string().trim().optional(),
            invoiceNumber: z.string().trim().optional(),
        })
        .optional(),
    farmDetails: z
        .object({
            farmName: z.string().min(1).trim(),
            plotId: z.string().trim().optional(),
            harvestDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
            harvestLotNumber: z.string().trim().optional(),
            valuationMethod: z.enum(["OPERATIONAL_COST", "MARKET_RATE", "ZERO_COST"]),
        })
        .optional(),
    purchaseDate: z
        .string()
        .datetime()
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
        .optional(),
    quantity: z.number().positive("Quantity must be greater than 0"),
    unit: unitEnum,
    totalCost: z.number().min(0, "Total cost cannot be negative").optional(),
    costPerUnit: z.number().min(0, "Cost per unit cannot be negative").optional(),
    lotNumber: z.string().trim().optional(),
    expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    notes: z.string().trim().optional(),
});

const recipeIngredientSchema = z.object({
    rawMaterialId: z.string().min(1),
    quantity: z.number().positive(),
    unit: unitEnum,
    wastagePercent: z.number().min(0).max(100).optional(),
});

const recipePackagingSchema = z.object({
    rawMaterialId: z.string().min(1),
    quantity: z.number().positive(),
    unit: unitEnum,
});

export const createRecipeSchema = z.object({
    code: z.string().min(2).max(50).trim().toUpperCase(),
    name: z.string().min(2).max(150).trim(),
    productId: z.string().min(1),
    variantId: z.string().optional(),
    shelfLifeDays: z.number().int().min(1),
    batchYield: z.object({
        quantity: z.number().positive(),
        unit: z.string().min(1).trim(),
    }),
    ingredients: z.array(recipeIngredientSchema).min(1, "Recipe must have at least one ingredient"),
    packagingMaterials: z.array(recipePackagingSchema).optional().default([]),
    laborOverheadCost: z.number().min(0).optional(),
    instructions: z.string().trim().optional(),
    changeLog: z.string().trim().optional(),
});

export const updateRecipeSchema = z.object({
    name: z.string().min(2).max(150).trim().optional(),
    shelfLifeDays: z.number().int().min(1).optional(),
    batchYield: z
        .object({
            quantity: z.number().positive(),
            unit: z.string().min(1).trim(),
        })
        .optional(),
    ingredients: z.array(recipeIngredientSchema).min(1).optional(),
    packagingMaterials: z.array(recipePackagingSchema).optional(),
    laborOverheadCost: z.number().min(0).optional(),
    instructions: z.string().trim().optional(),
    changeLog: z.string().trim().optional(),
    bumpVersion: z.boolean().optional(),
});

export const wastageCategoryEnum = z.enum([
    "RECIPE_NORMAL_LOSS",
    "PRODUCTION_UNPLANNED_LOSS",
    "SPOILAGE_QC_FAILURE",
    "DAMAGE_HANDLING",
]);

export const executeProductionSchema = z.object({
    recipeId: z.string().min(1),
    warehouseId: z.string().min(1),
    plannedQuantity: z.number().positive(),
    actualQuantity: z.number().positive(),
    manufacturingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    manualLotAllocations: z
        .array(
            z.object({
                rawMaterialId: z.string().min(1),
                lotId: z.string().min(1),
                quantity: z.number().positive(),
            })
        )
        .optional(),
    actualLossQuantity: z.number().min(0).optional(),
    wastageCategory: wastageCategoryEnum.optional(),
    wastageNotes: z.string().trim().optional(),
    customExpiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    qaApprovalNotes: z.string().trim().optional(),
    notes: z.string().trim().optional(),
});

export const reverseProductionSchema = z.object({
    reason: z.string().min(3, "Please provide a reason for reversal").trim(),
    reverseQuantity: z.number().positive().optional(),
    allowPartial: z.boolean().optional(),
});

export const syncVariantCostSchema = z.object({
    productId: z.string().min(1),
    variantId: z.string().min(1),
    costAmount: z.number().min(0),
    currency: z.string().trim().optional(),
    locationCode: z.string().trim().optional(),
});

export const createRepackagingRunSchema = z.object({
    sourceRawMaterialId: z.string().min(1),
    sourceLotId: z.string().min(1),
    targetProductId: z.string().min(1),
    targetVariantId: z.string().min(1),
    packageUnitsProduced: z.number().int().positive("Package units produced must be at least 1"),
    unitSizeQuantity: z.number().positive("Unit size quantity must be greater than 0"),
    unitSizeUnit: unitEnum,
    warehouseId: z.string().min(1),
    packagingMaterialId: z.string().optional(),
    wastageQuantity: z.number().min(0).optional(),
    wastageCategory: wastageCategoryEnum.optional(),
    wastageNotes: z.string().trim().optional(),
    notes: z.string().trim().optional(),
});

export const reverseRepackagingRunSchema = z.object({
    reason: z.string().min(3, "Please provide a reason for reversal").trim(),
    reverseQuantity: z.number().int().positive().optional(),
    allowPartial: z.boolean().optional(),
});
