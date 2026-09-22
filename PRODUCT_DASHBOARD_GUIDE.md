# E-Commerce & Food Manufacturing Admin Dashboard Guide

> **Production-Grade Architecture & Operational Manual**  
> Covers Product Catalog Master, Culinary Recipe Formulation, Intermediate Bulk Lots, Packaging Specifications & Secondary BOM, Integer Minor Unit Economics, and Two-Way Rapid Recall Traceability.

---

## 1. Quick Access & Credentials

| Environment | Portal URL | API Base URL | Default SuperAdmin Email | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development** | [`http://localhost:3001`](http://localhost:3001) | `http://localhost:5001/api/v1` | `superadmin@gmail.com` | `admin@123` |

To log in:
1. Open [`http://localhost:3001/login`](http://localhost:3001/login).
2. Enter the credentials above and click **Sign In**.
3. You will be redirected to the administrative workspace.

---

## 2. Architecture Overview: Decoupled Manufacturing Pipeline

The system decouples **food formulation**, **bulk cooking**, **packaging**, and **catalog pricing** into separate, connected operational stages:

```
[ Agricultural Raw Materials ] (Vendor / Own Farm Lots, FEFO Tracking)
              ↓
[ Standalone Master Formula ] (Pure culinary recipe in kg/g/L/mL — No SKUs or Packaging)
              ↓
[ Bulk Production Run ] (Cooking phase — Allocates lots via FEFO)
              ↓
[ Intermediate Bulk Lot ] (Stored with sourceType: MANUFACTURED — Finished inventory untouched)
              ↓
[ Packaging Specification & BOM ] (Bulk food required + Glass jars, lids, labels, labor)
              ↓
[ Packaging Run / Stock Repackaging ] (Atomic transformation — Expiry date inherited)
              ↓
[ Finished Product Variant ] (Sellable retail SKU e.g. 500g Jar @ ₹149.00)
              ↓
[ Finished Goods Inventory ] (Deposited into warehouse stock on-hand with lot traceability)
```

---

## 3. Dashboard Functional Tour & UI Modules

### Module 1: Packaging & Pricing Matrix Hub
* **Dashboard Navigation**: Sidebar → **COMMERCE & CATALOG** → **Products** → **Packaging & Pricing**
* **Direct Route**: [`http://localhost:3001/products/packaging-matrix`](http://localhost:3001/products/packaging-matrix)
* **Also Accessible From**:
  * Any row in the **All Products** table via the **"Matrix"** action button.
  * The top toolbar of the product edit page (`/products/[id]`).

#### Key Features & UI Elements:
1. **Master Formula Linkage**: Displays the linked culinary recipe and its nominal batch yield (e.g., 10 kg).
2. **Pack Size Matrix**: Configure multiple retail packaging variants (e.g. 250 g, 500 g, 1 kg) for a single core food recipe.
3. **Secondary Packaging BOM Builder**: Assign specific packaging materials (glass jars, aluminum caps, shrink wraps, labels) and overhead/labor allowances per pack size.
4. **Integer Minor Unit Economics (Paise Accuracy)**:
   * **Bulk Food Cost**: Exact cost of bulk food consumed per pack.
   * **Packaging BOM Cost**: Sum of jars, lids, and label costs.
   * **Total COGS**: True cost of goods manufactured.
   * **Target Markup %**: Configurable markup multiplier.
   * **Suggested Selling Price**: Calculated retail price.
   * **Live Gross Margin % Badges**:
     * 🟢 **Green (>= 35%)**: Healthy profitable margin.
     * 🟡 **Amber (20% – 34.9%)**: Moderate margin warning.
     * 🔴 **Red (< 20%)**: Low margin / loss-making alert.
5. **Atomic Catalog Sync**: The **"Sync to Product Variants & Packaging Specs"** button updates variant pricing and packaging specifications in the product catalog atomically without fabricating fake warehouse stock balances.

---

### Module 2: Products & Catalog Master (R&D Draft Mode)
* **Dashboard Navigation**: Sidebar → **COMMERCE & CATALOG** → **Products** → **All Products**
* **Direct Route**: [`http://localhost:3001/products`](http://localhost:3001/products)

#### Key Features & UI Elements:
1. **Zero-Variant DRAFT Products**: You can create products in `DRAFT` status with `variants: []` while food R&D formulation is in progress.
2. **Strict Publishing Guards**: The system prevents publishing a product if it has 0 variants or if all active variants have a base selling price of ₹0.
3. **Category Tree & Filters**: Filter products by subcategories, brand, price tier, and publication status (`DRAFT`, `PUBLISHED`, `ARCHIVED`).

---

### Module 3: Standalone Culinary Master Formulas (Pure R&D Mode)
* **Dashboard Navigation**: Sidebar → **MANUFACTURING & RECIPES** → **Recipes (BOM)**
* **Direct Route**: [`http://localhost:3001/recipes`](http://localhost:3001/recipes)
* **Create New Recipe**: [`http://localhost:3001/recipes/new`](http://localhost:3001/recipes/new)

#### Key Features & UI Elements:
1. **Decoupled Recipe Creation**: Formulate recipes (e.g., "Avakaya Mango Pickle Master Formula v1", batch yield: 10 kg) without selecting an e-commerce product or SKU.
2. **Pure Culinary BOM**: Add agricultural ingredients (raw mango, red chili powder, mustard powder, sesame oil, salt) with ingredient loss % allowances.
3. **Unique Versioning**: Enforces strict unique constraints on `(code, version)`.
4. **Auto-Scaling Engine**: Scale formulas dynamically across different batch targets.

---

### Module 4: Bulk Production Runs (Cooking Phase)
* **Dashboard Navigation**: Sidebar → **MANUFACTURING & RECIPES** → **Production Batches**
* **Direct Route**: [`http://localhost:3001/manufacturing`](http://localhost:3001/manufacturing)
* **Record Production Run**: [`http://localhost:3001/manufacturing/new`](http://localhost:3001/manufacturing/new)

#### Key Features & UI Elements:
1. **FEFO Lot Allocation Preview**: Automatically selects the nearest-expiry raw material lots to prevent spoilage.
2. **Run Feasibility Check**: Validates whether warehouse stock has sufficient raw materials before execution.
3. **Intermediate Bulk Lot Deposition**:
   * Producing a bulk formula yields an **Intermediate Bulk Lot** (`RawMaterialLot` with `sourceType: "MANUFACTURED"`).
   * **Finished goods inventory is untouched**: It does not create retail sellable units until the packaging phase.
4. **Audited Batch Reversals**: Full and controlled partial reversals restore raw material lots and debit bulk lots with full audit logs.

---

### Module 5: Intermediate Bulk Lots & Quality Statuses
* **Dashboard Navigation**: Sidebar → **MANUFACTURING & RECIPES** → **Raw Materials** → **Active Lots & FEFO**
* **Direct Route**: [`http://localhost:3001/raw-materials/lots`](http://localhost:3001/raw-materials/lots)

#### Key Features & UI Elements:
1. **Bulk Lots Display**: Manufactured intermediate bulk lots appear with `Source: MANUFACTURED`.
2. **Quality Status Tracking**:
   * `AVAILABLE`: Approved for packaging and consumption.
   * `QUARANTINED`: Held for laboratory/QA food safety clearance.
   * `REJECTED`: Failed quality parameters; blocked from packaging.
   * `EXPIRED`: Passed expiry date; automatically blocked.
   * `DEPLETED`: Completely consumed.
3. **Cost per Unit**: Shows realized cost per kg/L based on actual ingredient costs consumed.

---

### Module 6: Secondary BOM Stock Repackaging (Packaging Runs)
* **Dashboard Navigation**: Sidebar → **MANUFACTURING & RECIPES** → **Stock Repackaging**
* **Direct Route**: [`http://localhost:3001/manufacturing/repackaging`](http://localhost:3001/manufacturing/repackaging)
* **Execute New Run**: [`http://localhost:3001/manufacturing/repackaging/new`](http://localhost:3001/manufacturing/repackaging/new)

#### Key Features & UI Elements:
1. **Source Bulk Selection**: Choose the bulk material and specific bulk lot to draw from.
2. **Target Retail SKU**: Select the sellable product variant (e.g. 500g Jar).
3. **Live Transformation Simulator**:
   * Displays required bulk quantity (e.g., 10 units × 500 g = 5.0 kg).
   * Verifies lot balance sufficiency in real-time.
   * Calculates bulk cost, packaging material cost, and realized cost per jar.
4. **Food Safety Quality Gates**:
   * Automatically blocks packaging if the bulk lot is expired (`LOT_EXPIRED`).
   * Automatically blocks packaging if the bulk lot is in `QUARANTINED` or `REJECTED` status (`LOT_NOT_APPROVED`).
5. **Stock Deposition & Expiry Inheritance**:
   * Deducts bulk food from the bulk lot.
   * Consumes packaging materials (jars, lids, labels).
   * Deposits finished units into retail warehouse inventory (`/inventory`).
   * Inherits the expiry date directly from the intermediate bulk lot.

---

### Module 7: Two-Way Rapid Recall & Lot Genealogy Traceability
* **Dashboard Navigation**: Sidebar → **MANUFACTURING & RECIPES** → **Lot Traceability & Recall**
* **Direct Route**: [`http://localhost:3001/manufacturing/traceability`](http://localhost:3001/manufacturing/traceability)

#### Key Features & UI Elements:
1. **Universal Identifier Search**: Search by any **Raw Material Lot #**, **Bulk Cooking Batch #**, or **Retail Packaging Run #**.
2. **Entity Summary Header**: Displays entity type, code, production date, expiry date, and current QA status badge.
3. **Backward Trace (Farm-to-Fork Root Cause Analysis)**:
   * **Stage 1 (Packaging)**: Repackaging run number, variant title, units produced, and packaging date.
   * **Stage 2 (Cooking)**: Bulk cooking batch number, master formula name, version, and yield.
   * **Stage 3 (Agricultural Ingredients)**: Full breakdown of raw ingredients consumed, lot numbers, quantities, supplier names, farm/plot details, and lot expiry dates.
   * **Stage 4 (Packaging BOM)**: Secondary packaging materials consumed (jars, caps, labels).
4. **Forward Recall Trace (Downstream Impact Assessment)**:
   * When an ingredient lot is compromised (e.g. contaminated chili powder), traces forward to:
     * All bulk cooking batches produced with that lot.
     * All retail packaging runs subject to immediate recall.
     * Warehouse stock locations currently holding affected finished goods.

---

## 4. End-to-End Operational Walkthrough (Recommended First Test)

To test the entire pipeline in the dashboard, follow this 5-step sequence:

### Step 1: Create a Standalone Master Recipe
1. Go to **Manufacturing & Recipes** → **Recipes (BOM)** → Click **"+ Create Recipe"**.
2. Enter Code: `REC-AVAKAYA-10K`, Name: `Avakaya Pickle Master Formula`, Batch Yield: `10 kg`.
3. Add raw ingredients: Raw Mango (6 kg), Chili Powder (1.5 kg), Mustard Powder (1 kg), Salt (0.5 kg), Sesame Oil (1 kg).
4. Save the recipe.

### Step 2: Configure Packaging & Pricing Matrix
1. Go to **Commerce & Catalog** → **Products** → **Packaging & Pricing**.
2. Select your retail product (or create a draft product first).
3. Link the master formula created in Step 1.
4. Add variants:
   * **250g Jar**: Unit Size `250 g`, select 250g Glass Jar & Lid BOM.
   * **500g Jar**: Unit Size `500 g`, select 500g Glass Jar & Lid BOM.
5. Review the calculated COGS, suggested price, and gross margin % badge.
6. Click **"Sync to Product Variants & Packaging Specs"**.

### Step 3: Cook Bulk Food (Bulk Production Run)
1. Go to **Manufacturing & Recipes** → **Production Batches** → Click **"+ Record Production Run"**.
2. Select Recipe: `REC-AVAKAYA-10K`.
3. Execute the run.
4. Check **Raw Materials** → **Active Lots & FEFO**: notice a new intermediate Bulk Lot created with `Source: MANUFACTURED` and 10 kg available.
5. Check **Commerce & Catalog** → **Inventory**: retail store stock is still 0 (no fake inventory created).

### Step 4: Package into Retail Jars (Packaging Run)
1. Go to **Manufacturing & Recipes** → **Stock Repackaging** → Click **"+ New Repackaging Run"**.
2. Select the manufactured bulk lot from Step 3.
3. Select Target Variant: `500g Jar`.
4. Enter Units: `10` (consumes 5.0 kg bulk pickle + 10 jars/lids).
5. Click **"Execute Repackaging Run"**.
6. Check **Active Lots**: bulk lot balance decreases from 10 kg to 5 kg.
7. Check **Inventory**: retail 500g Jar variant now shows 10 units in warehouse stock with inherited expiry.

### Step 5: Verify Traceability & Rapid Recall
1. Go to **Manufacturing & Recipes** → **Lot Traceability & Recall**.
2. Paste either the packaging run number, the bulk batch number, or any ingredient lot number.
3. Click **"Trace Genealogy"**.
4. View the complete multi-tier farm-to-fork chain and forward recall impact table.
