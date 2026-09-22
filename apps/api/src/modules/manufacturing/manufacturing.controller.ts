import { Request, Response } from "express";
import { manufacturingService } from "./manufacturing.service.js";
import { packagingMatrixService } from "./packaging-matrix.service.js";
import { resolveActor } from "../../utils/audit.js";

export class ManufacturingController {
    // Raw Materials
    async listRawMaterials(req: Request, res: Response) {
        const { search, category, usage, isActive } = req.query as {
            search?: string;
            category?: string;
            usage?: string;
            isActive?: string;
        };

        const materials = await manufacturingService.listRawMaterials({
            search,
            category,
            usage,
            isActive: isActive !== undefined ? isActive === "true" : undefined,
        });

        res.json({ success: true, data: materials });
    }

    async checkCodeAvailability(req: Request, res: Response) {
        const { code } = req.query as { code?: string };
        const result = await manufacturingService.checkCodeAvailability(code || "");
        res.json({ success: true, data: result });
    }

    async suggestCode(req: Request, res: Response) {
        const { name, preferredCode } = req.query as { name?: string; preferredCode?: string };
        const suggestedCode = await manufacturingService.generateUniqueRawMaterialCode(name || "", preferredCode);
        res.json({ success: true, data: { suggestedCode } });
    }

    async getRawMaterialById(req: Request, res: Response) {
        const { id } = req.params;
        const material = await manufacturingService.getRawMaterialById(id as string);
        res.json({ success: true, data: material });
    }

    async createRawMaterial(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const material = await manufacturingService.createRawMaterial(req.body, actor);
        res.status(201).json({ success: true, data: material });
    }

    async updateRawMaterial(req: Request, res: Response) {
        const { id } = req.params;
        const material = await manufacturingService.updateRawMaterial(id as string, req.body);
        res.json({ success: true, data: material });
    }

    // Purchases & Intakes
    async recordPurchaseIntake(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const result = await manufacturingService.recordPurchaseIntake(req.body, actor);
        res.status(201).json({ success: true, data: result });
    }

    async listLots(req: Request, res: Response) {
        const { rawMaterialId, isDepleted } = req.query as {
            rawMaterialId?: string;
            isDepleted?: string;
        };

        const lots = await manufacturingService.listLots({
            rawMaterialId,
            isDepleted: isDepleted !== undefined ? isDepleted === "true" : undefined,
        });

        res.json({ success: true, data: lots });
    }

    async listLedger(req: Request, res: Response) {
        const { rawMaterialId, limit } = req.query as {
            rawMaterialId?: string;
            limit?: string;
        };

        const movements = await manufacturingService.listLedger({
            rawMaterialId,
            limit: limit ? parseInt(limit, 10) : 100,
        });

        res.json({ success: true, data: movements });
    }

    // Recipes
    async listRecipes(req: Request, res: Response) {
        const { productId, status } = req.query as {
            productId?: string;
            status?: string;
        };

        const recipes = await manufacturingService.listRecipes({ productId, status });
        res.json({ success: true, data: recipes });
    }

    async getRecipeById(req: Request, res: Response) {
        const { id } = req.params;
        const recipe = await manufacturingService.getRecipeById(id as string);
        res.json({ success: true, data: recipe });
    }

    async createRecipe(req: Request, res: Response) {
        const recipe = await manufacturingService.createRecipe(req.body);
        res.status(201).json({ success: true, data: recipe });
    }

    async updateRecipe(req: Request, res: Response) {
        const { id } = req.params;
        const recipe = await manufacturingService.updateRecipe(id as string, req.body);
        res.json({ success: true, data: recipe });
    }

    // Production Runs & Feasibility
    async checkFeasibility(req: Request, res: Response) {
        const { recipeId, quantity, manufacturingDate } = req.query as {
            recipeId?: string;
            quantity?: string;
            manufacturingDate?: string;
        };

        if (!recipeId) {
            return res.status(400).json({ success: false, message: "recipeId query parameter is required" });
        }

        const qty = quantity ? parseFloat(quantity) : 1;
        const result = await manufacturingService.checkProductionFeasibility(
            recipeId,
            qty,
            manufacturingDate
        );

        res.json({ success: true, data: result });
    }

    async executeProductionRun(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.executeProductionRun(req.body, actor);
        res.status(201).json({ success: true, data: run });
    }

    async reverseProductionRun(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.reverseProductionRun(id as string, req.body, actor);
        res.json({ success: true, data: run });
    }

    async listProductionRuns(req: Request, res: Response) {
        const { productId, recipeId, status, limit } = req.query as {
            productId?: string;
            recipeId?: string;
            status?: string;
            limit?: string;
        };

        const runs = await manufacturingService.listProductionRuns({
            productId,
            recipeId,
            status,
            limit: limit ? parseInt(limit, 10) : 50,
        });

        res.json({ success: true, data: runs });
    }

    async getProductionRunById(req: Request, res: Response) {
        const { id } = req.params;
        const run = await manufacturingService.getProductionRunById(id as string);
        res.json({ success: true, data: run });
    }

    async completeProductionRun(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.completeProductionRun(id as string, req.body, actor);
        res.json({ success: true, data: run });
    }

    async syncVariantCost(req: Request, res: Response) {
        const result = await manufacturingService.syncVariantCost(req.body);
        res.json({ success: true, data: result });
    }

