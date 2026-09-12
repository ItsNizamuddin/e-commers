import type { ApiClient } from "../client";
import type {
    RawMaterial,
    CreateRawMaterialInput,
    UpdateRawMaterialInput,
    RawMaterialLot,
    RawMaterialStockMovement,
    RecordPurchaseIntakeInput,
    Recipe,
    CreateRecipeInput,
    UpdateRecipeInput,
    ProductionRun,
    ExecuteProductionInput,
    ReverseProductionInput,
    RepackagingRun,
    CreateRepackagingRunInput,
    ReverseRepackagingRunInput,
    ProductionFeasibilityCheck,
    SyncVariantCostInput,
} from "@ecommers/types";

export class ManufacturingClient {
    constructor(private readonly client: ApiClient) {}

    // Raw Materials
    async listRawMaterials(params?: {
        search?: string;
        category?: string;
        usage?: string;
        isActive?: boolean;
    }): Promise<RawMaterial[]> {
        const res = await this.client.get<{ success: boolean; data: RawMaterial[] }>(
            "/admin/manufacturing/raw-materials",
            { params }
        );
        return res.data;
    }

    async getRawMaterialById(id: string): Promise<RawMaterial> {
        const res = await this.client.get<{ success: boolean; data: RawMaterial }>(
            `/admin/manufacturing/raw-materials/${id}`
        );
        return res.data;
    }

    async createRawMaterial(body: CreateRawMaterialInput): Promise<RawMaterial> {
        const res = await this.client.post<{ success: boolean; data: RawMaterial }>(
            "/admin/manufacturing/raw-materials",
            body
        );
        return res.data;
    }

    async updateRawMaterial(id: string, body: UpdateRawMaterialInput): Promise<RawMaterial> {
        const res = await this.client.patch<{ success: boolean; data: RawMaterial }>(
            `/admin/manufacturing/raw-materials/${id}`,
            body
        );
        return res.data;
    }

    // Purchases & Intakes
    async recordPurchase(body: RecordPurchaseIntakeInput): Promise<{
        rawMaterial: RawMaterial;
        lot: RawMaterialLot;
        movement: RawMaterialStockMovement;
    }> {
        const res = await this.client.post<{
            success: boolean;
            data: {
                rawMaterial: RawMaterial;
                lot: RawMaterialLot;
                movement: RawMaterialStockMovement;
            };
        }>("/admin/manufacturing/purchases", body);
        return res.data;
    }

    async listLots(params?: {
        rawMaterialId?: string;
        isDepleted?: boolean;
    }): Promise<RawMaterialLot[]> {
        const res = await this.client.get<{ success: boolean; data: RawMaterialLot[] }>(
            "/admin/manufacturing/lots",
            { params }
        );
        return res.data;
    }

    async listLedger(params?: {
        rawMaterialId?: string;
        limit?: number;
    }): Promise<RawMaterialStockMovement[]> {
        const res = await this.client.get<{ success: boolean; data: RawMaterialStockMovement[] }>(
            "/admin/manufacturing/ledger",
            { params }
        );
        return res.data;
    }

    // Recipes
    async listRecipes(params?: {
        productId?: string;
        status?: string;
    }): Promise<Recipe[]> {
        const res = await this.client.get<{ success: boolean; data: Recipe[] }>(
            "/admin/manufacturing/recipes",
            { params }
        );
        return res.data;
    }

    async getRecipeById(id: string): Promise<Recipe> {
        const res = await this.client.get<{ success: boolean; data: Recipe }>(
            `/admin/manufacturing/recipes/${id}`
        );
        return res.data;
    }

    async createRecipe(body: CreateRecipeInput): Promise<Recipe> {
        const res = await this.client.post<{ success: boolean; data: Recipe }>(
            "/admin/manufacturing/recipes",
            body
        );
        return res.data;
    }

    async updateRecipe(id: string, body: UpdateRecipeInput): Promise<Recipe> {
        const res = await this.client.patch<{ success: boolean; data: Recipe }>(
            `/admin/manufacturing/recipes/${id}`,
            body
        );
        return res.data;
    }

    // Feasibility & Production
    async checkFeasibility(
        recipeId: string,
        quantity: number,
        manufacturingDate?: string
    ): Promise<ProductionFeasibilityCheck> {
        const res = await this.client.get<{ success: boolean; data: ProductionFeasibilityCheck }>(
            "/admin/manufacturing/feasibility",
            {
                params: {
                    recipeId,
                    quantity,
                    manufacturingDate,
                },
            }
        );
        return res.data;
    }

    async executeProduction(body: ExecuteProductionInput): Promise<ProductionRun> {
        const res = await this.client.post<{ success: boolean; data: ProductionRun }>(
            "/admin/manufacturing/production-runs",
            body
        );
        return res.data;
    }

    async reverseProduction(id: string, body: ReverseProductionInput): Promise<ProductionRun> {
        const res = await this.client.post<{ success: boolean; data: ProductionRun }>(
            `/admin/manufacturing/production-runs/${id}/reverse`,
            body
        );
        return res.data;
    }

    async listProductionRuns(params?: {
        productId?: string;
        recipeId?: string;
        status?: string;
        limit?: number;
    }): Promise<ProductionRun[]> {
        const res = await this.client.get<{ success: boolean; data: ProductionRun[] }>(
            "/admin/manufacturing/production-runs",
            { params }
        );
        return res.data;
    }

    async syncVariantCost(body: SyncVariantCostInput): Promise<{
        productId: string;
        variantId: string;
        updatedCostAmount: number;
        currency: string;
    }> {
        const res = await this.client.post<{
            success: boolean;
            data: {
                productId: string;
                variantId: string;
                updatedCostAmount: number;
                currency: string;
            };
        }>("/admin/manufacturing/sync-variant-cost", body);
        return res.data;
    }

    // Stock Repackaging (Bulk to Retail)
    async listRepackagingRuns(params?: {
        sourceRawMaterialId?: string;
        targetProductId?: string;
        status?: string;
    }): Promise<RepackagingRun[]> {
        const res = await this.client.get<{ success: boolean; data: RepackagingRun[] }>(
            "/admin/manufacturing/repackaging",
            { params }
        );
        return res.data;
    }

    async createRepackagingRun(body: CreateRepackagingRunInput): Promise<RepackagingRun> {
        const res = await this.client.post<{ success: boolean; data: RepackagingRun }>(
            "/admin/manufacturing/repackaging",
            body
        );
        return res.data;
    }

    async reverseRepackagingRun(id: string, body: ReverseRepackagingRunInput): Promise<RepackagingRun> {
        const res = await this.client.post<{ success: boolean; data: RepackagingRun }>(
            `/admin/manufacturing/repackaging/${id}/reverse`,
            body
        );
        return res.data;
    }
}

