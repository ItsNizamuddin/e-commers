import type { ApiClient } from "../client";
import type { SearchQueryInput, SearchResponse } from "@ecommers/types";

export class SearchClient {
    constructor(private readonly client: ApiClient) {}

    async catalog(query: SearchQueryInput): Promise<SearchResponse> {
        return this.client.get<SearchResponse>("/search", { params: query });
    }
}
