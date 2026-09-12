import { AuditActor } from "./audit.js";

export type RawMaterialUnit = "kg" | "g" | "l" | "ml" | "pcs" | "pack";

export type RawMaterialCategory =
    | "INGREDIENT"
    | "DAIRY"
    | "SWEETENER"
    | "SPICE"
    | "OIL"
    | "GRAIN"
    | "PACKAGING"
    | "OTHER";

export type RawMaterialSourceType = "EXTERNAL_VENDOR" | "OWN_FARM";

export interface FarmHarvestDetails {
    farmName: string;
    plotId?: string | undefined;
    harvestDate: string; // ISO date string
    harvestLotNumber?: string | undefined;
    valuationMethod: "OPERATIONAL_COST" | "MARKET_RATE" | "ZERO_COST";
}

export interface SupplierDetails {
    name: string;
    contact?: string | undefined;
    invoiceNumber?: string | undefined;
}

export type RawMaterialUsage = "RAW_MATERIAL" | "SELLABLE" | "BOTH";

export interface RawMaterial {
    id: string;
    code: string;
    name: string;
    category: RawMaterialCategory;
    usage: RawMaterialUsage;
    linkedProductId?: string | undefined;
    linkedVariantId?: string | undefined;
    unit: RawMaterialUnit;
    currentStock: number; // Cached fast-read balance verified by ledger
    reorderThreshold: number;
    averageCost: number; // Weighted Average Cost (WAC) per base unit
    lastPurchasePrice: number; // Latest / Replacement price per base unit
    warehouseId?: string | undefined;
    isActive: boolean;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}

export interface CreateRawMaterialInput {
    code: string;
    name: string;
    category: RawMaterialCategory;
    usage?: RawMaterialUsage | undefined;
    linkedProductId?: string | undefined;
    linkedVariantId?: string | undefined;
    unit: RawMaterialUnit;
    initialStock?: number | undefined;
    initialCostPerUnit?: number | undefined;
    reorderThreshold?: number | undefined;
    warehouseId?: string | undefined;
}

export interface UpdateRawMaterialInput {
    name?: string | undefined;
    category?: RawMaterialCategory | undefined;
    usage?: RawMaterialUsage | undefined;
    linkedProductId?: string | undefined;
    linkedVariantId?: string | undefined;
    reorderThreshold?: number | undefined;
    isActive?: boolean | undefined;
}

export interface RawMaterialLot {
    id: string;
    rawMaterialId: string;
    rawMaterialName?: string | undefined;
    lotNumber: string;
    expiryDate: string; // ISO date string
    receivedDate: string; // ISO date string
    initialQuantity: number;
    availableQuantity: number;
    unit: RawMaterialUnit;
    costPerUnit: number; // Cost per base unit
    sourceType: RawMaterialSourceType;
    supplier?: SupplierDetails | undefined;
    farmDetails?: FarmHarvestDetails | undefined;
    isDepleted: boolean;
    notes?: string | undefined;
    createdAt?: string | undefined;
}

export type RawMaterialStockMovementType =
    | "PURCHASE_INTAKE"
    | "MANUFACTURING_CONSUMPTION"
    | "MANUFACTURING_REVERSAL"
    | "REPACKAGING_CONSUMPTION"
    | "REPACKAGING_REVERSAL"
    | "WASTAGE_SCRAP"
    | "MANUAL_ADJUSTMENT"
    | "RETURN_TO_SUPPLIER";

export interface RawMaterialStockMovement {
    id: string;
    rawMaterialId: string;
    rawMaterialName?: string | undefined;
    lotId?: string | undefined;
    lotNumber?: string | undefined;
    type: RawMaterialStockMovementType;
    quantityDelta: number; // positive for intake/reversal, negative for consumption/scrap
    unit: RawMaterialUnit;
    previousStock: number;
    newStock: number;
    referenceType: "PURCHASE" | "PRODUCTION_RUN" | "REPACKAGING_RUN" | "MANUAL_AUDIT" | "SCRAP_DISPOSAL";
    referenceId: string;
    reason?: string | undefined;
    actor?: AuditActor | undefined;
    createdAt: string;
}

export interface RecordPurchaseIntakeInput {
    rawMaterialId: string;
    sourceType: RawMaterialSourceType;
    supplier?: SupplierDetails | undefined;
    farmDetails?: FarmHarvestDetails | undefined;
    purchaseDate?: string | undefined;
    quantity: number;
    unit: RawMaterialUnit;
    totalCost?: number | undefined; // Total amount paid or valued (can be 0 for zero-cost farm intake)
    costPerUnit?: number | undefined; // Cost per unit rate
    lotNumber?: string | undefined;
    expiryDate: string; // ISO date string
    notes?: string | undefined;
}

