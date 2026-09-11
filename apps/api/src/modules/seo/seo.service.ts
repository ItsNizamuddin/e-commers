import { EntitySeoModel, EntitySeoDocument } from "./seo.model.js";
import { ProductModel } from "../products/product.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { BulkSeoUploadResult, LocationSeoOverride, SeoEntityType } from "@ecommers/types";

export class SeoService {
    /**
     * Get SEO record for an entity (with fallback to embedded product/category.seo)
     */
    async getSeo(entityType: SeoEntityType, entityId: string) {
        let seoRecord = await EntitySeoModel.findOne({ entityType, entityId }).lean();
        if (seoRecord) {
            return seoRecord;
        }

        // Fallback to legacy embedded model and lazy-sync
        if (entityType === "PRODUCT") {
            const product = await ProductModel.findById(entityId).lean();
            if (product && product.seo) {
                const globalObj: Record<string, any> = {};
                if (product.seo.metaTitle) globalObj.metaTitle = product.seo.metaTitle;
                if (product.seo.metaDescription) globalObj.metaDescription = product.seo.metaDescription;
                if (product.seo.metaRobots) globalObj.metaRobots = product.seo.metaRobots;
                if (product.seo.keywords) globalObj.keywords = product.seo.keywords;
                if (product.seo.canonicalUrl) globalObj.canonicalUrl = product.seo.canonicalUrl;
                if (product.seo.ogTitle) globalObj.ogTitle = product.seo.ogTitle;
                if (product.seo.ogDescription) globalObj.ogDescription = product.seo.ogDescription;
                if (product.seo.ogImage) globalObj.ogImage = product.seo.ogImage;
                if (product.seo.internalSection) globalObj.internalSection = product.seo.internalSection;
                if (product.seo.bottomSection) globalObj.bottomSection = product.seo.bottomSection;

                const created = await EntitySeoModel.create({
                    entityType: "PRODUCT",
                    entityId: product._id.toString(),
                    entitySlug: product.slug,
                    entityTitle: product.title,
                    global: globalObj,
                    locations: product.seo.locations || [],
                });
                return (created as any).toObject ? (created as any).toObject() : created;
            }
        } else if (entityType === "CATEGORY") {
            const category = await CategoryModel.findById(entityId).lean();
            if (category && category.seo) {
                const globalObj: Record<string, any> = {};
                if (category.seo.metaTitle) globalObj.metaTitle = category.seo.metaTitle;
                if (category.seo.metaDescription) globalObj.metaDescription = category.seo.metaDescription;
                if (category.seo.metaRobots) globalObj.metaRobots = category.seo.metaRobots;
                if (category.seo.keywords) globalObj.keywords = category.seo.keywords;
                if (category.seo.canonicalUrl) globalObj.canonicalUrl = category.seo.canonicalUrl;
                if (category.seo.ogTitle) globalObj.ogTitle = category.seo.ogTitle;
                if (category.seo.ogDescription) globalObj.ogDescription = category.seo.ogDescription;
                if (category.seo.ogImage) globalObj.ogImage = category.seo.ogImage;
                if (category.seo.internalSection) globalObj.internalSection = category.seo.internalSection;
                if (category.seo.bottomSection) globalObj.bottomSection = category.seo.bottomSection;

                const created = await EntitySeoModel.create({
                    entityType: "CATEGORY",
                    entityId: category._id.toString(),
                    entitySlug: category.slug,
                    entityTitle: category.name,
                    global: globalObj,
                    locations: category.seo.locations || [],
                });
                return (created as any).toObject ? (created as any).toObject() : created;
            }
        }

        return null;
    }

