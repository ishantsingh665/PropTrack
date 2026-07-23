# PropTrack — Dual Data Source & Snapshot Architecture

## Overview

PropTrack will have two distinct data sources:

| Source | Purpose | Editable | Indexed |
|--------|---------|----------|---------|
| **Live (Regular)** | Real-time property and company data managed directly from company pages | Yes, always | No |
| **Snapshots** | Point-in-time frozen copies of index-enabled companies and properties, organized by year | Yes, via snapshot editor | Only index-enabled records |

These two sources are completely separate. Live data changes never affect existing snapshots. Snapshots never affect live data.

---

## Database Design — Optimized Snapshot Storage

### The Problem with Naive Snapshots
Storing a full copy of every property in every snapshot means:
- 500 properties × 10 snapshots = 5,000 rows of duplicated data
- Any shared property data (name, address) is stored 10 times

### The Solution — Delta / Override Pattern

Store snapshots using a **base + override** approach:

1. Each snapshot stores a **reference** to the original property/company ID (not a full copy)
2. Only **fields that differ** from the live record are stored in the snapshot (the delta/override)
3. At read time, the system merges: `live record + snapshot overrides = snapshot view`

This means:
- If nothing was edited in the snapshot, storage cost = just the reference row (tiny)
- If the user edits a field inside the snapshot, only that field is stored
- Original live data is never touched

---

## Schema Changes

### New Models to Add to `schema.prisma`

```prisma
// Parent snapshot record — one per snapshot event
model Snapshot {
  id              String   @id @default(uuid())
  snapshotNumber  Int      @unique @default(autoincrement()) // assigned sequentially e.g. 1, 2, 3
  name            String   @unique                           // e.g. "December 2024"
  year            Int                                        // e.g. 2024
  createdAt       DateTime @default(now())
  createdBy       String                                     // userId
  creator         User     @relation(fields: [createdBy], references: [id])

  companySnapshots  SnapshotCompany[]
  propertySnapshots SnapshotProperty[]

  @@index([year])
  @@index([snapshotNumber])
}

// One record per company included in the snapshot
model SnapshotCompany {
  id              String   @id @default(uuid())
  snapshotId      String
  snapshot        Snapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  companyId       String                          // reference to original Company.id
  company         Company  @relation(fields: [companyId], references: [id])

  // Snapshot-specific unique ID for this company in this snapshot
  snapshotCompanyUid  String @unique @default(uuid())

  // Delta overrides — only non-null fields override the live value at read time
  nameOverride          String?
  isinOverride          String?
  statusOverride        String?
  reportPropertyCountOverride Int?
  notesOverride         String?

  // Computed totals captured at snapshot time (denormalized for performance)
  totalPropertyCount    Int      @default(0)
  totalGfaSqft          Float    @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([snapshotId, companyId])
  @@index([snapshotId])
  @@index([companyId])
}

// One record per property included in the snapshot
model SnapshotProperty {
  id              String   @id @default(uuid())
  snapshotId      String
  snapshot        Snapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  propertyId      String                          // reference to original Property.id
  property        Property @relation(fields: [propertyId], references: [id])
  snapshotCompanyId String                        // which company this property belongs to in the snapshot
  snapshotCompany SnapshotCompany @relation(fields: [snapshotCompanyId], references: [id])

  // Snapshot-specific unique ID for this property in this snapshot
  snapshotPropertyUid String @unique @default(uuid())

  // Delta overrides — only non-null fields override the live value at read time
  nameOverride          String?
  addressLine1Override  String?
  cityOverride          String?
  gfaSqftOverride       Float?
  propertyLevelOverride String?
  notesOverride         String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([snapshotId, propertyId])
  @@index([snapshotId])
  @@index([propertyId])
  @@index([snapshotCompanyId])
}
```

### Changes to Existing Models

```prisma
// Add to Company model:
model Company {
  // ... existing fields ...
  snapshotsEnabled    Boolean  @default(true)   // controls if this company is included in snapshots
  indexListed         Boolean  @default(false)  // controls if company appears in index
  isin                String?  @unique
  status              CompanyStatus @default(active)
  reportPropertyCount Int?

  // New relations
  snapshotCompanies   SnapshotCompany[]
  snapshots           Snapshot[]        // via SnapshotCompany
}

// Add to Property model:
model Property {
  // ... existing fields ...
  snapshotProperties  SnapshotProperty[]
}

// New enum
enum CompanyStatus {
  active
  inactive
}
```