export interface RecipeIngredient {
    rawMaterialId: string;
    rawMaterialName?: string | undefined;
    quantity: number;
    unit: RawMaterialUnit;
    wastagePercent?: number | undefined; // e.g. 5 for 5% cooking loss
}

export interface RecipePackaging {
    rawMaterialId: string;
    rawMaterialName?: string | undefined;
    quantity: number;
    unit: RawMaterialUnit;
}

export interface Recipe {
    id: string;
    code: string;
    name: string;
    version: number;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    productId: string;
    productTitle?: string | undefined;
    variantId?: string | undefined;
    variantTitle?: string | undefined;
    shelfLifeDays: number;
    batchYield: {
        quantity: number;
        unit: string; // e.g. "boxes", "packs", "kg", "pcs"
    };
    ingredients: RecipeIngredient[];
    packagingMaterials: RecipePackaging[];
    laborOverheadCost?: number | undefined;
    instructions?: string | undefined;
    estimatedCostWac?: number | undefined;
    estimatedCostHighest?: number | undefined;
    changeLog?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}

export interface CreateRecipeInput {
    code: string;
    name: string;
    productId: string;
    variantId?: string | undefined;
    shelfLifeDays: number;
    batchYield: {
        quantity: number;
        unit: string;
    };
    ingredients: RecipeIngredient[];
    packagingMaterials: RecipePackaging[];
    laborOverheadCost?: number | undefined;
    instructions?: string | undefined;
    changeLog?: string | undefined;
}

export interface UpdateRecipeInput {
    name?: string | undefined;
    shelfLifeDays?: number | undefined;
    batchYield?: {
        quantity: number;
        unit: string;
    } | undefined;
    ingredients?: RecipeIngredient[] | undefined;
    packagingMaterials?: RecipePackaging[] | undefined;
    laborOverheadCost?: number | undefined;
    instructions?: string | undefined;
    changeLog?: string | undefined;
    bumpVersion?: boolean | undefined; // If true, increments version number e.g. v1 -> v2
}

export type WastageReasonCategory =
    | "RECIPE_NORMAL_LOSS"         // Evaporation, boiling shrinkage, standard peeling loss
    | "PRODUCTION_UNPLANNED_LOSS"  // Machine spillage, operator overrun
    | "SPOILAGE_QC_FAILURE"        // Batch failed hygiene/consistency test
    | "DAMAGE_HANDLING";           // Dropped container, packaging tear

export interface ProductionWastageReport {
    expectedLossQuantity: number;
    actualLossQuantity: number;
    varianceQuantity: number; // actual - expected (+ is unfavorable loss, - is efficient yield)
    unit: RawMaterialUnit;
    wastageCategory: WastageReasonCategory;
    wastageNotes?: string | undefined;
}

export interface BatchExpiryDetermination {
    recipeShelfLifeDays?: number | undefined;
    recipeTheoreticalExpiryDate?: string | undefined;
    shortestIngredientExpiryDate?: string | undefined;
    shortestIngredientName?: string | undefined;
    systemRecommendedExpiryDate: string;
    finalExpiryDate: string;
    decisionType: "ACCEPTED_SYSTEM_RECOMMENDATION" | "QA_OVERRIDE" | "MANUAL_SPECIFICATION";
    qaApprovalNotes?: string | undefined;
}

export type ProductionRunStatus =
    | "PLANNED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "PARTIALLY_REVERSED"
    | "REVERSED";

export type RepackagingRunStatus =
    | "COMPLETED"
    | "PARTIALLY_REVERSED"
    | "REVERSED";

export interface ReversalDetails {
    reversedAt: string;
    reversalReference: string;
    reason: string;
    reversedBy?: AuditActor | undefined;
    reversedQuantity: number;
    originalQuantity: number;
    soldOrReservedAtReversal: number;
    isPartial: boolean;
}

export interface LotConsumptionItem {
    rawMaterialId: string;
    rawMaterialName?: string | undefined;
    lotId: string;
    lotNumber: string;
    quantity: number;
    unit: RawMaterialUnit;
    costPerUnit: number;
    expiryDate: string;
}