    /**
     * Upsert SEO record in dedicated collection and synchronize with entity document
     */
    async upsertSeo(
        entityType: SeoEntityType,
        entityId: string,
        data: {
            entityTitle?: string | undefined;
            entitySlug?: string | undefined;
            global?: Record<string, any> | undefined;
            locations?: LocationSeoOverride[] | undefined;
        }
    ) {
        // Resolve slug & title if not provided
        let slug = data.entitySlug;
        let title = data.entityTitle;

        if (!slug || !title) {
            if (entityType === "PRODUCT") {
                const product = await ProductModel.findById(entityId).select("slug title").lean();
                if (product) {
                    slug = slug || product.slug;
                    title = title || product.title;
                }
            } else if (entityType === "CATEGORY") {
                const category = await CategoryModel.findById(entityId).select("slug name").lean();
                if (category) {
                    slug = slug || category.slug;
                    title = title || category.name;
                }
            }
        }

        const upserted = await EntitySeoModel.findOneAndUpdate(
            { entityType, entityId },
            {
                $set: {
                    entityType,
                    entityId,
                    entitySlug: slug || "unnamed",
                    entityTitle: title || "",
                    global: data.global || {},
                    locations: data.locations || [],
                },
            },
            { upsert: true, new: true }
        ).lean();

        return upserted;
    }

