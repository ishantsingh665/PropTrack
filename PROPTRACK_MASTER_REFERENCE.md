# PropTrack — Complete Project Reference
> Single source of truth for the entire build.
> Database schema is already live in PostgreSQL (19 tables created ✅).
> Start every new chat session by sharing this document.

---

## 1. What Is PropTrack

A self-hosted, full-stack property management system for tracking 500k+ properties globally across multiple companies. Core features: multi-company ownership, property transfers/swaps, duplicate detection, bulk import, scrape source tracking, GFA tracking, monthly snapshots, audit logging, and company research notes.

---

## 2. Tech Stack (Final, Locked)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Plain utility classes, no component framework |
| Backend | Node.js + Fastify + TypeScript | Faster than Express |
| Database | PostgreSQL | Live DB, managed via pgAdmin — already set up |
| ORM | Prisma | Migrations + typed client |
| Auth | JWT + bcrypt | Self-hosted, no vendor |
| File Storage | MinIO | Self-hosted S3-compatible, Docker container |
| Geocoding | Nominatim | Self-hosted OpenStreetMap, Docker container |
| CSV Import | csv-parse + Multer | |
| Deployment | Docker Compose | Single server, self-hosted |

---

## 3. Docker Services (5 total)

```
postgres       — database (already live externally via pgAdmin)
backend        — Fastify API
frontend       — React + Vite
minio          — file storage (PDF, Excel, images for company notes)
nominatim      — geocoding engine (OpenStreetMap)
```

> Note: Since PostgreSQL is already live and managed via pgAdmin, it may run outside Docker. The `postgres` service in Docker Compose is optional — just point `DATABASE_URL` to the existing server.

---

## 4. Project Folder Structure

```
proptrack/
├── docker-compose.yml
├── .env
├── backend/
│   ├── src/
│   │   ├── server.ts                  # Fastify entry point
│   │   ├── plugins/
│   │   │   ├── prisma.ts              # Prisma plugin
│   │   │   ├── auth.ts                # JWT plugin
│   │   │   └── multipart.ts           # File upload plugin
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── companies.ts
│   │   │   ├── properties.ts
│   │   │   ├── transfers.ts
│   │   │   ├── duplicates.ts
│   │   │   ├── audit.ts
│   │   │   ├── import.ts
│   │   │   ├── snapshots.ts
│   │   │   └── propertyTypes.ts
│   │   ├── services/
│   │   │   ├── duplicateEngine.ts     # Dedup scan logic
│   │   │   ├── importService.ts       # CSV batch insert
│   │   │   ├── geocodeService.ts      # Nominatim calls
│   │   │   ├── snapshotService.ts     # Monthly snapshot compute
│   │   │   └── transferService.ts     # Transfer/swap/reversal
│   │   └── middleware/
│   │       └── roleGuard.ts           # Role-based access
│   ├── prisma/
│   │   └── schema.prisma              # Full schema (generated)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── api/
    └── package.json
```

---

## 5. Database — 19 Tables (All Created ✅)

### Status
> Schema is live in PostgreSQL. All 19 tables created, extensions enabled, seed data inserted.

### Tables Overview

| Table | Purpose |
|---|---|
| `users` | Auth, roles, display preferences |
| `companies` | Company records |
| `property_types` | Two-level type hierarchy (seeded) |
| `properties` | Core property records |
| `property_companies` | Ownership stakes (many-to-many, with %) |
| `property_status_log` | Per-stake status change history |
| `property_transfers` | Transfer/swap/reversal events |
| `property_transfer_legs` | Individual movements per transfer event |
| `duplicate_pairs` | Flagged duplicate property pairs |
| `merge_log` | Record of merged duplicates |
| `audit_log` | System-level change log (partitioned by quarter) |
| `property_change_log` | Human-readable building log |
| `import_jobs` | CSV import job tracking |
| `property_scrape_log` | Per-scrape history per property |
| `geocode_queue` | Async geocoding queue |
| `company_notes` | Research notes per company |
| `company_note_attachments` | Files attached to notes (stored in MinIO) |
| `company_monthly_snapshots` | Pre-computed dashboard analytics |
| `system_settings` | Global key-value store (snapshot gate etc.) |

### Seed Data (Already Inserted)
- System admin user: `admin@proptrack.local` / UUID `00000000-0000-0000-0000-000000000001`
- Property types: 6 parent categories, 29 child types (full hierarchy)
- System settings: `last_snapshot_month` key inserted

---

## 6. Key Schema Rules

