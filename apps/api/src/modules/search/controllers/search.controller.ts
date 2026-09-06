import type { Request, Response } from "express";
import { searchService, SearchService } from "../services/search.service.js";
import type { SearchQuerySchema } from "../validation/search.validation.js";

export class SearchController {
    constructor(private readonly svc: SearchService = searchService) {}

    search = async (req: Request, res: Response): Promise<void> => {
        const query = req.query as unknown as SearchQuerySchema;

        const result = await this.svc.searchCatalog(query);

        res.status(200).json({
            success: true,
            data: result,
            items: result.items,
            pagination: result.pagination,
            facets: result.facets,
        });
    };
}

export const searchController = new SearchController();