    async batchSyncVariantPricing(req: Request, res: Response) {
        const result = await manufacturingService.batchSyncVariantPricing(req.body);
        res.json({ success: true, data: result });
    }

    async autoGenerateVariantRecipes(req: Request, res: Response) {
        const { id } = req.params;
        const recipes = await manufacturingService.autoGenerateVariantRecipes({
            baseRecipeId: id as string,
            targetVariantIds: req.body?.targetVariantIds,
            prefixCode: req.body?.prefixCode,
            customRatios: req.body?.customRatios,
        });
        res.status(201).json({ success: true, data: recipes });
    }

    // Repackaging / Packaging Runs (Bulk to Retail)
    async listRepackagingRuns(req: Request, res: Response) {
        const { sourceRawMaterialId, targetProductId, status } = req.query as {
            sourceRawMaterialId?: string;
            targetProductId?: string;
            status?: string;
        };

        const runs = await manufacturingService.listRepackagingRuns({
            sourceRawMaterialId,
            targetProductId,
            status,
        });

        res.json({ success: true, data: runs });
    }

    async getRepackagingRunById(req: Request, res: Response) {
        const { id } = req.params;
        const run = await manufacturingService.getRepackagingRunById(id as string);
        res.json({ success: true, data: run });
    }

    async createRepackagingRun(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.createRepackagingRun(req.body, actor);
        res.status(201).json({ success: true, data: run });
    }

    async completePackagingRun(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.completePackagingRun(id as string, req.body, actor);
        res.json({ success: true, data: run });
    }

    async reverseRepackagingRun(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.reverseRepackagingRun(id as string, req.body, actor);
        res.json({ success: true, data: run });
    }

    // Packaging Run Domain Aliases
    async listPackagingRuns(req: Request, res: Response) {
        return this.listRepackagingRuns(req, res);
    }

    async getPackagingRunById(req: Request, res: Response) {
        return this.getRepackagingRunById(req, res);
    }

    async createPackagingRun(req: Request, res: Response) {
        return this.createRepackagingRun(req, res);
    }

    async reversePackagingRun(req: Request, res: Response) {
        return this.reverseRepackagingRun(req, res);
    }

    // Vendors & Suppliers
    async listVendors(req: Request, res: Response) {
        const { search, status } = req.query as { search?: string; status?: string };
        const vendors = await manufacturingService.listVendors({ search, status });
        res.json({ success: true, data: vendors });
    }

    async getVendorById(req: Request, res: Response) {
        const { id } = req.params;
        const vendor = await manufacturingService.getVendorById(id as string);
        res.json({ success: true, data: vendor });
    }

    async createVendor(req: Request, res: Response) {
        const vendor = await manufacturingService.createVendor(req.body);
        res.status(201).json({ success: true, data: vendor });
    }

    async updateVendor(req: Request, res: Response) {
        const { id } = req.params;
        const vendor = await manufacturingService.updateVendor(id as string, req.body);
        res.json({ success: true, data: vendor });
    }

    async getVendorPurchases(req: Request, res: Response) {
        const { id } = req.params;
        const purchases = await manufacturingService.getVendorPurchases(id as string);
        res.json({ success: true, data: purchases });
    }

    // Packaging Specifications
    async listPackagingSpecifications(req: Request, res: Response) {
        const { productId, variantId, masterFormulaId, isActive } = req.query as {
            productId?: string;
            variantId?: string;
            masterFormulaId?: string;
            isActive?: string;
        };

        const specs = await manufacturingService.listPackagingSpecifications({
            productId,
            variantId,
            masterFormulaId,
            isActive: isActive !== undefined ? isActive === "true" : undefined,
        });

        res.json({ success: true, data: specs });
    }

    async getPackagingSpecificationById(req: Request, res: Response) {
        const { id } = req.params;
        const spec = await manufacturingService.getPackagingSpecification(id as string);
        res.json({ success: true, data: spec });
    }

    async createPackagingSpecification(req: Request, res: Response) {
        const spec = await manufacturingService.createPackagingSpecification(req.body);
        res.status(201).json({ success: true, data: spec });
    }

    async updatePackagingSpecification(req: Request, res: Response) {
        const { id } = req.params;
        const spec = await manufacturingService.updatePackagingSpecification(id as string, req.body);
        res.json({ success: true, data: spec });
    }

    async deletePackagingSpecification(req: Request, res: Response) {
        const { id } = req.params;
        const result = await manufacturingService.deletePackagingSpecification(id as string);
        res.json({ success: true, data: result });
    }

    // Packaging & Pricing Matrix
    async getPackagingMatrix(req: Request, res: Response) {
        const { id } = req.params;
        const matrix = await packagingMatrixService.getPackagingMatrix(id as string);
        res.json({ success: true, data: matrix });
    }

    async syncPackagingMatrix(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const matrix = await packagingMatrixService.syncPackagingMatrix(
            { ...req.body, productId: id as string },
            actor
        );
        res.json({ success: true, data: matrix });
    }

    // Bidirectional Lot Traceability & Rapid Recall
    async getLotTraceability(req: Request, res: Response) {
        const { identifier } = req.params;
        const report = await manufacturingService.getLotTraceability(identifier as string);
        res.json({ success: true, data: report });
    }
}

export const manufacturingController = new ManufacturingController();