### Properties
- `address_normalized` — computed from `address_latin` via `unaccent()` + lowercase + abbreviations (Street→St, Avenue→Ave etc.)
- `address_original` — original script (Swedish, Arabic, Chinese etc.)
- `address_latin` — Latin transliteration (for search on non-Latin scripts)
- `gfa_sqft` — canonical GFA, always stored in sqft
- `gfa_input_value` + `gfa_input_unit` — original user input preserved
- `parent_id` — self-reference: units hang off a parent building (building always required)
- `property_level` — `building` or `unit`
- `deleted_at` — soft delete, never hard delete
- `geocode_status` — `pending` on create, updated by geocode queue worker

### GFA Unit Rules
- **Store:** always sqft
- **Convert on input:** if user enters sqm → multiply by 10.7639
- **Display:** per `users.preferred_gfa_unit` (sqft or sqm), conversion done in frontend
- **Preserve original:** `gfa_input_value` + `gfa_input_unit` stored alongside `gfa_sqft`
- **Import aliases:** sqft = ft2 = sq ft; sqm = m2 = sq m = square metres

### Ownership (property_companies)
- Many-to-many: one property can have multiple company owners with percentages (e.g. 60/40)
- `ownership_pct` — soft warning if total ≠ 100%, not a hard DB constraint
- `valid_from` / `valid_to` — full ownership timeline (closed/opened by transfers)
- `status`: `active | sold | transferred | reversed`

### Transfers & Swaps
- A **transfer** = Company A gives property to Company B
- A **swap** = Property A goes to Company X in exchange for Property B going to Company Y
- A **reversal** = new transfer event with `type = reversal`, `reversed_by = original_transfer_id`
- On transfer: old `property_companies` row gets `valid_to` set, new row opened
- `property_transfer_legs` — one row per ownership movement in the event

### Duplicate Detection
- **Trigger:** on-demand only (manual button + auto after bulk import)
- **Algorithm:** group by `(address_normalized, lower(city), postal_code, country_code)` — country always in key
- **3 levels:** `building` (same address), `unit` (same parent + unit number), `cross_level` (unit address matches unrelated building)
- **Scope:** `same_company | cross_company | no_shared_ownership`
- **Resolution:** `pending → duplicate | not_duplicate | merged`
- **Merge:** pick canonical record, soft-delete the other, redistribute ownership

### Snapshot Gate
- Blocks: Add property, Upload CSV, Add company
- Check: `system_settings.last_snapshot_month` vs current calendar month (YYYY-MM)
- Hard block — no dismiss, no skip
- Once snapshot taken: gate opens for all users for rest of month
- First use: `last_snapshot_month` is empty string → gate fires immediately

### Audit Log
- Partitioned by quarter (already created through Q4 2026)
- Primary key: `(id, changed_at)` — required by PostgreSQL partitioning
- Stores diff only (changed fields), not full before/after snapshots
- Written by Prisma middleware on every DB write

### Property Change Log (Building Log)
- Human-readable, shown in UI on property detail page
- Written in same DB transaction as the property update
- Admin can soft-delete entries (must provide reason)
- No one can edit entries

### Geocoding
- Nominatim (self-hosted), max 3 attempts
- After 3 failures: `geocode_status = 'failed'`, user can enter manually
- Manual coordinates: `geocode_status = 'manual_override'` — never auto-overwritten

### File Storage (MinIO)
- Bucket structure: `proptrack/notes/{year}/{month}/{uuid}-{filename}`
- Access: presigned URLs, expire after 60 seconds
- Never publicly accessible — all downloads go through backend auth check
- Allowed types: PDF, Excel (.xlsx/.xls), Images (PNG, JPEG, WEBP, GIF)
- Max file size: 25MB (configurable via env)

---

## 7. User Roles & Permissions

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| Browse & search properties | ✅ | ✅ | ✅ |
| Add / edit properties | ✅ | ✅ | ❌ |
| Mark sold / reactivate | ✅ | ✅ | ❌ |
| Soft delete property | ✅ | ✅ | ❌ |
| Manage companies | ✅ | ✅ | ❌ |
| Add / edit notes | ✅ | ✅ | ❌ |
| Upload attachments | ✅ | ✅ | ❌ |
| Bulk import CSV | ✅ | ✅ | ❌ |
| Resolve duplicates | ✅ | ✅ | ❌ |
| Merge properties | ✅ | ✅ | ❌ |
| Record transfers / swaps | ✅ | ✅ | ❌ |
| Take snapshots | ✅ | ✅ | ❌ |
| View audit log | ✅ | ❌ | ❌ |
| Delete change log entries | ✅ | ❌ | ❌ |
| Manage property types | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

---

## 8. API Routes (Complete)

