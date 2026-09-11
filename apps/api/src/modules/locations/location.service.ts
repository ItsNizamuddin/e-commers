import { Types } from "mongoose";
import {
    LocationResponse,
    CreateLocationInput,
    UpdateLocationInput,
    CheckPincodeResponse,
    BulkLocationUploadResult,
    LocationType,
} from "@ecommers/types";
import { LocationModel, LocationDocument } from "./location.model.js";
import { AppError } from "../../utils/app-error.js";
import { logger } from "../../config/logger.js";

export class LocationService {
    mapToResponse(doc: LocationDocument): LocationResponse {
        return {
            id: doc._id.toString(),
            code: doc.code,
            name: doc.name,
            type: doc.type,
            ...(doc.stateOrRegion ? { stateOrRegion: doc.stateOrRegion } : {}),
            countryCode: doc.countryCode,
            currency: doc.currency,
            isActive: doc.isActive,
            deliveryEstimate: doc.deliveryEstimate,
            ...(doc.warehouseId ? { warehouseId: doc.warehouseId.toString() } : {}),
            ...(doc.minOrderValue !== undefined ? { minOrderValue: doc.minOrderValue } : {}),
            ...(doc.shippingFlatRate !== undefined ? { shippingFlatRate: doc.shippingFlatRate } : {}),
            postalCodes: doc.postalCodes || [],
            postalCodePrefixes: doc.postalCodePrefixes || [],
            ...(doc.defaultSeoTitleTemplate ? { defaultSeoTitleTemplate: doc.defaultSeoTitleTemplate } : {}),
            ...(doc.defaultSeoDescriptionTemplate ? { defaultSeoDescriptionTemplate: doc.defaultSeoDescriptionTemplate } : {}),
            ...(doc.deliveryHighlight ? { deliveryHighlight: doc.deliveryHighlight } : {}),
            sortOrder: doc.sortOrder ?? 0,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    async listLocations(query?: {
        type?: LocationType;
        countryCode?: string;
        isActive?: boolean;
        search?: string;
    }): Promise<LocationResponse[]> {
        const filter: Record<string, any> = {};

        if (query?.type) filter.type = query.type;
        if (query?.countryCode) filter.countryCode = query.countryCode.toUpperCase();
        if (query?.isActive !== undefined) filter.isActive = query.isActive;
        if (query?.search) {
            const regex = new RegExp(query.search, "i");
            filter.$or = [{ name: regex }, { code: regex }];
        }

        const docs = await LocationModel.find(filter).sort({ sortOrder: 1, name: 1 });
        return docs.map((doc) => this.mapToResponse(doc));
    }

    async getLocationByCode(code: string): Promise<LocationResponse> {
        const doc = await LocationModel.findOne({ code: code.toLowerCase().trim() });
        if (!doc) {
            throw new AppError(`Location '${code}' not found`, 404, "LOCATION_NOT_FOUND");
        }
        return this.mapToResponse(doc);
    }

    async getLocationById(id: string): Promise<LocationResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid location ID", 400, "INVALID_ID");
        }
        const doc = await LocationModel.findById(id);
        if (!doc) {
            throw new AppError("Location not found", 404, "LOCATION_NOT_FOUND");
        }
        return this.mapToResponse(doc);
    }

    async createLocation(input: CreateLocationInput): Promise<LocationResponse> {
        const normalizedCode = input.code.toLowerCase().trim();
        const existing = await LocationModel.findOne({ code: normalizedCode });
        if (existing) {
            throw new AppError(`Location with code '${normalizedCode}' already exists`, 409, "LOCATION_ALREADY_EXISTS");
        }

        const createPayload: Record<string, any> = {
            ...input,
            code: normalizedCode,
            countryCode: input.countryCode.toUpperCase().trim(),
            currency: input.currency.toUpperCase().trim(),
        };
        if (input.warehouseId) {
            createPayload.warehouseId = new Types.ObjectId(input.warehouseId);
        }

        const doc = await LocationModel.create(createPayload);
        return this.mapToResponse(doc);
    }