    /**
     * Export all SEO records for an entityType as CSV with optional field selection
     */
    async exportSeoCsv(
        entityType: SeoEntityType = "PRODUCT",
        selectedFields?: string[]
    ): Promise<{ filename: string; csv: string }> {
        const activeLocations = await LocationModel.find({ isActive: true }).lean();

        let items: Array<{ id: string; slug: string; title: string }> = [];

        if (entityType === "PRODUCT") {
            const products = await ProductModel.find()
                .select("_id slug title")
                .sort({ title: 1 })
                .lean();
            items = products.map((p) => ({
                id: p._id.toString(),
                slug: p.slug,
                title: p.title,
            }));
        } else if (entityType === "CATEGORY") {
            const categories = await CategoryModel.find()
                .select("_id slug name")
                .sort({ name: 1 })
                .lean();
            items = categories.map((c) => ({
                id: c._id.toString(),
                slug: c.slug,
                title: c.name,
            }));
        }

        // Fetch any dedicated SEO records
        const entityIds = items.map((i) => i.id);
        const dedicatedRecords = await EntitySeoModel.find({
            entityType,
            entityId: { $in: entityIds },
        }).lean();
        const dedicatedMap = new Map(dedicatedRecords.map((r) => [r.entityId, r]));

        // Base identification columns always included for re-import compatibility
        const baseHeaders = [
            "entityType",
            "entityId",
            "entitySlug",
            "entityTitle",
            "locationKey",
            "locationName",
            "locationType",
        ];

        // All selectable data fields
        const allDataFields = [
            "metaTitle",
            "metaDescription",
            "metaRobots",
            "deliveryHighlight",
            "keywords",
            "canonicalUrl",
            "internalSectionTitle",
            "internalSectionValue",
            "bottomSectionTitle",
            "bottomSectionValue",
        ];

        const activeDataFields =
            selectedFields && selectedFields.length > 0
                ? allDataFields.filter((f) =>
                      selectedFields.map((s) => s.toLowerCase()).includes(f.toLowerCase())
                  )
                : allDataFields;

        const headers = [...baseHeaders, ...activeDataFields];

        const escapeCsv = (val: any) => {
            if (val === undefined || val === null) return '""';
            const str = Array.isArray(val) ? val.join(", ") : String(val);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const rows: string[] = [headers.join(",")];

        for (const item of items) {
            const dedicated = dedicatedMap.get(item.id);
            const globalSeo = dedicated?.global || {};
            const locationsSeo: LocationSeoOverride[] = dedicated?.locations || [];
            const locMap = new Map(locationsSeo.map((l) => [l.locationKey.toLowerCase(), l]));

            const getFieldVal = (fieldName: string, override?: LocationSeoOverride, isGlob: boolean = false) => {
                switch (fieldName) {
                    case "metaTitle":
                        return isGlob ? (globalSeo.metaTitle || item.title) : (override?.metaTitle || `${item.title} in ${override?.locationName || ""}`);
                    case "metaDescription":
                        return isGlob ? (globalSeo.metaDescription || "") : (override?.metaDescription || "");
                    case "metaRobots":
                        return isGlob ? (globalSeo.metaRobots || "index, follow") : (override?.metaRobots || "index, follow");
                    case "deliveryHighlight":
                        return isGlob ? "" : (override?.deliveryHighlight || `Available in ${override?.locationName || ""}`);
                    case "keywords":
                        return isGlob ? (globalSeo.keywords || []) : (override?.keywords || []);
                    case "canonicalUrl":
                        return isGlob ? (globalSeo.canonicalUrl || "") : (override?.canonicalUrl || "");
                    case "internalSectionTitle":
                        return isGlob ? (globalSeo.internalSection?.title || "") : (override?.internalSection?.title || "");
                    case "internalSectionValue":
                        return isGlob ? (globalSeo.internalSection?.value || "") : (override?.internalSection?.value || "");
                    case "bottomSectionTitle":
                        return isGlob ? (globalSeo.bottomSection?.title || "") : (override?.bottomSection?.title || "");
                    case "bottomSectionValue":
                        return isGlob ? (globalSeo.bottomSection?.value || "") : (override?.bottomSection?.value || "");
                    default:
                        return "";
                }
            };

            // 1. Global Row
            const globalRow = [
                escapeCsv(entityType),
                escapeCsv(item.id),
                escapeCsv(item.slug),
                escapeCsv(item.title),
                escapeCsv("GLOBAL"),
                escapeCsv("Global (Default)"),
                escapeCsv("GLOBAL"),
                ...activeDataFields.map((f) => escapeCsv(getFieldVal(f, undefined, true))),
            ];
            rows.push(globalRow.join(","));

            // 2. Active Location Rows
            for (const loc of activeLocations) {
                const override = locMap.get(loc.code.toLowerCase()) || {
                    locationKey: loc.code.toLowerCase(),
                    locationName: loc.name,
                    locationType: loc.type,
                };

                const locRow = [
                    escapeCsv(entityType),
                    escapeCsv(item.id),
                    escapeCsv(item.slug),
                    escapeCsv(item.title),
                    escapeCsv(loc.code.toLowerCase()),
                    escapeCsv(loc.name),
                    escapeCsv(loc.type),
                    ...activeDataFields.map((f) => escapeCsv(getFieldVal(f, override as LocationSeoOverride, false))),
                ];
                rows.push(locRow.join(","));
            }
        }

        const dateStr = new Date().toISOString().split("T")[0];
        return {
            filename: `${entityType.toLowerCase()}-seo-bulk-export-${dateStr}.csv`,
            csv: rows.join("\n"),
        };
    }

    /**
     * Import SEO records from CSV content
     */
    async importSeoCsv(
        csvContent: string,
        _mode: "UPSERT" | "REPLACE" = "UPSERT"
    ): Promise<BulkSeoUploadResult> {
        const lines = csvContent.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
            throw new Error("CSV file contains no data rows");
        }

        // Parse CSV headers
        const headerRow = lines[0] ?? "";
        const headers = this.parseCsvLine(headerRow).map((h) => h.trim());

        const getIdx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
        const typeIdx = getIdx("entityType");
        const idIdx = getIdx("entityId");
        const slugIdx = getIdx("entitySlug");
        const titleIdx = getIdx("entityTitle");
        const locKeyIdx = getIdx("locationKey");
        const locNameIdx = getIdx("locationName");
        const locTypeIdx = getIdx("locationType");
        const titleSeoIdx = getIdx("metaTitle");
        const descSeoIdx = getIdx("metaDescription");
        const highlightIdx = getIdx("deliveryHighlight");
        const kwIdx = getIdx("keywords");
        const canonicalIdx = getIdx("canonicalUrl");
        const intTitleIdx = getIdx("internalSectionTitle");
        const intValIdx = getIdx("internalSectionValue");
        const botTitleIdx = getIdx("bottomSectionTitle");
        const botValIdx = getIdx("bottomSectionValue");

        if (idIdx === -1 && slugIdx === -1) {
            throw new Error("CSV must include at least an 'entityId' or 'entitySlug' column");
        }

        // Group rows by entity
        type ParsedRow = {
            entityType: SeoEntityType;
            entityId?: string | undefined;
            entitySlug?: string | undefined;
            entityTitle?: string | undefined;
            locationKey: string;
            locationName: string;
            locationType: "CITY" | "COUNTRY" | "ZONE";
            metaTitle: string;
            metaDescription: string;
            deliveryHighlight: string;
            keywords: string[];
            canonicalUrl: string;
            internalSectionTitle?: string | undefined;
            internalSectionValue?: string | undefined;
            bottomSectionTitle?: string | undefined;
            bottomSectionValue?: string | undefined;
        };

        const entityGroups = new Map<string, ParsedRow[]>();
        const errors: Array<{ row: number; identifier?: string; message: string }> = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i] ?? "";
            try {
                const values = this.parseCsvLine(line);
                const entityType = ((typeIdx !== -1 && values[typeIdx] ? values[typeIdx] : "PRODUCT") || "PRODUCT").toUpperCase() as SeoEntityType;
                const entityId = idIdx !== -1 && values[idIdx] ? values[idIdx] : undefined;
                const entitySlug = slugIdx !== -1 && values[slugIdx] ? values[slugIdx] : undefined;
                const entityTitle = titleIdx !== -1 && values[titleIdx] ? values[titleIdx] : undefined;
                const locationKey = ((locKeyIdx !== -1 && values[locKeyIdx] ? values[locKeyIdx] : "GLOBAL") || "GLOBAL").trim().toLowerCase();
                const locationName = (locNameIdx !== -1 && values[locNameIdx] ? values[locNameIdx] : "") || locationKey;
                const locationType = (((locTypeIdx !== -1 && values[locTypeIdx] ? values[locTypeIdx] : "CITY") || "CITY").toUpperCase()) as "CITY" | "COUNTRY" | "ZONE";
                const metaTitle = (titleSeoIdx !== -1 && values[titleSeoIdx] ? values[titleSeoIdx] : "") || "";
                const metaDescription = (descSeoIdx !== -1 && values[descSeoIdx] ? values[descSeoIdx] : "") || "";
                const deliveryHighlight = (highlightIdx !== -1 && values[highlightIdx] ? values[highlightIdx] : "") || "";
                const keywords = kwIdx !== -1 && values[kwIdx] ? values[kwIdx]!.split(",").map((k) => k.trim()).filter(Boolean) : [];
                const canonicalUrl = (canonicalIdx !== -1 && values[canonicalIdx] ? values[canonicalIdx] : "") || "";
                const internalSectionTitle = intTitleIdx !== -1 && values[intTitleIdx] ? values[intTitleIdx] : undefined;
                const internalSectionValue = intValIdx !== -1 && values[intValIdx] ? values[intValIdx] : undefined;
                const bottomSectionTitle = botTitleIdx !== -1 && values[botTitleIdx] ? values[botTitleIdx] : undefined;
                const bottomSectionValue = botValIdx !== -1 && values[botValIdx] ? values[botValIdx] : undefined;

                const groupKey = `${entityType}:${entityId || entitySlug}`;
                if (!entityGroups.has(groupKey)) {
                    entityGroups.set(groupKey, []);
                }

                entityGroups.get(groupKey)!.push({
                    entityType,
                    entityId,
                    entitySlug,
                    entityTitle,
                    locationKey,
                    locationName,
                    locationType,
                    metaTitle,
                    metaDescription,
                    deliveryHighlight,
                    keywords,
                    canonicalUrl,
                    internalSectionTitle,
                    internalSectionValue,
                    bottomSectionTitle,
                    bottomSectionValue,
                });
            } catch (err: any) {
                errors.push({ row: i + 1, message: err.message || "Failed to parse line" });
            }
        }

        let updatedEntitiesCount = 0;
        let createdCount = 0;

        for (const [groupKey, rows] of entityGroups.entries()) {
            try {
                const firstRow = rows[0];
                if (!firstRow) continue;

                let entityId = firstRow.entityId;
                let entitySlug = firstRow.entitySlug;
                let entityTitle = firstRow.entityTitle;

                // Resolve entity in database
                if (firstRow.entityType === "PRODUCT") {
                    const prod = entityId
                        ? await ProductModel.findById(entityId).lean()
                        : entitySlug
                        ? await ProductModel.findOne({ slug: entitySlug }).lean()
                        : null;
                    if (!prod) {
                        errors.push({ row: 0, identifier: groupKey, message: `Product not found: ${groupKey}` });
                        continue;
                    }
                    entityId = prod._id.toString();
                    entitySlug = prod.slug;
                    entityTitle = prod.title;
                } else if (firstRow.entityType === "CATEGORY") {
                    const cat = entityId
                        ? await CategoryModel.findById(entityId).lean()
                        : entitySlug
                        ? await CategoryModel.findOne({ slug: entitySlug }).lean()
                        : null;
                    if (!cat) {
                        errors.push({ row: 0, identifier: groupKey, message: `Category not found: ${groupKey}` });
                        continue;
                    }
                    entityId = cat._id.toString();
                    entitySlug = cat.slug;
                    entityTitle = cat.name;
                }

                if (!entityId) continue;

                // Prepare Global SEO and Location Overrides
                const existing = await EntitySeoModel.findOne({ entityType: firstRow.entityType, entityId }).lean();
                const globalSeo: Record<string, any> = { ...(existing?.global || {}) };
                const locationMap = new Map<string, LocationSeoOverride>(
                    (existing?.locations || []).map((l) => [l.locationKey.toLowerCase(), l])
                );

                for (const r of rows) {
                    if (r.locationKey === "global") {
                        if (r.metaTitle) globalSeo["metaTitle"] = r.metaTitle;
                        if (r.metaDescription) globalSeo["metaDescription"] = r.metaDescription;
                        if (r.keywords.length > 0) globalSeo["keywords"] = r.keywords;
                        if (r.canonicalUrl) globalSeo["canonicalUrl"] = r.canonicalUrl;
                        if (r.internalSectionTitle !== undefined || r.internalSectionValue !== undefined) {
                            globalSeo["internalSection"] = {
                                title: r.internalSectionTitle || globalSeo["internalSection"]?.title || "",
                                value: r.internalSectionValue || globalSeo["internalSection"]?.value || "",
                            };
                        }
                        if (r.bottomSectionTitle !== undefined || r.bottomSectionValue !== undefined) {
                            globalSeo["bottomSection"] = {
                                title: r.bottomSectionTitle || globalSeo["bottomSection"]?.title || "",
                                value: r.bottomSectionValue || globalSeo["bottomSection"]?.value || "",
                            };
                        }
                    } else {
                        const existingLoc = locationMap.get(r.locationKey);
                        const hasInternal = r.internalSectionTitle !== undefined || r.internalSectionValue !== undefined;
                        const hasBottom = r.bottomSectionTitle !== undefined || r.bottomSectionValue !== undefined;

                        locationMap.set(r.locationKey, {
                            locationKey: r.locationKey,
                            locationName: r.locationName || existingLoc?.locationName || r.locationKey,
                            locationType: r.locationType || existingLoc?.locationType || "CITY",
                            metaTitle: r.metaTitle || existingLoc?.metaTitle || "",
                            metaDescription: r.metaDescription || existingLoc?.metaDescription || "",
                            deliveryHighlight: r.deliveryHighlight || existingLoc?.deliveryHighlight || "",
                            keywords: r.keywords.length > 0 ? r.keywords : existingLoc?.keywords || [],
                            canonicalUrl: r.canonicalUrl || existingLoc?.canonicalUrl || "",
                            isIndexed: existingLoc?.isIndexed ?? true,
                            internalSection: hasInternal
                                ? {
                                      title: r.internalSectionTitle || existingLoc?.internalSection?.title || "",
                                      value: r.internalSectionValue || existingLoc?.internalSection?.value || "",
                                  }
                                : existingLoc?.internalSection,
                            bottomSection: hasBottom
                                ? {
                                      title: r.bottomSectionTitle || existingLoc?.bottomSection?.title || "",
                                      value: r.bottomSectionValue || existingLoc?.bottomSection?.value || "",
                                  }
                                : existingLoc?.bottomSection,
                        });
                    }
                }

                const upsertPayload: {
                    entityTitle?: string;
                    entitySlug?: string;
                    global?: Record<string, any>;
                    locations?: LocationSeoOverride[];
                } = {
                    global: globalSeo,
                    locations: Array.from(locationMap.values()),
                };
                if (entityTitle) upsertPayload.entityTitle = entityTitle;
                if (entitySlug) upsertPayload.entitySlug = entitySlug;

                await this.upsertSeo(firstRow.entityType, entityId, upsertPayload);

                if (existing) {
                    updatedEntitiesCount++;
                } else {
                    createdCount++;
                }
            } catch (err: any) {
                errors.push({ row: 0, identifier: groupKey, message: err.message || "Failed to upsert SEO group" });
            }
        }

        return {
            totalRows: lines.length - 1,
            updatedEntitiesCount,
            createdCount,
            errors,
        };
    }

    /**
     * Auto-fill all locations with smart templating
     */
    async autoFillLocations(
        entityType: SeoEntityType,
        entityId: string,
        options?: { titleTemplate?: string; descTemplate?: string; badgeTemplate?: string }
    ) {
        let title = "";
        let slug = "";
        let baseKeywords: string[] = [];

        if (entityType === "PRODUCT") {
            const p = await ProductModel.findById(entityId).lean();
            if (!p) throw new Error("Product not found");
            title = p.title;
            slug = p.slug;
            baseKeywords = p.seo?.keywords || p.tags || [];
        } else if (entityType === "CATEGORY") {
            const c = await CategoryModel.findById(entityId).lean();
            if (!c) throw new Error("Category not found");
            title = c.name;
            slug = c.slug;
            baseKeywords = c.seo?.keywords || [];
        }

        const activeLocations = await LocationModel.find({ isActive: true }).lean();

        const titleTmpl = options?.titleTemplate || "{title} in {location} | Best Price & Fast Delivery";
        const descTmpl =
            options?.descTemplate ||
            "Order authentic {title} online in {location}. Fresh preparation, premium quality and express doorstep delivery across {location}.";
        const badgeTmpl = options?.badgeTemplate || "Available in {location}";

        const locations: LocationSeoOverride[] = activeLocations.map((loc) => ({
            locationKey: loc.code.toLowerCase(),
            locationName: loc.name,
            locationType: loc.type,
            currency: loc.currency,
            metaTitle: titleTmpl.replace(/{title}/g, title).replace(/{location}/g, loc.name),
            metaDescription: descTmpl.replace(/{title}/g, title).replace(/{location}/g, loc.name),
            deliveryHighlight: badgeTmpl.replace(/{title}/g, title).replace(/{location}/g, loc.name),
            keywords: baseKeywords.length > 0 ? baseKeywords.map((k) => `${k} ${loc.name.toLowerCase()}`) : [`${title.toLowerCase()} in ${loc.name.toLowerCase()}`],
            canonicalUrl: `/${entityType === "PRODUCT" ? "products" : "categories"}/${slug}/${loc.code.toLowerCase()}`,
            isIndexed: true,
        }));

        return this.upsertSeo(entityType, entityId, {
            entityTitle: title,
            entitySlug: slug,
            locations,
        });
    }

    /**
     * Helper to parse CSV line respecting quotes
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            const next = line[i + 1];

            if (c === '"') {
                if (inQuotes && next === '"') {
                    cur += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === "," && !inQuotes) {
                result.push(cur.trim());
                cur = "";
            } else {
                cur += c;
            }
        }
        result.push(cur.trim());
        return result;
    }

    /**
     * List all entities of a given entityType for SEO selection dropdown
     */
    async listEntitiesForSeo(entityType: SeoEntityType, search?: string) {
        const query: any = {};
        if (entityType === "PRODUCT") {
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { slug: { $regex: search, $options: "i" } },
                ];
            }
            const prods = await ProductModel.find(query, { _id: 1, title: 1, slug: 1, status: 1 }).sort({ createdAt: -1 }).lean();
            return prods.map((p) => ({
                id: p._id.toString(),
                title: p.title,
                slug: p.slug,
                status: p.status,
            }));
        } else if (entityType === "CATEGORY") {
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { slug: { $regex: search, $options: "i" } },
                ];
            }
            const cats = await CategoryModel.find(query, { _id: 1, name: 1, slug: 1, isActive: 1 }).sort({ sortOrder: 1 }).lean();
            return cats.map((c) => ({
                id: c._id.toString(),
                title: c.name,
                slug: c.slug,
                status: c.isActive ? "ACTIVE" : "INACTIVE",
            }));
        }
        return [];
    }

    /**
     * Get SEO Metadata Table rows for a specific entity
     */
    async getSeoMetadataRows(entityType: SeoEntityType, entityId: string, search?: string) {
        let entityTitle = "";
        let entitySlug = "";

        if (entityType === "PRODUCT") {
            const prod = await ProductModel.findById(entityId).select("title slug").lean();
            if (!prod) throw new Error("Product not found");
            entityTitle = prod.title;
            entitySlug = prod.slug;
        } else if (entityType === "CATEGORY") {
            const cat = await CategoryModel.findById(entityId).select("name slug").lean();
            if (!cat) throw new Error("Category not found");
            entityTitle = cat.name;
            entitySlug = cat.slug;
        } else {
            throw new Error(`Unsupported entityType: ${entityType}`);
        }

        // Fetch SEO record from dedicated entityseos collection
        let seoRecord = await EntitySeoModel.findOne({ entityType, entityId }).lean();
        if (!seoRecord) {
            // Initialize an empty record in entityseos
            const created = await EntitySeoModel.create({
                entityType,
                entityId,
                entitySlug,
                entityTitle,
                global: {
                    metaTitle: entityTitle,
                    metaDescription: "",
                    metaRobots: "index, follow",
                    keywords: [],
                    canonicalUrl: "",
                    ogTitle: entityTitle,
                    ogDescription: "",
                    ogImage: "",
                },
                locations: [],
            });
            seoRecord = (created as any).toObject ? (created as any).toObject() : created;
        }

        const activeLocations = await LocationModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
        const locMap = new Map((seoRecord?.locations || []).map((l: LocationSeoOverride) => [l.locationKey.toLowerCase(), l]));

        const rows: any[] = [];

        // 1. Main Page row (GLOBAL)
        const globalSeo = seoRecord?.global || {};
        rows.push({
            id: `${entityId}_GLOBAL`,
            locationKey: "GLOBAL",
            locationName: "Main Page",
            locationType: "GLOBAL",
            slug: entitySlug,
            robots: globalSeo.metaRobots || "index, follow",
            updatedAt: (seoRecord as any)?.updatedAt || new Date(),
            metaTitle: globalSeo.metaTitle || entityTitle,
            metaDescription: globalSeo.metaDescription || "",
            keywords: globalSeo.keywords || [],
            canonicalUrl: globalSeo.canonicalUrl || "",
            ogTitle: globalSeo.ogTitle || entityTitle,
            ogDescription: globalSeo.ogDescription || "",
            ogImage: globalSeo.ogImage || "",
            internalSection: globalSeo.internalSection || { title: "", value: "" },
            bottomSection: globalSeo.bottomSection || { title: "", value: "" },
        });

        // 2. Location rows
        for (const loc of activeLocations) {
            const override = locMap.get(loc.code.toLowerCase());
            const locSlug = `${entitySlug}/${loc.code.toLowerCase()}`;
            rows.push({
                id: `${entityId}_${loc.code.toLowerCase()}`,
                locationKey: loc.code.toLowerCase(),
                locationName: loc.name,
                locationType: loc.type,
                currency: loc.currency,
                slug: locSlug,
                robots: override?.isIndexed === false ? "noindex, nofollow" : (override?.metaRobots || "index, follow"),
                updatedAt: (seoRecord as any)?.updatedAt || loc.updatedAt || new Date(),
                metaTitle: override?.metaTitle || `${entityTitle} in ${loc.name}`,
                metaDescription: override?.metaDescription || "",
                deliveryHighlight: override?.deliveryHighlight || `Available in ${loc.name}`,
                canonicalUrl: override?.canonicalUrl || `/${entityType === "PRODUCT" ? "products" : "categories"}/${locSlug}`,
                keywords: override?.keywords || [],
                isIndexed: override?.isIndexed !== false,
                internalSection: override?.internalSection || { title: "", value: "" },
                bottomSection: override?.bottomSection || { title: "", value: "" },
            });
        }

        // Apply search filter if provided
        let filtered = rows;
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = rows.filter(
                (r) =>
                    r.locationName.toLowerCase().includes(q) ||
                    r.slug.toLowerCase().includes(q) ||
                    r.robots.toLowerCase().includes(q) ||
                    r.metaTitle.toLowerCase().includes(q)
            );
        }

        return {
            entity: {
                id: entityId,
                title: entityTitle,
                slug: entitySlug,
                type: entityType,
            },
            rows: filtered,
            total: filtered.length,
        };
    }

    /**
     * Update an individual row (Main Page or specific location)
     */
    async updateIndividualRow(
        entityType: SeoEntityType,
        entityId: string,
        locationKey: string,
        data: any
    ) {
        const key = locationKey.trim().toLowerCase();

        if (key === "global") {
            const updateDoc: any = {};
            if (data.metaTitle !== undefined) updateDoc["global.metaTitle"] = data.metaTitle;
            if (data.metaDescription !== undefined) updateDoc["global.metaDescription"] = data.metaDescription;
            if (data.metaRobots !== undefined) updateDoc["global.metaRobots"] = data.metaRobots;
            if (data.keywords !== undefined) updateDoc["global.keywords"] = data.keywords;
            if (data.canonicalUrl !== undefined) updateDoc["global.canonicalUrl"] = data.canonicalUrl;
            if (data.ogTitle !== undefined) updateDoc["global.ogTitle"] = data.ogTitle;
            if (data.ogDescription !== undefined) updateDoc["global.ogDescription"] = data.ogDescription;
            if (data.ogImage !== undefined) updateDoc["global.ogImage"] = data.ogImage;
            if (data.internalSection !== undefined) updateDoc["global.internalSection"] = data.internalSection;
            if (data.bottomSection !== undefined) updateDoc["global.bottomSection"] = data.bottomSection;
            updateDoc.updatedAt = new Date();

            return await EntitySeoModel.findOneAndUpdate(
                { entityType, entityId },
                { $set: updateDoc },
                { upsert: true, new: true }
            ).lean();
        } else {
            // Location override
            const existing = await EntitySeoModel.findOne({ entityType, entityId });
            if (!existing) {
                let slug = "unnamed";
                let title = "";
                if (entityType === "PRODUCT") {
                    const p = await ProductModel.findById(entityId).select("slug title").lean();
                    if (p) {
                        slug = p.slug;
                        title = p.title;
                    }
                } else if (entityType === "CATEGORY") {
                    const c = await CategoryModel.findById(entityId).select("slug name").lean();
                    if (c) {
                        slug = c.slug;
                        title = c.name;
                    }
                }

                return await EntitySeoModel.create({
                    entityType,
                    entityId,
                    entitySlug: slug,
                    entityTitle: title,
                    global: {},
                    locations: [{ ...data, locationKey: key }],
                });
            }

            const locIndex = (existing.locations || []).findIndex(
                (l: LocationSeoOverride) => l.locationKey.toLowerCase() === key
            );

            if (locIndex >= 0) {
                const updatedLocations = [...existing.locations];
                updatedLocations[locIndex] = {
                    ...updatedLocations[locIndex],
                    ...data,
                    locationKey: key,
                };
                existing.locations = updatedLocations;
            } else {
                existing.locations.push({
                    ...data,
                    locationKey: key,
                });
            }

            existing.updatedAt = new Date();
            await existing.save();
            return existing.toObject ? existing.toObject() : existing;
        }
    }
}

export const seoService = new SeoService();