---

## Backend — API Endpoints

### Snapshot Endpoints

#### `POST /api/snapshots`
Create a new snapshot.

**Request body:**
```json
{
  "name": "December 2024",
  "year": 2024
}
```

**Logic:**
1. Check if `name` already exists (case-insensitive) → return HTTP 409 if duplicate
2. Auto-assign next `snapshotNumber` (MAX(snapshotNumber) + 1)
3. Query all companies where `snapshotsEnabled = true` AND `indexListed = true` AND `deletedAt = null`
4. For each company, query all active properties (`PropertyCompany.status = 'active'`, `Property.deletedAt = null`)
5. Create one `Snapshot` record
6. Create one `SnapshotCompany` record per company with computed `totalPropertyCount` and `totalGfaSqft`
7. Create one `SnapshotProperty` record per property — all override fields set to `null` (no delta yet)
8. Log to `AuditLog`: action `CREATE`, entity `Snapshot`

**Response:**
```json
{
  "id": "uuid",
  "snapshotNumber": 3,
  "name": "December 2024",
  "year": 2024,
  "companiesIncluded": 12,
  "propertiesIncluded": 87,
  "totalGfaSqft": 450000,
  "createdAt": "2024-12-01T00:00:00Z"
}
```

---

#### `GET /api/snapshots`
List all snapshots.

**Query params:** `?year=2024` (optional filter by year)

**Response:** Array of snapshots sorted by `snapshotNumber` descending, each including:
- `id`, `snapshotNumber`, `name`, `year`, `createdAt`, `createdBy`
- `companiesIncluded` (count), `propertiesIncluded` (count), `totalGfaSqft` (sum)

---

#### `GET /api/snapshots/:id`
Get full snapshot detail with all companies and properties.

**Logic:** For each `SnapshotCompany`, merge live company data with overrides:
```
resolvedName = snapshotCompany.nameOverride ?? company.name
resolvedIsin = snapshotCompany.isinOverride ?? company.isin
// etc.
```
Return the merged/resolved view, not raw data.

**Response includes:**
- Snapshot metadata (number, name, year, created by, created at)
- Array of companies, each with:
  - `snapshotCompanyUid` (snapshot-specific ID)
  - `originalCompanyId` (live ID)
  - Resolved company fields (merged live + override)
  - Array of properties, each with:
    - `snapshotPropertyUid` (snapshot-specific ID)
    - `originalPropertyId` (live ID)
    - Resolved property fields (merged live + override)

---

#### `PATCH /api/snapshots/:snapshotId/companies/:snapshotCompanyId`
Edit a company's data within a snapshot (stores delta only).

**Request body:** Only include fields the user changed:
```json
{
  "name": "Updated Company Name",
  "reportPropertyCount": 45
}
```

**Logic:**
- Map each field to its override column (e.g. `name` → `nameOverride`)
- Update only those override columns in `SnapshotCompany`
- Log to `AuditLog`: action `UPDATE`, entity `SnapshotCompany`, with before/after diff

---

#### `PATCH /api/snapshots/:snapshotId/properties/:snapshotPropertyId`
Edit a property's data within a snapshot (stores delta only).

Same pattern as company update above — only override fields are stored.

---

#### `GET /api/snapshots/years`
Returns list of years that have snapshots.
```json
{ "years": [2023, 2024, 2025] }
```

---

## Frontend — Snapshots Page

### Sidebar
Add **Snapshots** to the sidebar navigation:
- Icon: `Camera` from `lucide-react`
- Route: `/snapshots`
- Position: between `Duplicates` and `Bulk Import`

---

### `/snapshots` — Snapshots List Page

**Layout:**
- Page header: "Snapshots" with subtitle "Point-in-time index captures"
- Top-right: **Create Snapshot** button
- Year filter tabs: `All | 2023 | 2024 | 2025 | ...` (populated from `GET /api/snapshots/years`)

**Table columns:**
| # | Name | Year | Companies | Properties | Total GFA | Created By | Created At | Actions |
|---|------|------|-----------|------------|-----------|------------|------------|---------|

- **#** column shows `snapshotNumber` (e.g. `#001`, `#002` — zero-padded to 3 digits)
- Clicking a row navigates to `/snapshots/:id`

---

### Create Snapshot Modal

