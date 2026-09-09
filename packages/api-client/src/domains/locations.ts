import type { ApiClient } from "../client";
import type {
    LocationResponse,
    CreateLocationInput,
    UpdateLocationInput,
    CheckPincodeResponse,
    BulkLocationUploadResult,
    LocationType,
} from "@ecommers/types";

export class LocationsClient {
    constructor(private readonly client: ApiClient) {}

    async list(params?: { type?: LocationType; countryCode?: string; search?: string }): Promise<LocationResponse[]> {
        return this.client.get<LocationResponse[]>("/locations", { params });
    }

    async adminList(params?: { type?: LocationType; countryCode?: string; isActive?: boolean; search?: string }): Promise<LocationResponse[]> {
        return this.client.get<LocationResponse[]>("/admin/locations", { params });
    }

    async get(idOrCode: string): Promise<LocationResponse> {
        return this.client.get<LocationResponse>(`/locations/${idOrCode}`);
    }

    async checkPincode(pincode: string, countryCode?: string): Promise<CheckPincodeResponse> {
        return this.client.post<CheckPincodeResponse>("/locations/check-pincode", { pincode, countryCode });
    }

    async create(body: CreateLocationInput): Promise<LocationResponse> {
        return this.client.post<LocationResponse>("/admin/locations", body);
    }

    async update(id: string, body: UpdateLocationInput): Promise<LocationResponse> {
        return this.client.patch<LocationResponse>(`/admin/locations/${id}`, body);
    }

    async delete(id: string): Promise<{ message: string }> {
        return this.client.delete<{ message: string }>(`/admin/locations/${id}`);
    }

    async bulkUpload(csvContent: string, mode: "UPSERT" | "REPLACE" = "UPSERT"): Promise<BulkLocationUploadResult> {
        return this.client.post<BulkLocationUploadResult>("/admin/locations/bulk-upload", { csvContent, mode });
    }
}
