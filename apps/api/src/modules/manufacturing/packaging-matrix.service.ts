import mongoose from "mongoose";
import { ProductModel } from "../products/product.model.js";
import { RecipeModel } from "./recipe.model.js";
import { RawMaterialModel } from "./raw-material.model.js";
import { PackagingSpecificationModel } from "./packaging-specification.model.js";
import { convertUnits } from "./unit-conversion.js";
import { AppError } from "../../utils/app-error.js";
import type {
    PackUnit,
    TaxTreatment,
    PackagingMatrixItemInput,
    SyncPackagingMatrixInput,
    PackagingMatrixItemCalculated,
    PackagingMatrixResponse,
    PackagingSpecificationMaterial,
    RawMaterialUnit,
} from "@ecommers/types";

export class PackagingMatrixService {
    /**
     * Authoritative single-source calculation for pack-level COGS, margins, and prices in integer minor units.
     */
    calculateRowCOGS(params: {
        packQuantity: number;
        packUnit: PackUnit;
        masterFormulaYieldQty: number;
        masterFormulaYieldUnit: RawMaterialUnit;
        masterFormulaCostPerUnitMinor: number;
        packagingMaterials: Array<{
            rawMaterialId: string;
            quantity: number;
            unit: RawMaterialUnit;
            costPerUnitMinor: number;
        }>;
        laborOverheadCostMinor?: number | undefined;
        targetMarginPercent?: number | undefined;
        customerSellingPriceMinor?: number | undefined;
        taxTreatment?: TaxTreatment | undefined;
        taxRatePercent?: number | undefined;
    }) {
        const {
            packQuantity,
            packUnit,
            masterFormulaYieldQty,
            masterFormulaYieldUnit,
            masterFormulaCostPerUnitMinor,
            packagingMaterials,
            laborOverheadCostMinor = 0,
            targetMarginPercent = 65,
            customerSellingPriceMinor = 0,
            taxTreatment = "TAX_INCLUSIVE",
            taxRatePercent = 0,
        } = params;

        // 1. Food Cost: Pack quantity converted to master formula yield unit * unit cost
        let convertedPackQty = packQuantity;
        try {
            convertedPackQty = convertUnits(packQuantity, packUnit as any, masterFormulaYieldUnit);
        } catch {
            convertedPackQty = packQuantity;
        }

        const foodCostMinor = Math.max(0, Math.round(convertedPackQty * masterFormulaCostPerUnitMinor));

        // 2. Packaging Materials Cost
        const packagingCostMinor = packagingMaterials.reduce((acc, p) => {
            const itemCost = Math.round((p.quantity || 0) * (p.costPerUnitMinor || 0));
            return acc + Math.max(0, itemCost);
        }, 0);

        // 3. Total COGS
        const totalCogsMinor = foodCostMinor + packagingCostMinor + (laborOverheadCostMinor || 0);

        // 4. Suggested Net Price (Pre-tax)
        const marginFactor = Math.max(0.05, Math.min(0.99, 1 - (targetMarginPercent || 65) / 100));
        const suggestedNetPriceMinor = Math.round(totalCogsMinor / marginFactor);

        // 5. Tax & Customer Price
        const taxMultiplier = 1 + (taxRatePercent || 0) / 100;
        const suggestedCustomerPriceMinor =
            taxTreatment === "TAX_INCLUSIVE"
                ? Math.round(suggestedNetPriceMinor * taxMultiplier)
                : suggestedNetPriceMinor;

        const effectiveCustomerPriceMinor =
            customerSellingPriceMinor > 0 ? customerSellingPriceMinor : suggestedCustomerPriceMinor;

        const netSellingPriceMinor =
            taxTreatment === "TAX_INCLUSIVE" && taxMultiplier > 0
                ? Math.round(effectiveCustomerPriceMinor / taxMultiplier)
                : effectiveCustomerPriceMinor;

        const taxAmountMinor = Math.max(0, effectiveCustomerPriceMinor - netSellingPriceMinor);
        const grossProfitMinor = netSellingPriceMinor - totalCogsMinor;
        const grossMarginPercent =
            netSellingPriceMinor > 0
                ? Math.round(((grossProfitMinor / netSellingPriceMinor) * 100) * 10) / 10
                : 0;

        return {
            bulkConsumed: convertedPackQty,
            foodCostMinor,
            packagingCostMinor,
            laborOverheadCostMinor,
            totalCogsMinor,
            targetMarginPercent: targetMarginPercent || 65,
            suggestedNetPriceMinor,
            suggestedCustomerPriceMinor,
            netSellingPriceMinor,
            taxAmountMinor,
            customerSellingPriceMinor: effectiveCustomerPriceMinor,
            grossProfitMinor,
            grossMarginPercent,
        };
    }

