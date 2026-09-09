# Serviceable Locations, Bulk Ingestion & Regional Architecture

This document defines the architectural specification for managing **Serviceable Locations**, **Delivery Zones**, **Bulk Pincode Ingestion**, and **Multi-Regional/Local SEO** across Ecommers.

---

## 1. Executive Summary & Core Rationale

In a realistic food, FMCG, and multi-category e-commerce platform, products have varying degrees of serviceability:
- **Perishable / Hot / Short Shelf-Life Products** (e.g., Dum Biryani, Fresh Cream Sweets): Only deliverable in local metropolitan clusters (**Bangalore**, **Hyderabad**, **Mumbai**) via local dark stores or central cloud kitchens within 2–24 hours.
- **Shelf-Stable / Ambient Packaged Products** (e.g., Avissa Ginjala Laddu, Pickles, Dry Fruit Sweets): Deliverable nationwide across India and exported globally to international markets (**United States**, **UAE**, **UK**).

To support this cleanly without manual data fragmentation or SEO penalties, locations are modeled as a **centralized, first-class system entity** rather than ad-hoc free text.

```
                               Platform Locations Registry
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               ▼                                                           ▼
     City Locations (Domestic)                                 Country Markets (International)
     • Code: "bangalore"                                       • Code: "us"
     • Type: CITY                                              • Type: COUNTRY
     • Currency: INR (₹)                                       • Currency: USD ($)
     • Pincodes: 560001 - 560100 (Bulk Uploaded)               • Scope: Nationwide (US Zipcodes)
     • Delivery: "Same-Day / Next-Day"                         • Delivery: "3–5 Business Days (Air Express)"
     • URL Pattern: /products/{slug}/bangalore                 • URL Pattern: /us/products/{slug}
```

---

## 2. Data Models & Schemas

### 2.1 The `Location` Entity (`LocationModel`)

Stored in the `locations` collection in MongoDB:

```ts
export type LocationType = "CITY" | "COUNTRY" | "ZONE";

export interface ILocation {
  _id: string;
  code: string;               // Unique URL slug: "bangalore", "hyderabad", "us", "ae"
  name: string;               // Display name: "Bangalore", "United States"
  type: LocationType;         // CITY for domestic hubs, COUNTRY for cross-border
  countryCode: string;        // ISO 2-letter: "IN", "US", "AE", "GB"
  currency: string;           // "INR", "USD", "AED", "GBP"
  isActive: boolean;          // Instant kill-switch for temporary operational shutdowns

  // Fulfillment & Operations
  deliveryEstimate: string;   // e.g. "Same-Day / Next-Day (within 24h)"
  warehouseId?: string;       // Default fulfillment hub/warehouse ID
  minOrderValue?: number;     // Minimum order value for this zone
  shippingFlatRate?: number;  // Base delivery fee

  // Granular Serviceability (Postal / Pin Codes)
  postalCodes: string[];      // Array of serviced pincodes: ["560001", "560038", ...]
  postalCodePrefixes: string[]; // Wildcard prefixes: ["560*", "562*"] for fast bulk matching

  // SEO Defaults (Inherited by products unless overridden)
  defaultSeoTitleTemplate?: string;       // "Buy {title} in {location} | Fresh Dispatch"
  defaultSeoDescriptionTemplate?: string; // "Order authentic {title} in {location}. 100% fresh."
  deliveryHighlight?: string;             // "Dispatched fresh daily from our Bangalore kitchen"

  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### MongoDB Indexes
```ts
LocationSchema.index({ code: 1 }, { unique: true });
LocationSchema.index({ type: 1, isActive: 1 });
LocationSchema.index({ postalCodes: 1 });
LocationSchema.index({ countryCode: 1 });
```

---

### 2.2 Product-Level Serviceability Linkage (`ProductModel`)

Each product explicitly specifies where it can be ordered:

```ts
// Added to ProductSchema
serviceableLocations: {
  type: [String],
  default: ["ALL"], // "ALL" means all active locations, or array of location codes e.g. ["bangalore", "hyderabad"]
  index: true,
},

