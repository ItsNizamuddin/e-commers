export type LocationType = "CITY" | "COUNTRY" | "ZONE";

export interface LocationResponse {
    id: string;
    code: string;               // Unique slug: "bangalore", "hyderabad", "us", "ae"
    name: string;               // "Bangalore", "Hyderabad", "United States"
    type: LocationType;
    stateOrRegion?: string;     // "Karnataka", "Telangana", "Maharashtra", etc.
    countryCode: string;        // "IN", "US", "AE", etc.
    currency: string;           // "INR", "USD", "AED", etc.
    isActive: boolean;
    deliveryEstimate: string;   // e.g. "Within 24 Hours", "3-5 Business Days"
    warehouseId?: string;
    minOrderValue?: number;
    shippingFlatRate?: number;
    postalCodes: string[];      // Serviced pincodes/zipcodes
    postalCodePrefixes: string[]; // e.g. ["560*"]
    defaultSeoTitleTemplate?: string;
    defaultSeoDescriptionTemplate?: string;
    deliveryHighlight?: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLocationInput {
    code: string;
    name: string;
    type: LocationType;
    stateOrRegion?: string;
    countryCode: string;
    currency: string;
    isActive?: boolean;
    deliveryEstimate?: string;
    warehouseId?: string;
    minOrderValue?: number;
    shippingFlatRate?: number;
    postalCodes?: string[];
    postalCodePrefixes?: string[];
    defaultSeoTitleTemplate?: string;
    defaultSeoDescriptionTemplate?: string;
    deliveryHighlight?: string;
    sortOrder?: number;
}

export interface UpdateLocationInput {
    name?: string;
    type?: LocationType;
    stateOrRegion?: string;
    countryCode?: string;
    currency?: string;
    isActive?: boolean;
    deliveryEstimate?: string;
    warehouseId?: string;
    minOrderValue?: number;
    shippingFlatRate?: number;
    postalCodes?: string[];
    postalCodePrefixes?: string[];
    defaultSeoTitleTemplate?: string;
    defaultSeoDescriptionTemplate?: string;
    deliveryHighlight?: string;
    sortOrder?: number;
}

export interface CheckPincodeResponse {
    serviceable: boolean;
    location?: {
        id: string;
        code: string;
        name: string;
        type: LocationType;
        countryCode: string;
        currency: string;
        deliveryEstimate: string;
        deliveryHighlight?: string;
    };
    message?: string;
}

export interface BulkLocationUploadSummary {
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    totalPincodesIndexed: number;
}

export interface BulkLocationUploadProcessedItem {
    code: string;
    name: string;
    pincodeCount: number;
    status: "CREATED" | "UPDATED" | "SKIPPED";
}

export interface BulkLocationUploadError {
    row: number;
    code?: string;
    message: string;
}

export interface BulkLocationUploadResult {
    summary: BulkLocationUploadSummary;
    processedLocations: BulkLocationUploadProcessedItem[];
    errors: BulkLocationUploadError[];
}