export interface ProductionRun {
    id: string;
    batchNumber: string;
    recipeId: string;
    recipeCode?: string | undefined;
    recipeName?: string | undefined;
    recipeVersion: number;
    productId: string;
    productTitle?: string | undefined;
    variantId?: string | undefined;
    variantTitle?: string | undefined;
    warehouseId: string;
    warehouseName?: string | undefined;
    plannedQuantity: number;
    actualQuantity: number;
    yieldUnit: string;
    status: ProductionRunStatus;
    manufacturingDate: string;
    expiryDate: string; // Final legal/QA best before date
    expiryDetermination?: BatchExpiryDetermination | undefined;
    lotsConsumed: LotConsumptionItem[];
    actualTotalCost: number;
    actualUnitCost: number;
    estimatedUnitCost: number;
    costVariance: number;
    wastageReport?: ProductionWastageReport | undefined;
    reversedQuantity?: number | undefined;
    reversalDetails?: ReversalDetails | undefined;
    notes?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}

export interface ExecuteProductionInput {
    recipeId: string;
    warehouseId: string;
    plannedQuantity: number;
    actualQuantity: number;
    manufacturingDate?: string | undefined;
    manualLotAllocations?: Array<{
        rawMaterialId: string;
        lotId: string;
        quantity: number;
    }> | undefined;
    actualLossQuantity?: number | undefined;
    wastageCategory?: WastageReasonCategory | undefined;
    wastageNotes?: string | undefined;
    customExpiryDate?: string | undefined;
    qaApprovalNotes?: string | undefined;
    notes?: string | undefined;
}

export interface ReverseProductionInput {
    reason: string;
    reverseQuantity?: number | undefined;
    allowPartial?: boolean | undefined;
}

export interface ProductionFeasibilityCheck {
    canProduce: boolean;
    shortages: Array<{
        rawMaterialId: string;
        rawMaterialName: string;
        required: number;
        available: number;
        unit: RawMaterialUnit;
        deficit: number;
    }>;
    fefoAllocations: Array<{
        rawMaterialId: string;
        rawMaterialName: string;
        lotId: string;
        lotNumber: string;
        expiryDate: string;
        allocatedQuantity: number;
        unit: RawMaterialUnit;
        costPerUnit: number;
        isExpired: boolean;
    }>;
    estimatedCostWac: number;
    estimatedCostHighest: number;
    recommendedBestBeforeDate: string;
    hasPerishableWarning: boolean;
    perishableWarningMessage?: string | undefined;
}

export interface SyncVariantCostInput {
    productId: string;
    variantId: string;
    costAmount: number;
    currency?: string | undefined;
    locationCode?: string | undefined;
}

export interface RepackagingRun {
    id: string;
    runNumber: string;
    sourceRawMaterialId: string;
    sourceRawMaterialName: string;
    sourceLotId: string;
    sourceLotNumber: string;
    sourceQuantity: number;
    sourceUnit: RawMaterialUnit;
    targetProductId: string;
    targetProductTitle: string;
    targetVariantId: string;
    targetVariantTitle: string;
    targetVariantSku: string;
    packageUnitsProduced: number;
    unitSizeQuantity: number;
    unitSizeUnit: RawMaterialUnit;
    packagingMaterialId?: string | undefined;
    packagingMaterialName?: string | undefined;
    packagingMaterialQuantity?: number | undefined;
    wastageQuantity?: number | undefined;
    wastageReport?: ProductionWastageReport | undefined;
    warehouseId: string;
    warehouseName?: string | undefined;
    totalCost: number;
    unitCost: number;
    status: RepackagingRunStatus;
    expiryDate: string;
    reversedUnits?: number | undefined;
    reversalDetails?: ReversalDetails | undefined;
    notes?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}

export interface CreateRepackagingRunInput {
    sourceRawMaterialId: string;
    sourceLotId: string;
    targetProductId: string;
    targetVariantId: string;
    packageUnitsProduced: number;
    unitSizeQuantity: number;
    unitSizeUnit: RawMaterialUnit;
    warehouseId: string;
    packagingMaterialId?: string | undefined;
    wastageQuantity?: number | undefined;
    expectedLossQuantity?: number | undefined;
    wastageCategory?: WastageReasonCategory | undefined;
    wastageNotes?: string | undefined;
    notes?: string | undefined;
}

export interface ReverseRepackagingRunInput {
    reason: string;
    reverseQuantity?: number | undefined;
    allowPartial?: boolean | undefined;
}