    async updateLocation(id: string, input: UpdateLocationInput): Promise<LocationResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid location ID", 400, "INVALID_ID");
        }

        const updatePayload: Record<string, any> = { ...input };
        if (input.countryCode) updatePayload.countryCode = input.countryCode.toUpperCase().trim();
        if (input.currency) updatePayload.currency = input.currency.toUpperCase().trim();
        if (input.warehouseId) updatePayload.warehouseId = new Types.ObjectId(input.warehouseId);

        const doc = await LocationModel.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });
        if (!doc) {
            throw new AppError("Location not found", 404, "LOCATION_NOT_FOUND");
        }
        return this.mapToResponse(doc);
    }

    async deleteLocation(id: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid location ID", 400, "INVALID_ID");
        }
        const result = await LocationModel.findByIdAndDelete(id);
        if (!result) {
            throw new AppError("Location not found", 404, "LOCATION_NOT_FOUND");
        }
    }

    async checkPincode(pincode: string, countryCode?: string): Promise<CheckPincodeResponse> {
        const cleaned = pincode.trim();
        const filter: Record<string, any> = { isActive: true };
        if (countryCode) {
            filter.countryCode = countryCode.toUpperCase();
        }

        // 1. Check exact match in postalCodes
        let doc = await LocationModel.findOne({
            ...filter,
            postalCodes: cleaned,
        });

        // 2. If not found, check prefix match or nationwide wildcard
        if (!doc) {
            const activeLocations = await LocationModel.find(filter);
            for (const loc of activeLocations) {
                // Check nationwide indicator
                if (loc.postalCodes.includes("NATIONWIDE") || loc.postalCodes.includes("*")) {
                    doc = loc;
                    break;
                }
                // Check wildcard prefixes (e.g. "560*")
                const matchedPrefix = loc.postalCodePrefixes.some((p) => {
                    const prefix = p.replace(/\*$/, "");
                    return cleaned.startsWith(prefix);
                });
                if (matchedPrefix) {
                    doc = loc;
                    break;
                }
            }
        }

        if (!doc) {
            return {
                serviceable: false,
                message: `Delivery is currently not available to pincode ${cleaned}.`,
            };
        }

        return {
            serviceable: true,
            location: {
                id: doc._id.toString(),
                code: doc.code,
                name: doc.name,
                type: doc.type,
                countryCode: doc.countryCode,
                currency: doc.currency,
                deliveryEstimate: doc.deliveryEstimate,
                ...(doc.deliveryHighlight ? { deliveryHighlight: doc.deliveryHighlight } : {}),
            },
        };
    }

    /**
     * Parses raw CSV text and performs atomic high-throughput bulk ingestion.
     * Supports:
     *  - Range expansion: "560001-560010" -> 10 sequential pincodes
     *  - Semicolon/comma separated lists: "560001;560002;560038"
     *  - Wildcard prefixes: "560*" -> added to postalCodePrefixes
     *  - Nationwide tags: "NATIONWIDE"
     */
    async bulkUploadCsv(csvContent: string, mode: "UPSERT" | "REPLACE" = "UPSERT"): Promise<BulkLocationUploadResult> {
        const lines = csvContent
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"));

        if (lines.length < 2) {
            throw new AppError("CSV file must contain a header row and at least one data row", 400, "INVALID_CSV");
        }

        const headerLine = lines[0] || "";
        const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

        const requiredHeaders = ["code", "name", "type", "currency"];
        for (const req of requiredHeaders) {
            if (!headers.includes(req)) {
                throw new AppError(`Missing required CSV header: '${req}'`, 400, "INVALID_CSV_HEADERS");
            }
        }

        const codeIdx = headers.indexOf("code");
        const nameIdx = headers.indexOf("name");
        const typeIdx = headers.indexOf("type");
        const countryCodeIdx = headers.indexOf("countrycode");
        const currencyIdx = headers.indexOf("currency");
        const stateOrRegionIdx = headers.findIndex((h) => h === "stateorregion" || h === "state" || h === "region");
        const estimateIdx = headers.indexOf("deliveryestimate");
        const postalCodesIdx = headers.indexOf("postalcodes");
        const activeIdx = headers.indexOf("isactive");

        const errors: BulkLocationUploadResult["errors"] = [];
        const processedLocations: BulkLocationUploadResult["processedLocations"] = [];

        let totalPincodesIndexed = 0;
        const bulkOps: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const rawLine = lines[i] || "";
            if (!rawLine) continue;

            const cells = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((c) => c.replace(/^["']|["']$/g, "").trim()) ||
                rawLine.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());

            const code = (cells[codeIdx] || "").toLowerCase().trim();
            const name = (cells[nameIdx] || "").trim();
            const rawType = (cells[typeIdx] || "").toUpperCase().trim();
            const type = (["CITY", "COUNTRY", "ZONE"].includes(rawType) ? rawType : "CITY") as LocationType;
            const stateOrRegion = stateOrRegionIdx !== -1 && cells[stateOrRegionIdx] ? cells[stateOrRegionIdx].trim() : undefined;
            const countryCode = (cells[countryCodeIdx] || (type === "COUNTRY" ? code : "IN")).toUpperCase().trim();
            const currency = (cells[currencyIdx] || "INR").toUpperCase().trim();
            const deliveryEstimate = cells[estimateIdx] || (type === "CITY" ? "Within 24 Hours" : "3-5 Business Days");
            const activeCell = cells[activeIdx];
            const isActive = activeCell !== undefined ? activeCell.toLowerCase() !== "false" : true;

            if (!code || !name) {
                errors.push({
                    row: i + 1,
                    ...(code ? { code } : {}),
                    message: "Missing required 'code' or 'name' field",
                });
                continue;
            }

            // Parse and expand postal codes
            const rawPostalCodes = cells[postalCodesIdx] || "";
            const parsedCodes = new Set<string>();
            const parsedPrefixes = new Set<string>();

            if (rawPostalCodes) {
                const tokens = rawPostalCodes.split(/[;|,]+/).map((t) => t.trim()).filter(Boolean);
                for (const token of tokens) {
                    if (token === "NATIONWIDE" || token === "*") {
                        parsedCodes.add("NATIONWIDE");
                    } else if (token.includes("*")) {
                        parsedPrefixes.add(token);
                    } else if (token.includes("-")) {
                        const [startStr = "", endStr = ""] = token.split("-").map((t) => t.trim());
                        const start = parseInt(startStr, 10);
                        const end = parseInt(endStr, 10);
                        if (!isNaN(start) && !isNaN(end) && end >= start && end - start <= 2000) {
                            for (let pin = start; pin <= end; pin++) {
                                parsedCodes.add(pin.toString());
                            }
                        } else {
                            parsedCodes.add(token);
                        }
                    } else {
                        parsedCodes.add(token);
                    }
                }
            }

            const postalCodesArr = Array.from(parsedCodes);
            const postalPrefixesArr = Array.from(parsedPrefixes);
            totalPincodesIndexed += postalCodesArr.length;

            if (mode === "REPLACE") {
                bulkOps.push({
                    updateOne: {
                        filter: { code },
                        update: {
                            $set: {
                                code,
                                name,
                                type,
                                ...(stateOrRegion ? { stateOrRegion } : {}),
                                countryCode,
                                currency,
                                deliveryEstimate,
                                isActive,
                                postalCodes: postalCodesArr,
                                postalCodePrefixes: postalPrefixesArr,
                            },
                        },
                        upsert: true,
                    },
                });
            } else {
                bulkOps.push({
                    updateOne: {
                        filter: { code },
                        update: {
                            $set: {
                                code,
                                name,
                                type,
                                ...(stateOrRegion ? { stateOrRegion } : {}),
                                countryCode,
                                currency,
                                deliveryEstimate,
                                isActive,
                            },
                            $addToSet: {
                                postalCodes: { $each: postalCodesArr },
                                postalCodePrefixes: { $each: postalPrefixesArr },
                            },
                        },
                        upsert: true,
                    },
                });
            }

            processedLocations.push({
                code,
                name,
                pincodeCount: postalCodesArr.length,
                status: "UPDATED",
            });
        }

        let createdCount = 0;
        let updatedCount = 0;

        if (bulkOps.length > 0) {
            const res = await LocationModel.bulkWrite(bulkOps, { ordered: false });
            createdCount = res.upsertedCount || 0;
            updatedCount = res.modifiedCount || 0;
        }

        return {
            summary: {
                totalRows: lines.length - 1,
                created: createdCount,
                updated: updatedCount,
                failed: errors.length,
                totalPincodesIndexed,
            },
            processedLocations,
            errors,
        };
    }
}

export const locationService = new LocationService();