// Embedded Location-Specific SEO
seo: {
  metaTitle: String,
  metaDescription: String,
  locations: [
    {
      locationKey: { type: String, required: true }, // Matches Location.code
      locationType: { type: String, enum: ["CITY", "COUNTRY"] },
      locationName: String,
      currency: String,
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      deliveryHighlight: String,
      canonicalUrl: String,
      isIndexed: { type: Boolean, default: true }
    }
  ]
}
```

---

## 3. Bulk Upload Specification for Locations & Pincodes

In real-world logistics, metropolitan areas have hundreds of pin codes, and multi-city operations require uploading thousands of zip codes at once. The platform provides a high-throughput **Bulk Ingestion Pipeline**.

### 3.1 Supported Ingestion Formats
1. **CSV Upload** (Comma-Separated Values)
2. **JSON Bulk Payload**

### 3.2 CSV File Structure

```csv
code,name,type,countryCode,currency,deliveryEstimate,postalCodes,isActive
bangalore,Bangalore,CITY,IN,INR,"Within 24 Hours","560001;560002;560038;560100;560102;560103",true
hyderabad,Hyderabad,CITY,IN,INR,"Same Day / 24 Hours","500001;500002;500034;500081;500082",true
mumbai,Mumbai,CITY,IN,INR,"Next Day Delivery","400001;400050;400051;400099",true
us,United States,COUNTRY,US,USD,"3-5 Business Days","NATIONWIDE",true
ae,United Arab Emirates,COUNTRY,AE,AED,"2-3 Business Days","NATIONWIDE",true
```

> [!TIP]
> **Pincode Formatting Options in Bulk CSV**:
> - **Semicolon / Comma List**: `560001;560002;560038`
> - **Range Notation**: `560001-560050` (automatically expands to all 50 sequential pincodes during ingestion)
> - **Wildcard Prefix**: `560*` (matches all pincodes starting with 560)
> - **Nationwide**: `"NATIONWIDE"` or `"*"` (applies to entire country)

---

### 3.3 Bulk Ingestion Workflow & Validation

```
[ Admin uploads CSV file ]
          │
          ▼
[ CSV Stream Parser (csv-parse) ]
          │
          ▼
[ Row Validation (Zod Schema) ] ──▶ (Collects row-level syntax & format errors)
          │
          ▼
[ Pincode Normalization ] ───────▶ (Expands ranges e.g. 560001-560010, removes duplicates)
          │
          ▼
[ MongoDB BulkWrite (Upsert) ] ──▶ (Atomic bulkWrite with ordered: false for maximum speed)
          │
          ▼
[ Ingestion Audit Report ] ──────▶ Returns: { total: 5, inserted: 2, updated: 3, errors: [] }
```

#### API Endpoint Definition:
```http
POST /api/v1/admin/locations/bulk-upload
Content-Type: multipart/form-data
Authorization: Bearer <ADMIN_TOKEN>

Form Data:
file: locations_pincodes.csv
mode: "UPSERT" | "REPLACE"
```

#### Response Envelope:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRows": 5,
      "created": 2,
      "updated": 3,
      "failed": 0,
      "totalPincodesIndexed": 1240
    },
    "processedLocations": [
      { "code": "bangalore", "name": "Bangalore", "pincodeCount": 420 },
      { "code": "hyderabad", "name": "Hyderabad", "pincodeCount": 380 }
    ],
    "errors": []
  }
}
```

---

## 4. URL & SEO Routing Hierarchy

By combining the **Skilldeck city-suffix pattern** with the **Country root-prefix pattern**, the URL structure maps directly to customer search intent:

| Location Type | URL Structure | Example URL | Primary Intent Targeted |
| :--- | :--- | :--- | :--- |
| **Global / Default** | `/products/{slug}` | `/products/avissa-ginjala-laddu` | Generic brand & product search |
| **City (Domestic)** | `/products/{slug}/{city}` | `/products/avissa-ginjala-laddu/bangalore` | *"Avissa Laddu delivery Bangalore"* |
| **City (Domestic)** | `/products/{slug}/{city}` | `/products/avissa-ginjala-laddu/hyderabad` | *"Avissa Laddu Hyderabad online"* |
| **Country (Cross-border)** | `/{country}/products/{slug}` | `/us/products/avissa-ginjala-laddu` | *"Indian sweets online USA"* |
| **Country (Cross-border)** | `/{country}/products/{slug}` | `/ae/products/avissa-ginjala-laddu` | *"Avissa Laddu UAE Dubai"* |