    /**
     * Loads the live matrix for a product.
     */
    async getPackagingMatrix(productId: string): Promise<PackagingMatrixResponse> {
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new AppError(`Product '${productId}' not found.`, 404, "NOT_FOUND");
        }

        // Find existing Packaging Specifications for this product
        const specs = await PackagingSpecificationModel.find({
            productId: product._id,
            isActive: true,
        }).lean();

        // Identify default master formula
        let defaultRecipeId = specs[0]?.masterFormulaId?.toString();
        if (!defaultRecipeId) {
            const linkedRecipe = await RecipeModel.findOne({
                productId: product._id,
                status: "ACTIVE",
            }).sort({ version: -1 }).lean();
            if (linkedRecipe) {
                defaultRecipeId = linkedRecipe._id.toString();
            }
        }

        const defaultRecipe = defaultRecipeId ? await RecipeModel.findById(defaultRecipeId).lean() : null;

        // Calculate default recipe unit cost in minor units (paise)
        const defaultRecipeCostMinor = defaultRecipe
            ? Math.round((defaultRecipe.estimatedCostWac || 0) * 100)
            : 0;

        // Collect all packaging raw material IDs
        const allPkgRmIds = specs.flatMap((s) => s.packagingMaterials.map((p) => p.rawMaterialId.toString()));
        const rmDocs = await RawMaterialModel.find({ _id: { $in: allPkgRmIds } }).lean();
        const rmCostMap = new Map(rmDocs.map((r) => [r._id.toString(), Math.round((r.averageCost || 0) * 100)]));

        const currency = product.baseCurrency || "INR";
        const taxTreatment: TaxTreatment = "TAX_INCLUSIVE";
        const defaultTaxRatePercent = 0;

        const calculatedItems: PackagingMatrixItemCalculated[] = [];

        // Map existing variants
        for (const variant of product.variants || []) {
            const spec = specs.find((s) => s.variantId.toString() === variant.id);
            const recipeId = spec?.masterFormulaId?.toString() || defaultRecipeId || "";
            const recipe = recipeId === defaultRecipeId ? defaultRecipe : await RecipeModel.findById(recipeId).lean();

            const recipeCostMinor = recipe ? Math.round((recipe.estimatedCostWac || 0) * 100) : defaultRecipeCostMinor;
            const recipeYieldQty = recipe?.batchYield?.quantity || 1;
            const recipeYieldUnit = (recipe?.batchYield?.unit as RawMaterialUnit) || "kg";

            const rawUnit = (variant.weightUnit || "g").toLowerCase() as PackUnit;
            const validPackUnit: PackUnit = ["g", "kg", "ml", "l", "pcs", "pack"].includes(rawUnit) ? rawUnit : "g";

            const packagingBOM: PackagingSpecificationMaterial[] = (spec?.packagingMaterials || []).map((m) => ({
                rawMaterialId: m.rawMaterialId.toString(),
                quantity: m.quantity,
                unit: m.unit,
            }));

            const bomWithCosts = packagingBOM.map((b) => ({
                rawMaterialId: b.rawMaterialId,
                quantity: b.quantity,
                unit: b.unit,
                costPerUnitMinor: rmCostMap.get(b.rawMaterialId) || 0,
            }));

            const variantPrice = variant.prices?.[0];
            const sellingPriceMinor = variantPrice ? Math.round(variantPrice.amount * 100) : 0;
            const compareAtMinor = variantPrice?.compareAtAmount ? Math.round(variantPrice.compareAtAmount * 100) : undefined;

            const laborOverheadMinor = spec?.laborOverheadCost ? Math.round(spec.laborOverheadCost * 100) : 0;

            const calc = this.calculateRowCOGS({
                packQuantity: variant.weight || 500,
                packUnit: validPackUnit,
                masterFormulaYieldQty: recipeYieldQty,
                masterFormulaYieldUnit: recipeYieldUnit,
                masterFormulaCostPerUnitMinor: recipeCostMinor,
                packagingMaterials: bomWithCosts,
                laborOverheadCostMinor: laborOverheadMinor,
                targetMarginPercent: 65,
                customerSellingPriceMinor: sellingPriceMinor,
                taxTreatment,
                taxRatePercent: defaultTaxRatePercent,
            });

            calculatedItems.push({
                variantId: variant.id,
                title: variant.title,
                sku: variant.sku,
                barcode: variant.barcode,
                packQuantity: variant.weight || 500,
                packUnit: validPackUnit,
                masterFormulaId: recipeId,
                masterFormulaCode: recipe?.code || defaultRecipe?.code || "FORMULA",
                packagingSpecificationId: spec?._id?.toString(),
                packagingMaterials: packagingBOM,
                foodCostMinor: calc.foodCostMinor,
                packagingCostMinor: calc.packagingCostMinor,
                laborOverheadCostMinor: calc.laborOverheadCostMinor,
                totalCogsMinor: calc.totalCogsMinor,
                targetMarginPercent: calc.targetMarginPercent,
                suggestedNetPriceMinor: calc.suggestedNetPriceMinor,
                suggestedCustomerPriceMinor: calc.suggestedCustomerPriceMinor,
                netSellingPriceMinor: calc.netSellingPriceMinor,
                taxAmountMinor: calc.taxAmountMinor,
                customerSellingPriceMinor: calc.customerSellingPriceMinor,
                compareAtPriceMinor: compareAtMinor,
                grossProfitMinor: calc.grossProfitMinor,
                grossMarginPercent: calc.grossMarginPercent,
            });
        }