```
# Auth
POST   /api/auth/register
POST   /api/auth/login

# Companies
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id          (soft delete)

# Company Notes
GET    /api/companies/:id/notes
POST   /api/companies/:id/notes
PUT    /api/companies/:id/notes/:noteId
DELETE /api/companies/:id/notes/:noteId

# Note Attachments
POST   /api/notes/:noteId/attachments
DELETE /api/notes/:noteId/attachments/:attachmentId
GET    /api/notes/:noteId/attachments/:attachmentId/download  (presigned URL)

# Properties
GET    /api/properties             (keyset pagination, filter: company, status, country, type)
POST   /api/properties
GET    /api/properties/:id
PUT    /api/properties/:id
DELETE /api/properties/:id         (soft delete)
PATCH  /api/properties/:id/status  (body: { status: 'sold' | 'active' })
GET    /api/properties/:id/history (property_change_log)
GET    /api/properties/:id/ownership (full timeline with valid_from/valid_to)
GET    /api/properties/:id/units   (child units if building)

# Ownership
POST   /api/properties/:id/owners          (add company stake)
PUT    /api/properties/:id/owners/:companyId
DELETE /api/properties/:id/owners/:companyId

# Transfers & Swaps
GET    /api/transfers
POST   /api/transfers              (type: transfer | swap)
GET    /api/transfers/:id
POST   /api/transfers/:id/reverse

# Duplicates
GET    /api/duplicates             (filter: status, scope, match_level)
POST   /api/duplicates/scan        (on-demand scan trigger)
PATCH  /api/duplicates/:id         (body: { status: 'duplicate' | 'not_duplicate' })
POST   /api/duplicates/:id/merge   (body: { keepId, removeId })

# Property Types
GET    /api/property-types         (full tree)
POST   /api/property-types         (admin only)
PUT    /api/property-types/:id     (admin only)
PATCH  /api/property-types/:id/toggle-active  (admin only)

# Import
POST   /api/import                 (multipart CSV upload)
GET    /api/import/:jobId          (job status + error report)

# Snapshots & Dashboard
POST   /api/snapshots              (take snapshot for current month)
GET    /api/snapshots/:companyId   (list available months)
GET    /api/dashboard/:companyId   (query: month=2024-11 — returns month + prev month)

# Audit Log (admin only)
GET    /api/audit                  (filter: table, recordId, userId, dateFrom, dateTo)

# Users (admin only)
GET    /api/users
POST   /api/users
PATCH  /api/users/:id/role
DELETE /api/users/:id
```

**Pagination rule:** keyset everywhere — `?after=<last_id>&limit=50`. No offset.

---

## 9. Property Type Hierarchy (Seeded)

```
Residential        → Apartment, House, Villa, Townhouse, Student Housing, Senior Living
Commercial         → Office, Retail, Shopping Centre, Hotel, Restaurant/F&B, Co-working Space
Industrial         → Warehouse, Factory, Logistics/Distribution, Cold Storage, Data Centre
Mixed-use          → Residential+Commercial, Residential+Office, Commercial+Industrial
Land               → Development Plot, Agricultural, Parking Lot, Brownfield Site
Special Purpose    → Hospital/Medical, School/Education, Place of Worship,
                     Government/Civic, Sports/Recreation
```

---

## 10. International Address Handling

- `address_line1` — street address in local language (Swedish, Norwegian, Arabic etc.)
- `address_latin` — Latin transliteration (auto or manual); optional for now, backfill later
- `address_normalized` — `unaccent(lower(address_latin))` + abbreviations
- `country_code` — ISO 3166-1 alpha-2 (SE, NO, US, AE etc.), required
- Diacritic map: ä→a, ö→o, å→a, æ→ae, ø→o + general Unicode
- Search hits both `address_original` and `address_latin` via trigram indexes
- Duplicate key always includes `country_code` — same address different country ≠ duplicate

---

## 11. Build Phases

| Phase | What Gets Built |
|---|---|
| **1 — Foundation** | Docker Compose, .env, Fastify server, Prisma client, JWT auth (register/login), role guard middleware |
| **2 — Core API** | Companies CRUD, Properties CRUD, soft delete, sold/active status, ownership stakes (property_companies), status log |
| **3 — Transfers** | Transfer events, swap logic, reversal, ownership timeline query |
| **4 — Duplicates** | Normalization function, scan endpoint, resolution endpoints, merge logic |
| **5 — Audit & Change Log** | Prisma middleware → audit_log, property update hook → property_change_log, admin delete |
| **6 — Geocoding** | Nominatim Docker setup, geocode_queue worker, manual override, scrape log |
| **7 — Bulk Import** | CSV upload, column mapper, validation, batch insert (1000 rows/tx), job tracking, post-import dedup scan |
| **8 — Notes & Attachments** | company_notes CRUD, MinIO setup, file upload, presigned download, attachment delete |
| **9 — Snapshots** | Snapshot compute service, system_settings gate, snapshot trigger on add/upload, backfill script |
| **10 — Frontend** | Auth, companies, properties, ownership panel, transfers, duplicates, building log, audit, import, dashboard, notes, type manager |