### 4.1 Schema.org Microdata Output
On city pages (`/products/avissa-ginjala-laddu/bangalore`):
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Avissa Ginjala Laddu",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "price": "628.95",
    "availability": "https://schema.org/InStock",
    "areaServed": {
      "@type": "City",
      "name": "Bangalore"
    }
  }
}
```

---

## 5. Admin Dashboard UI Specifications

### 5.1 Serviceable Locations Manager (`/locations`)
- **Table View**: Shows Location Name, Code, Type (`City` / `Country`), Currency, Number of Serviced Pincodes, Active Switch.
- **Top Actions**:
  - `+ Add Single Location`: Opens side drawer to manually add a city or country.
  - `Bulk Upload CSV`: Opens the Bulk Ingestion Modal.
  - `Download Template`: Downloads pre-formatted sample CSV file.

### 5.2 Bulk Upload Modal
- **Drag-and-Drop Area**: Accepts `.csv` or `.xlsx` files.
- **Mode Toggle**:
  - *Merge / Upsert*: Adds new pincodes and updates existing locations without deleting existing records.
  - *Full Replace*: Replaces existing postal codes with the uploaded file.
- **Live Preview & Validation**: Previews the first 5 rows and flags formatting errors before submitting.

### 5.3 Product Creation Form Integration
Inside the Product Form (`/products/new` and `/products/[id]`):
1. **Serviceability Section**:
   ```
   Serviceable Locations:
   ( ) All Locations (Worldwide)
   (•) Custom Delivery Locations:
       [✓] Bangalore    [✓] Hyderabad    [✓] Mumbai    [✓] United States    [✓] UAE
   ```
2. **Dynamic SEO Tab Generation**:
   Checking `Bangalore` and `United States` instantly reveals the corresponding location tabs in the **Generic SEO Card**, allowing custom local meta titles, descriptions, and delivery highlights.

---

## 6. Customer Storefront Lifecycle

1. **Header Location Selector (Amazon / Blinkit Model)**:
   - Header badge: `📍 Deliver to: Bangalore 560038 [Change]`
   - Customer clicks `Change`, enters pincode `560038`.
   - Client calls `POST /api/v1/locations/check-pincode { pincode: "560038" }`.
   - API returns: `{ serviceable: true, city: "bangalore", name: "Bangalore", deliveryEstimate: "Within 24 Hours" }`.
   - Redux store updates active location context.

2. **PDP Real-Time Pincode Validator**:
   - Product page features a quick widget: `[ Enter Pincode ] [ Check ]`
   - Shows real-time badge: `✓ Deliverable to Bangalore (Indiranagar) by Tomorrow`.

3. **Cart & Checkout Enforcement**:
   - During checkout, if a user enters a shipping address with a pincode not covered by that product's `serviceableLocations`, the checkout pipeline flags a localized error:  
     `"Avissa Ginjala Laddu is not deliverable to pincode 110001. Please remove it or change address."`

---

## 7. Implementation Roadmap Summary

1. **API Module (`apps/api/src/modules/locations`)**:
   - Schemas: `LocationModel`, `LocationSchema`.
   - Routes: `GET /api/v1/locations` (public), `POST /api/v1/locations/check-pincode` (public), `POST /api/v1/admin/locations/bulk-upload` (admin), CRUD endpoints.
   - Initial Seed Data: Bangalore, Hyderabad, Mumbai, USA, UAE with standard pincodes.
2. **Product Model Enhancements**:
   - Add `serviceableLocations: string[]` to `ProductModel` & DTOs.
3. **Admin Dashboard (`apps/admin`)**:
   - Create `/locations` route with table, drawer, and CSV bulk upload modal.
   - Integrate location checkboxes into `ProductForm` (`new/page.tsx` and `[id]/page.tsx`).
