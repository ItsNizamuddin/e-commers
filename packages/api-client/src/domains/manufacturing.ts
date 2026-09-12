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

function extractData<T>(res: any): T {
    if (res && typeof res === "object" && !Array.isArray(res) && "data" in res && "success" in res) {
        return (res as any).data as T;
    }
    return res as T;
}

function extractList<T>(res: any): T[] {
    const data = extractData<any>(res);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
    }
    return [];
}

export class ManufacturingClient {
    constructor(private readonly client: ApiClient) {}

    // Raw Materials
    async listRawMaterials(params?: {
        search?: string;
        category?: string;
        usage?: string;
        isActive?: boolean;
    }): Promise<RawMaterial[]> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/raw-materials",
            { params }
        );
        return extractList<RawMaterial>(res);
    }

    async getRawMaterialById(id: string): Promise<RawMaterial> {
        const res = await this.client.get<any>(
            `/admin/manufacturing/raw-materials/${id}`
        );
        return extractData<RawMaterial>(res);
    }

    async createRawMaterial(body: CreateRawMaterialInput): Promise<RawMaterial> {
        const res = await this.client.post<any>(
            "/admin/manufacturing/raw-materials",
            body
        );
        return extractData<RawMaterial>(res);
    }

    async updateRawMaterial(id: string, body: UpdateRawMaterialInput): Promise<RawMaterial> {
        const res = await this.client.patch<any>(
            `/admin/manufacturing/raw-materials/${id}`,
            body
        );
        return extractData<RawMaterial>(res);
    }

    // Purchases & Intakes
    async recordPurchase(body: RecordPurchaseIntakeInput): Promise<{
        rawMaterial: RawMaterial;
        lot: RawMaterialLot;
        movement: RawMaterialStockMovement;
    }> {
        const res = await this.client.post<any>(
            "/admin/manufacturing/purchases",
            body
        );
        return extractData<{
            rawMaterial: RawMaterial;
            lot: RawMaterialLot;
            movement: RawMaterialStockMovement;
        }>(res);
    }

    async listLots(params?: {
        rawMaterialId?: string;
        isDepleted?: boolean;
    }): Promise<RawMaterialLot[]> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/lots",
            { params }
        );
        return extractList<RawMaterialLot>(res);
    }

    async listLedger(params?: {
        rawMaterialId?: string;
        limit?: number;
    }): Promise<RawMaterialStockMovement[]> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/ledger",
            { params }
        );
        return extractList<RawMaterialStockMovement>(res);
    }

    // Recipes
    async listRecipes(params?: {
        productId?: string;
        status?: string;
    }): Promise<Recipe[]> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/recipes",
            { params }
        );
        return extractList<Recipe>(res);
    }

    async getRecipeById(id: string): Promise<Recipe> {
        const res = await this.client.get<any>(
            `/admin/manufacturing/recipes/${id}`
        );
        return extractData<Recipe>(res);
    }

    async createRecipe(body: CreateRecipeInput): Promise<Recipe> {
        const res = await this.client.post<any>(
            "/admin/manufacturing/recipes",
            body
        );
        return extractData<Recipe>(res);
    }

    async updateRecipe(id: string, body: UpdateRecipeInput): Promise<Recipe> {
        const res = await this.client.patch<any>(
            `/admin/manufacturing/recipes/${id}`,
            body
        );
        return extractData<Recipe>(res);
    }

    // Feasibility & Production
    async checkFeasibility(
        recipeId: string,
        quantity: number,
        manufacturingDate?: string
    ): Promise<ProductionFeasibilityCheck> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/feasibility",
            {
                params: {
                    recipeId,
                    quantity,
                    manufacturingDate,
                },
            }
        );
        return extractData<ProductionFeasibilityCheck>(res);
    }

    async executeProduction(body: ExecuteProductionInput): Promise<ProductionRun> {
        const res = await this.client.post<any>(
            "/admin/manufacturing/production-runs",
            body
        );
        return extractData<ProductionRun>(res);
    }

    async reverseProduction(id: string, body: ReverseProductionInput): Promise<ProductionRun> {
        const res = await this.client.post<any>(
            `/admin/manufacturing/production-runs/${id}/reverse`,
            body
        );
        return extractData<ProductionRun>(res);
    }

    async listProductionRuns(params?: {
        productId?: string;
        recipeId?: string;
        status?: string;
        limit?: number;
    }): Promise<ProductionRun[]> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/production-runs",
            { params }
        );
        return extractList<ProductionRun>(res);
    }

    async syncVariantCost(body: SyncVariantCostInput): Promise<{
        productId: string;
        variantId: string;
        updatedCostAmount: number;
        currency: string;
    }> {
        const res = await this.client.post<any>(
            "/admin/manufacturing/sync-variant-cost",
            body
        );
        return extractData<{
            productId: string;
            variantId: string;
            updatedCostAmount: number;
            currency: string;
        }>(res);
    }

    // Stock Repackaging (Bulk to Retail)
    async listRepackagingRuns(params?: {
        sourceRawMaterialId?: string;
        targetProductId?: string;
        status?: string;
    }): Promise<RepackagingRun[]> {
        const res = await this.client.get<any>(
            "/admin/manufacturing/repackaging",
            { params }
        );
        return extractList<RepackagingRun>(res);
    }

    async createRepackagingRun(body: CreateRepackagingRunInput): Promise<RepackagingRun> {
        const res = await this.client.post<any>(
            "/admin/manufacturing/repackaging",
            body
        );
        return extractData<RepackagingRun>(res);
    }

    async reverseRepackagingRun(id: string, body: ReverseRepackagingRunInput): Promise<RepackagingRun> {
        const res = await this.client.post<any>(
            `/admin/manufacturing/repackaging/${id}/reverse`,
            body
        );
        return extractData<RepackagingRun>(res);
    }
}