---

## 12. Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/proptrack

# JWT
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=http://minio:9000
MINIO_USER=proptrack_admin
MINIO_PASSWORD=your_minio_password
MINIO_BUCKET=proptrack
FILE_SIZE_LIMIT_MB=25

# Nominatim
NOMINATIM_URL=http://nominatim:8080
GEOCODE_MAX_ATTEMPTS=3
GEOCODE_RETRY_INTERVAL_SECONDS=60

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 13. Key Business Rules (Quick Reference)

| Rule | Detail |
|---|---|
| GFA storage | Always sqft — convert sqm on input (× 10.7639) |
| GFA display | Per user preference, conversion in frontend only |
| Ownership % | Soft warning if ≠ 100%, not a hard constraint |
| Duplicate scan | On-demand only + auto after bulk import |
| Snapshot gate | Hard block on add/upload if no snapshot this calendar month |
| Soft delete | `deleted_at` timestamp — never hard delete any record |
| Pagination | Keyset (`after` cursor) everywhere — no offset |
| Address dedup key | `(address_normalized, city, postal_code, country_code)` |
| Units | Always require a parent building record |
| Transfer reversal | New transfer event (`type=reversal`) — history never rewritten |
| Audit log PK | `(id, changed_at)` — required by PostgreSQL partitioned table |
| Change log writes | Same transaction as property update — always in sync |
| File URLs | Presigned, expire 60s — never stored, generated on demand |
| Geocode attempts | Max 3 — then `geocode_status=failed`, user can override manually |
| Manual coordinates | `geocode_status=manual_override` — never auto-overwritten |
| Property types | Admin-managed lookup table — deactivate instead of delete |

---

## 14. Decisions Still Open (Parking Lot)

These scenarios came up during planning but were not decided. Revisit before the relevant phase:

| Scenario | Revisit Before |
|---|---|
| Lease / tenancy tracking | Phase 2 |
| Mortgage / foreclosure | Phase 3 |
| Option to purchase | Phase 3 |
| Property subdivision (1 → many) | Phase 2 |
| Property consolidation (many → 1) | Phase 2 |
| Company renamed (name history) | Phase 2 |
| Company merger (bulk stake transfer) | Phase 3 |
| Company dissolution (orphaned stakes) | Phase 2 |
| Disputed ownership flag | Phase 2 |
| Under development status | Phase 2 |
| Partial stake transfer (sell % of %) | Phase 3 |
| Ownership rebalancing (60/40 → 50/50) | Phase 3 |
| Succession / inheritance of stakes | Phase 3 |

---

## 15. How to Start a New Chat Session

Paste this at the top of every new chat:

```
I am building PropTrack — a self-hosted property management system.
The full plan is in PROPTRACK_MASTER_REFERENCE.md (attached).
The database schema is already live in PostgreSQL (19 tables created).
We are currently on: [PHASE X — PHASE NAME].
Today I want to build: [specific task].
```

Then attach this document. Claude will have full context instantly.

---

## 16. Current Status

| Item | Status |
|---|---|
| Planning | ✅ Complete |
| Database Tables | ✅ Live in PostgreSQL (19 tables) |
| Phase 1 — Foundation | ✅ Complete (Docker, Fastify, JWT) |
| Phase 2 — Core API | ✅ Complete (Companies, Properties) |
| Phase 3 — Transfers | ✅ Complete (Backend logic) |
| Phase 4 — Duplicates | ✅ Complete (Backend logic) |
| Phase 5 — Audit & Change Log | ✅ Complete |
| Phase 6 — Geocoding | ✅ Complete (Nominatim + Queue) |
| Phase 7 — Bulk Import | ✅ Complete (CSV Parser + Geocode/Dedup) |
| Phase 8 — Notes & Attachments | ✅ Complete (MinIO integration) |
| Phase 9 — Snapshots | ✅ Complete (Snapshot Gate + Analytics) |
| Phase 10 — Frontend | ⏳ In Progress (Auth, Companies, Properties ✅) |
| **Next task** | **Phase 10 — Transfers & Swaps UI** |
