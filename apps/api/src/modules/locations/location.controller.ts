import { Request, Response, NextFunction } from "express";
import { LocationType } from "@ecommers/types";
import { locationService } from "./location.service.js";

export class LocationController {
    async listLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query: { type?: LocationType; countryCode?: string; isActive?: boolean; search?: string } = {
                isActive: true, // Public endpoint only returns active locations
            };
            if (req.query.type) query.type = req.query.type as LocationType;
            if (req.query.countryCode) query.countryCode = req.query.countryCode as string;
            if (req.query.search) query.search = req.query.search as string;

            const locations = await locationService.listLocations(query);
            res.status(200).json({ success: true, data: locations });
        } catch (error) {
            next(error);
        }
    }

    async adminListLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query: { type?: LocationType; countryCode?: string; isActive?: boolean; search?: string } = {};
            if (req.query.type) query.type = req.query.type as LocationType;
            if (req.query.countryCode) query.countryCode = req.query.countryCode as string;
            if (req.query.isActive !== undefined) query.isActive = req.query.isActive === "true";
            if (req.query.search) query.search = req.query.search as string;

            const locations = await locationService.listLocations(query);
            res.status(200).json({ success: true, data: locations });
        } catch (error) {
            next(error);
        }
    }

    async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const idOrCode = (req.params.idOrCode || "") as string;
            let location;
            if (idOrCode.match(/^[0-9a-fA-F]{24}$/)) {
                location = await locationService.getLocationById(idOrCode);
            } else {
                location = await locationService.getLocationByCode(idOrCode);
            }
            res.status(200).json({ success: true, data: location });
        } catch (error) {
            next(error);
        }
    }

    async checkPincode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { pincode, countryCode } = req.body;
            const result = await locationService.checkPincode(pincode, countryCode);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const location = await locationService.createLocation(req.body);
            res.status(201).json({ success: true, data: location });
        } catch (error) {
            next(error);
        }
    }

    async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = (req.params.id || "") as string;
            const location = await locationService.updateLocation(id, req.body);
            res.status(200).json({ success: true, data: location });
        } catch (error) {
            next(error);
        }
    }

    async deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = (req.params.id || "") as string;
            await locationService.deleteLocation(id);
            res.status(200).json({ success: true, message: "Location removed successfully" });
        } catch (error) {
            next(error);
        }
    }

    async bulkUploadLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            let csvContent = "";
            const mode = ((req.body?.mode || "UPSERT") as string).toUpperCase() as "UPSERT" | "REPLACE";

            if (req.body?.csvContent) {
                csvContent = req.body.csvContent;
            } else if (typeof req.body === "string") {
                csvContent = req.body;
            } else if ((req as any).file?.buffer) {
                csvContent = (req as any).file.buffer.toString("utf-8");
            } else {
                res.status(400).json({
                    success: false,
                    error: { code: "MISSING_CSV", message: "CSV content or file is required" },
                });
                return;
            }

            const result = await locationService.bulkUploadCsv(csvContent, mode);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}

export const locationController = new LocationController();