Triggered by **Create Snapshot** button. Modal contains:

1. **Snapshot Name** input — pre-filled with `"${currentMonthName} ${currentYear}"` (e.g. `"July 2026"`), fully editable
2. **Year** input — pre-filled with current year, editable
3. Info text: *"This snapshot will capture all index-enabled companies and their active properties."*
4. **Preview counts** (loaded on modal open via `GET /api/snapshots/preview`):
   - Companies to be included: **12**
   - Properties to be included: **87**
   - Total GFA: **450,000 sqft**
5. Inline error if name already exists: *"A snapshot named 'July 2026' already exists. Please choose a different name."*
6. Buttons: **Cancel** | **Create Snapshot**

After successful creation, show a **completion summary modal**:
- Snapshot #003 — "July 2026" created successfully
- Companies captured: 12
- Properties captured: 87
- Total GFA: 450,000 sqft
- Button: **View Snapshot**

---

### `/snapshots/:id` — Snapshot Detail Page

**Header section:**
- Snapshot number badge: `#003`
- Snapshot name: `"July 2026"`
- Year, Created by, Created at
- Total stats: Companies | Properties | Total GFA

**Companies list:**
- Table showing all companies in this snapshot
- Each row: `snapshotCompanyUid` (truncated, copyable) | Original Company ID (truncated, copyable) | Name | ISIN | Status | Properties | GFA | Edit button
- Clicking a company row expands it to show its properties

**Properties sub-table (inside expanded company):**
- `snapshotPropertyUid` (truncated, copyable) | Original Property ID (truncated, copyable) | Name | Address | GFA | Edit button

**Edit behavior:**
- Clicking **Edit** on a company or property opens an inline edit form showing all editable fields
- Fields show current resolved value (live + override merged)
- On save, only changed fields are sent to the PATCH endpoint
- Edited fields show a subtle **"Modified"** badge so user knows which fields differ from live data
- User can **Reset to Live** on any field to clear the override (set override back to null)

---

## Data Source Selector (Future — Optional)

On the Properties and Companies list pages, add a **Data Source** toggle in the header:
- **Live Data** (default) — shows current live records
- **Snapshot: [name]** — shows resolved snapshot view for a selected snapshot

When Snapshot mode is active:
- A banner shows: *"Viewing Snapshot #003 — July 2026. Changes here only affect this snapshot."*
- All edits route to the snapshot PATCH endpoints, not the live endpoints
- A **Back to Live Data** button is always visible

---

## Unique ID Display Rules

### Live Data
- `Company.id` — display as `Company ID` on company detail page with copy button
- `Property.id` — display as `Property ID` on property detail page with copy button
- Both truncated to first 8 chars in list views with full UUID on hover tooltip

### Snapshot Data
Each entity in a snapshot has TWO IDs displayed:
- **Snapshot UID** — `snapshotCompanyUid` or `snapshotPropertyUid` — unique to this snapshot instance
- **Original ID** — `companyId` or `propertyId` — links back to live record

Display format on snapshot detail page:
```
Snapshot UID:  a1b2c3d4-... [copy]
Original ID:   f9e8d7c6-... [copy] [View Live →]
```

"View Live →" navigates to the live company or property detail page.

---

## Audit Log Requirements

Every action must log to `AuditLog`:

| Action | Entity | What to log |
|--------|--------|-------------|
| Create snapshot | `Snapshot` | name, year, snapshotNumber, companiesIncluded, propertiesIncluded |
| Edit company in snapshot | `SnapshotCompany` | before: resolved values, after: new resolved values, snapshotId |
| Edit property in snapshot | `SnapshotProperty` | before: resolved values, after: new resolved values, snapshotId |

---

## Implementation Order (Recommended)

```
1. Schema changes  → add Snapshot, SnapshotCompany, SnapshotProperty models + Company fields
2. Migration       → npx prisma migrate dev --name snapshot_architecture
3. Backend         → POST /api/snapshots (create)
4. Backend         → GET /api/snapshots + GET /api/snapshots/years (list)
5. Backend         → GET /api/snapshots/:id (detail with merge logic)
6. Backend         → PATCH snapshot company + property (delta update)
7. Frontend        → Snapshots sidebar link + /snapshots list page
8. Frontend        → Create Snapshot modal with preview
9. Frontend        → /snapshots/:id detail page with inline editing
10. Frontend       → UUID display on live Company + Property detail pages
```