        return {
            productId: product._id.toString(),
            productTitle: product.title,
            defaultMasterFormulaId: defaultRecipeId,
            defaultMasterFormulaCode: defaultRecipe?.code,
            defaultMasterFormulaUnitCostMinor: defaultRecipeCostMinor,
            defaultMasterFormulaYieldUnit: (defaultRecipe?.batchYield?.unit as RawMaterialUnit) || "kg",
            currency,
            taxTreatment,
            defaultTaxRatePercent,
            items: calculatedItems,
        };
    }

    /**
     * Atomically syncs the packaging matrix down to commercial product variants and operational packaging specifications.
     * INVARIANT: Does NOT modify store inventory balances!
     */
    async syncPackagingMatrix(input: SyncPackagingMatrixInput, actor?: any): Promise<PackagingMatrixResponse> {
        const {
            productId,
            defaultMasterFormulaId,
            items,
            taxTreatment = "TAX_INCLUSIVE",
            defaultTaxRatePercent = 0,
        } = input;

        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new AppError(`Product '${productId}' not found.`, 404, "NOT_FOUND");
        }

        const targetCurrency = (input.currency || product.baseCurrency || "INR").toUpperCase();

        // Validate recipes
        const recipeIds: string[] = Array.from(
            new Set([defaultMasterFormulaId, ...items.map((i) => i.masterFormulaId).filter((id): id is string => Boolean(id))])
        );
        const recipes = await RecipeModel.find({ _id: { $in: recipeIds } }).lean();
        const recipeMap = new Map(recipes.map((r) => [r._id.toString(), r]));

        const defaultRecipe = recipeMap.get(defaultMasterFormulaId);
        if (!defaultRecipe) {
            throw new AppError(`Master Bulk Formula '${defaultMasterFormulaId}' not found.`, 404, "NOT_FOUND");
        }

        // Fetch packaging materials
        const allPkgRmIds = Array.from(
            new Set(items.flatMap((i) => i.packagingMaterials.map((p) => p.rawMaterialId)))
        );
        const rmDocs = await RawMaterialModel.find({ _id: { $in: allPkgRmIds } }).lean();
        const rmCostMap = new Map(rmDocs.map((r) => [r._id.toString(), Math.round((r.averageCost || 0) * 100)]));

        const updatedVariants: any[] = [];
        const syncedItems: PackagingMatrixItemCalculated[] = [];

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                for (const item of items) {
                    const rowFormulaId = item.masterFormulaId || defaultMasterFormulaId;
                    const rowRecipe = recipeMap.get(rowFormulaId) || defaultRecipe;
                    const recipeCostMinor = Math.round((rowRecipe.estimatedCostWac || 0) * 100);
                    const recipeYieldQty = rowRecipe.batchYield.quantity || 1;
                    const recipeYieldUnit = (rowRecipe.batchYield.unit as RawMaterialUnit) || "kg";

                    const bomWithCosts = item.packagingMaterials.map((p) => ({
                        rawMaterialId: p.rawMaterialId,
                        quantity: p.quantity,
                        unit: p.unit,
                        costPerUnitMinor: rmCostMap.get(p.rawMaterialId) || 0,
                    }));

                    const calc = this.calculateRowCOGS({
                        packQuantity: item.packQuantity,
                        packUnit: item.packUnit,
                        masterFormulaYieldQty: recipeYieldQty,
                        masterFormulaYieldUnit: recipeYieldUnit,
                        masterFormulaCostPerUnitMinor: recipeCostMinor,
                        packagingMaterials: bomWithCosts,
                        laborOverheadCostMinor: item.laborOverheadCostMinor || 0,
                        targetMarginPercent: item.targetMarginPercent || 65,
                        customerSellingPriceMinor: item.customerSellingPriceMinor,
                        taxTreatment: item.taxTreatment || taxTreatment,
                        taxRatePercent: item.taxRatePercent !== undefined ? item.taxRatePercent : defaultTaxRatePercent,
                    });

                    // 1. Prepare Product Variant (Commercial)
                    const variantId = item.variantId || new mongoose.Types.ObjectId().toString();
                    const customerPriceMajor = Math.round(calc.customerSellingPriceMinor) / 100;
                    const costAmountMajor = Math.round(calc.totalCogsMinor) / 100;
                    const compareAtMajor = item.compareAtPriceMinor ? Math.round(item.compareAtPriceMinor) / 100 : undefined;

                    const variantDoc = {
                        id: variantId,
                        sku: item.sku.trim().toUpperCase(),
                        title: item.title.trim(),
                        barcode: item.barcode?.trim() || undefined,
                        weight: item.packQuantity,
                        weightUnit: item.packUnit,
                        prices: [
                            {
                                currency: targetCurrency,
                                amount: customerPriceMajor,
                                costAmount: costAmountMajor,
                                compareAtAmount: compareAtMajor,
                            },
                        ],
                        isActive: true,
                    };

                    updatedVariants.push(variantDoc);

                    // 2. Prepare & Upsert Packaging Specification (Operational Manufacturing)
                    const specCode = `SPEC-${variantDoc.sku}`;
                    const specDoc = await PackagingSpecificationModel.findOneAndUpdate(
                        { productId: product._id, variantId: new mongoose.Types.ObjectId(variantId) },
                        {
                            $set: {
                                name: `${product.title} - ${item.title}`,
                                code: specCode,
                                masterFormulaId: new mongoose.Types.ObjectId(rowFormulaId),
                                productId: product._id,
                                variantId: new mongoose.Types.ObjectId(variantId),
                                bulkConsumedPerUnit: calc.bulkConsumed,
                                bulkUnit: recipeYieldUnit,
                                packagingMaterials: item.packagingMaterials.map((p) => ({
                                    rawMaterialId: new mongoose.Types.ObjectId(p.rawMaterialId),
                                    quantity: p.quantity,
                                    unit: p.unit,
                                })),
                                laborOverheadCost: (item.laborOverheadCostMinor || 0) / 100,
                                isActive: true,
                            },
                        },
                        { upsert: true, returnDocument: "after", session }
                    );

                    syncedItems.push({
                        variantId,
                        title: variantDoc.title,
                        sku: variantDoc.sku,
                        barcode: variantDoc.barcode,
                        packQuantity: item.packQuantity,
                        packUnit: item.packUnit,
                        masterFormulaId: rowFormulaId,
                        masterFormulaCode: rowRecipe.code,
                        packagingSpecificationId: specDoc._id.toString(),
                        packagingMaterials: item.packagingMaterials,
                        foodCostMinor: calc.foodCostMinor,
                        packagingCostMinor: calc.packagingCostMinor,
                        laborOverheadCostMinor: calc.laborOverheadCostMinor,
                        totalCogsMinor: calc.totalCogsMinor,
                        targetMarginPercent: calc.targetMarginPercent,
                        suggestedNetPriceMinor: calc.suggestedNetPriceMinor,
                        suggestedCustomerPriceMinor: calc.suggestedCustomerPriceMinor,
                        netSellingPriceMinor: calc.netSellingPriceMinor,
                        taxAmountMinor: calc.taxAmountMinor,
                        customerSellingPriceMinor: calc.customerSellingPriceMinor,
                        compareAtPriceMinor: item.compareAtPriceMinor,
                        grossProfitMinor: calc.grossProfitMinor,
                        grossMarginPercent: calc.grossMarginPercent,
                    });
                }

                // 3. Save variants onto Product (Strictly Commercial, NO inventory mutation!)
                product.variants = updatedVariants as any;
                await product.save({ session });
            });
        } finally {
            await session.endSession();
        }

        return {
            productId: product._id.toString(),
            productTitle: product.title,
            defaultMasterFormulaId,
            defaultMasterFormulaCode: defaultRecipe.code,
            defaultMasterFormulaUnitCostMinor: Math.round((defaultRecipe.estimatedCostWac || 0) * 100),
            defaultMasterFormulaYieldUnit: (defaultRecipe.batchYield.unit as RawMaterialUnit) || "kg",
            currency: targetCurrency,
            taxTreatment,
            defaultTaxRatePercent,
            items: syncedItems,
        };
    }
}

export const packagingMatrixService = new PackagingMatrixService();
