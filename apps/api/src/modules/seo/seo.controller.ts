import { Request, Response, NextFunction } from "express";
import { seoService } from "./seo.service.js";
import { bulkSeoImportSchema, autoFillLocationsSchema, upsertEntitySeoSchema } from "./seo.validation.js";
import { SeoEntityType } from "@ecommers/types";

export class SeoController {
    /**
     * GET /api/seo/:entityType/:entityId
     */
    async getSeo(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const rawType = Array.isArray(req.params.entityType) ? req.params.entityType[0] : req.params.entityType;
            const entityType = ((rawType || "PRODUCT") as string).toUpperCase() as SeoEntityType;

            const rawId = Array.isArray(req.params.entityId) ? req.params.entityId[0] : req.params.entityId;
            const entityId = (rawId || "") as string;

            const seo = await seoService.getSeo(entityType, entityId);
            res.status(200).json({ success: true, data: seo });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/seo/:entityType/:entityId
     */
    async upsertSeo(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const rawType = Array.isArray(req.params.entityType) ? req.params.entityType[0] : req.params.entityType;
            const entityType = ((rawType || "PRODUCT") as string).toUpperCase() as SeoEntityType;

            const rawId = Array.isArray(req.params.entityId) ? req.params.entityId[0] : req.params.entityId;
            const entityId = (rawId || "") as string;

            const validated = upsertEntitySeoSchema.parse(req.body);

            const result = await seoService.upsertSeo(entityType, entityId, validated);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/seo/export?entityType=PRODUCT
     */
    async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const entityType = ((req.query.entityType as string) || "PRODUCT").toUpperCase() as SeoEntityType;
            const fieldsQuery = req.query.fields as string | undefined;
            const fields = fieldsQuery
                ? fieldsQuery
                      .split(",")
                      .map((f) => f.trim())
                      .filter(Boolean)
                : undefined;
            const { filename, csv } = await seoService.exportSeoCsv(entityType, fields);

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.status(200).send(csv);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/seo/import
     */
    async importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validated = bulkSeoImportSchema.parse(req.body);
            const result = await seoService.importSeoCsv(validated.csvContent, validated.mode);

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/seo/auto-fill
     */
    async autoFillLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validated = autoFillLocationsSchema.parse(req.body);
            const options: { titleTemplate?: string; descTemplate?: string; badgeTemplate?: string } = {};
            if (validated.titleTemplate) options.titleTemplate = validated.titleTemplate;
            if (validated.descTemplate) options.descTemplate = validated.descTemplate;
            if (validated.badgeTemplate) options.badgeTemplate = validated.badgeTemplate;

            const result = await seoService.autoFillLocations(
                validated.entityType,
                validated.entityId,
                options
            );

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/seo/entities?entityType=PRODUCT&search=...
     */
    async listEntities(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const entityType = ((req.query.entityType as string) || "PRODUCT").toUpperCase() as SeoEntityType;
            const search = req.query.search as string | undefined;
            const entities = await seoService.listEntitiesForSeo(entityType, search);
            res.status(200).json({ success: true, data: entities });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/seo/metadata-rows?entityType=PRODUCT&entityId=...&search=...
     */
    async getMetadataRows(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const entityType = ((req.query.entityType as string) || "PRODUCT").toUpperCase() as SeoEntityType;
            const entityId = (req.query.entityId as string) || "";
            const search = req.query.search as string | undefined;

            if (!entityId) {
                res.status(400).json({ success: false, message: "entityId query parameter is required" });
                return;
            }

            const result = await seoService.getSeoMetadataRows(entityType, entityId, search);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/admin/seo/row/:entityType/:entityId/:locationKey
     */
    async updateIndividualRow(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const rawType = Array.isArray(req.params.entityType) ? req.params.entityType[0] : req.params.entityType;
            const entityType = ((rawType || "PRODUCT") as string).toUpperCase() as SeoEntityType;

            const rawId = Array.isArray(req.params.entityId) ? req.params.entityId[0] : req.params.entityId;
            const entityId = (rawId || "") as string;

            const rawKey = Array.isArray(req.params.locationKey) ? req.params.locationKey[0] : req.params.locationKey;
            const locationKey = (rawKey || "global") as string;

            const result = await seoService.updateIndividualRow(entityType, entityId, locationKey, req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

export const seoController = new SeoController();
