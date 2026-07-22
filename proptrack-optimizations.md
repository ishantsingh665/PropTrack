# PropTrack — Pre-Deployment Optimization Guide

> Analyzed from source: `github.com/ishantsingh665/PropTrack`  
> Target server: `proptrack.betahobby.dpdns.org`

---

## Summary

| # | Fix | Effort | Impact | Priority |
|---|-----|--------|--------|----------|
| 1 | Replace self-hosted Nominatim with OSM public API | 5 min | Saves ~70 GB disk + hours of init time | 🔴 Critical |
| 2 | Add missing DB indexes | 5 min | Major query speedup on all hot paths | 🟡 Medium |
| 3 | Scope duplicate scan to newly imported IDs only | 30 min | Eliminates O(n²) bottleneck on bulk imports | 🔴 Critical |
| 4 | Batch snapshot queries (eliminate N+1) | 20 min | Prevents sequential DB hits per company | 🟡 Medium |
| 5 | Add route-level lazy loading on frontend | 15 min | Faster initial page load | 🟢 Minor |
| 6 | Extract shared `cn()` utility | 10 min | Eliminates copy-pasted boilerplate | 🟢 Minor |

---

## 🔴 Fix 1 — Replace Self-Hosted Nominatim with OSM Public API

### Problem

`docker-compose.yml` includes the `mediagis/nominatim:4.2` image which, on first boot, downloads and imports the **full OpenStreetMap planet dataset**:

- ~70 GB disk space required
- 6–12 hours of initialization time
- ~4 GB RAM to run continuously
- Completely disproportionate for an internal property management tool

### Where it lives

**`docker-compose.yml`**
```yaml
nominatim:
  image: mediagis/nominatim:4.2
  restart: always
  environment:
    - NOMINATIM_PASSWORD=${NOMINATIM_PASSWORD:-proptrack_password}
  volumes:
    - nominatim_data:/var/lib/postgresql/data
```

**`backend/src/services/geocodeService.ts`**
```ts
this.nominatimUrl = process.env.NOMINATIM_URL || 'http://nominatim:8080';
```

### Fix — Step 1: Remove nominatim from docker-compose.yml

```yaml
# docker-compose.yml — REMOVE this entire service block:
# nominatim:
#   image: mediagis/nominatim:4.2
#   ...

# Also remove nominatim_data from volumes:
volumes:
  postgres_data:
  minio_data:
  # nominatim_data:   <-- remove this line
```

### Fix — Step 2: Update backend environment in docker-compose.yml

```yaml
backend:
  environment:
    - NOMINATIM_URL=https://nominatim.openstreetmap.org
    # Remove: - NOMINATIM_PASSWORD=...
```

### Fix — Step 3: Add rate-limit delay in geocodeService.ts

The OSM public API enforces **1 request/second**. The current queue processor fires 10 jobs with no delay between them. Add a sleep:

```ts
// backend/src/services/geocodeService.ts

async processQueue() {
  const jobs = await this.prisma.geocodeQueue.findMany({
    where: { nextRunAt: { lte: new Date() } },
    take: 10,
  });

  for (const job of jobs) {
    await this.geocodeProperty(job);
    await new Promise(resolve => setTimeout(resolve, 1100)); // OSM rate limit: 1 req/sec
  }
}
```

### Fix — Step 4: Update User-Agent header

OSM requires a descriptive User-Agent (not a generic one):

```ts
// geocodeService.ts — update the fetch call headers:
headers: {
  'User-Agent': 'PropTrack/1.0 (proptrack.betahobby.dpdns.org; contact@yourdomain.com)'
}
```

### Fix — Step 5: Remove NOMINATIM_PASSWORD from .env

```env
# .env — remove this line:
# NOMINATIM_PASSWORD=generate_a_nominatim_password_here
```

> **Note:** If geocoding volume grows significantly later, consider a country-specific Nominatim instance using `mediagis/nominatim` with `PBF_URL` pointed at a regional extract (e.g. India only = ~700 MB vs 70 GB planet).

---

## 🔴 Fix 2 — Scope Duplicate Scan to Newly Imported IDs

### Problem

`importService.ts` calls `duplicateEngine.scanForDuplicates()` after **every bulk import**. The engine:

1. Loads **all non-deleted properties** from the DB into memory
2. Groups them and does an **O(n²) pair comparison**
3. Inside the nested loop, fires a `prisma.duplicatePair.findFirst()` for **every candidate pair**

With 1,000 properties this can mean ~500,000 comparisons and thousands of sequential DB round trips — all blocking the import job.

### Where it lives

**`backend/src/services/importService.ts`** (end of `processImport`):
```ts
// Triggers full table scan every time:
const duplicateEngine = new DuplicateEngine(this.prisma);
await duplicateEngine.scanForDuplicates();
```

**`backend/src/services/duplicateEngine.ts`**:
```ts
async scanForDuplicates() {
  const properties = await this.prisma.property.findMany({ // loads ALL properties
    where: { deletedAt: null },
    ...
  });
  // O(n²) loop with DB query inside...
}
```

### Fix — Update duplicateEngine.ts to accept optional ID filter

```ts
// backend/src/services/duplicateEngine.ts

export class DuplicateEngine {
  constructor(private prisma: PrismaClient) {}

  async scanForDuplicates(scopeToIds?: string[]) {
    const whereClause: any = { deletedAt: null };

    // If specific IDs provided, only load properties that share an address key
    // with at least one of the new properties — fetch new ones first
    let addressKeys: Set<string> | null = null;

    if (scopeToIds && scopeToIds.length > 0) {
      const newProps = await this.prisma.property.findMany({
        where: { id: { in: scopeToIds }, deletedAt: null },
        select: { addressNormalized: true, city: true, postalCode: true, countryCode: true }
      });

      // Build the set of address keys we care about
      addressKeys = new Set(
        newProps.map(p => `${p.addressNormalized}|${p.city}|${p.postalCode || ''}|${p.countryCode}`)
      );

      if (addressKeys.size === 0) return { pairsCreated: 0 };
    }

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      include: {
        companies: {
          where: { validTo: null },
          select: { companyId: true }
        }
      }
    });

    // Group by address key
    const groups: Record<string, typeof properties> = {};
    for (const prop of properties) {
      const key = `${prop.addressNormalized}|${prop.city}|${prop.postalCode || ''}|${prop.countryCode}`;

      // If scoped, only process groups that contain a new property's address key
      if (addressKeys && !addressKeys.has(key)) continue;

      if (!groups[key]) groups[key] = [];
      groups[key].push(prop);
    }

    // Batch-fetch existing pairs to avoid per-pair DB queries
    const allPropertyIds = Object.values(groups).flat().map(p => p.id);
    const existingPairs = await this.prisma.duplicatePair.findMany({
      where: {
        OR: [
          { property1Id: { in: allPropertyIds } },
          { property2Id: { in: allPropertyIds } }
        ]
      },
      select: { property1Id: true, property2Id: true }
    });

    const existingSet = new Set(
      existingPairs.map(p => [p.property1Id, p.property2Id].sort().join('|'))
    );

    let pairsCreated = 0;
    const newPairs: any[] = [];

    for (const key in groups) {
      const group = groups[key];
      if (group.length < 2) continue;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const p1 = group[i];
          const p2 = group[j];
          const [id1, id2] = [p1.id, p2.id].sort();
          const pairKey = `${id1}|${id2}`;

          if (existingSet.has(pairKey)) continue;
          existingSet.add(pairKey); // prevent duplicates within this batch

          let matchLevel = 'building';
          if (p1.propertyLevel === 'unit' && p2.propertyLevel === 'unit') matchLevel = 'unit';
          else if (p1.propertyLevel !== p2.propertyLevel) matchLevel = 'cross_level';

          const companies1 = new Set(p1.companies.map(c => c.companyId));
          const companies2 = new Set(p2.companies.map(c => c.companyId));
          let scope = 'no_shared_ownership';
          if (companies1.size > 0 && companies2.size > 0) {
            const intersection = [...companies1].filter(x => companies2.has(x));
            scope = intersection.length > 0 ? 'same_company' : 'cross_company';
          }

          newPairs.push({ property1Id: id1, property2Id: id2, status: 'pending', matchLevel, scope });
          pairsCreated++;
        }
      }
    }

    // Bulk insert all new pairs in one query
    if (newPairs.length > 0) {
      await this.prisma.duplicatePair.createMany({ data: newPairs });
    }

    return { pairsCreated };
  }
}
```

### Fix — Update importService.ts to pass new IDs

```ts
// backend/src/services/importService.ts
// Track newly created property IDs during import:

const newPropertyIds: string[] = [];

// Inside the batch loop, after tx.property.create():
const property = await tx.property.create({ ... });
newPropertyIds.push(property.id); // <-- add this line

// Then at the end, pass them to the duplicate engine:
const duplicateEngine = new DuplicateEngine(this.prisma);
await duplicateEngine.scanForDuplicates(newPropertyIds); // <-- scoped scan
```

---

## 🟡 Fix 3 — Add Missing Database Indexes

### Problem

The Prisma schema only has indexes on `AuditLog`. Several other tables are hit repeatedly on hot paths with no indexes:

| Table | Unindexed column(s) | Where it's queried |
|-------|--------------------|--------------------|
| `PropertyCompany` | `companyId, status, validTo` | Every dashboard load, every snapshot |
| `Property` | `geocodeStatus` | Full table scan after every import |
| `GeocodeQueue` | `nextRunAt` | Polled repeatedly by geocode worker |
| `DuplicatePair` | `property1Id, property2Id` | Inside the O(n²) scan loop |

### Fix — Add to schema.prisma

```prisma
model PropertyCompany {
  // ... existing fields ...

  @@index([companyId, status, validTo])  // dashboard + snapshot queries
  @@index([propertyId])                  // property detail lookups
}

model Property {
  // ... existing fields ...

  @@index([geocodeStatus])               // post-import geocode queue population
  @@index([addressNormalized, city, countryCode]) // duplicate engine grouping
  @@index([deletedAt])                   // soft-delete filters everywhere
}

model GeocodeQueue {
  // ... existing fields ...

  @@index([nextRunAt])                   // queue processor polling
}

model DuplicatePair {
  // ... existing fields ...

  @@index([property1Id, property2Id])    // pair existence checks
  @@index([status])                      // frontend filters by status
}
```

### Apply after schema change

```bash
# On the server after deploying:
docker compose exec backend npx prisma db push
# or if using migrations:
docker compose exec backend npx prisma migrate deploy
```

---

## 🟡 Fix 4 — Eliminate N+1 in Snapshot Service

### Problem

`snapshotService.ts → takeSnapshot()` queries the DB **once per company** inside a loop:

```ts
for (const company of companies) {
  // One DB round trip per company:
  const activeStakes = await this.prisma.propertyCompany.findMany({
    where: { companyId: company.id, ... }
  });
}
```

With 50 companies = 50 sequential DB queries. With 200 companies = 200 queries.

### Fix — Single query, group in memory

```ts
// backend/src/services/snapshotService.ts

async takeSnapshot(month: string) {
  const companies = await this.prisma.company.findMany({
    where: { deletedAt: null }
  });

  // ONE query for all active stakes across all companies
  const allActiveStakes = await this.prisma.propertyCompany.findMany({
    where: {
      status: 'active',
      validTo: null,
      property: { deletedAt: null }
    },
    include: { property: true }
  });

  // Group stakes by companyId in memory
  const stakesByCompany = new Map<string, typeof allActiveStakes>();
  for (const stake of allActiveStakes) {
    if (!stakesByCompany.has(stake.companyId)) {
      stakesByCompany.set(stake.companyId, []);
    }
    stakesByCompany.get(stake.companyId)!.push(stake);
  }

  // Build all snapshot upserts
  const snapshotData = companies.map(company => {
    const activeStakes = stakesByCompany.get(company.id) || [];
    const propertyCount = activeStakes.length;
    const totalGfaSqft = activeStakes.reduce((sum, s) => sum + (s.property.gfaSqft || 0), 0);

    return {
      companyId: company.id,
      month,
      propertyCount,
      totalGfaSqft,
      activeStakeCount: activeStakes.length,
      data: { generatedAt: new Date().toISOString() }
    };
  });

  // Upsert all snapshots in a single transaction
  const snapshots = await this.prisma.$transaction(
    snapshotData.map(data =>
      this.prisma.companyMonthlySnapshot.upsert({
        where: { companyId_month: { companyId: data.companyId, month } },
        update: { ...data },
        create: { ...data }
      })
    )
  );

  await this.prisma.systemSetting.upsert({
    where: { key: 'last_snapshot_month' },
    update: { value: month },
    create: { key: 'last_snapshot_month', value: month }
  });

  return snapshots;
}
```

**Result:** N+1 queries → 2 queries (one for all stakes + one transaction for upserts).

---

## 🟢 Fix 5 — Add Route-Level Lazy Loading on Frontend

### Problem

`App.tsx` imports all pages eagerly. Recharts alone is ~500 KB. Every user downloading the full bundle on first load, even if they only visit the Login page.

### Where it lives

**`frontend/src/App.tsx`** (assumed standard pattern):
```tsx
import Dashboard from './pages/Dashboard';
import AuditLog from './pages/AuditLog';
import Properties from './pages/Properties';
// ... all imported at the top
```

### Fix — Lazy load heavy pages

```tsx
// frontend/src/App.tsx

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Keep Login/Register eager (they're the entry point)
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy load everything behind the auth wall
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const Properties       = lazy(() => import('./pages/Properties'));
const PropertyDetails  = lazy(() => import('./pages/PropertyDetails'));
const Companies        = lazy(() => import('./pages/Companies'));
const CompanyDetails   = lazy(() => import('./pages/CompanyDetails'));
const Transfers        = lazy(() => import('./pages/Transfers'));
const BulkImport       = lazy(() => import('./pages/BulkImport'));
const AuditLog         = lazy(() => import('./pages/AuditLog'));
const Duplicates       = lazy(() => import('./pages/Duplicates'));
const GeocodingManagement = lazy(() => import('./pages/GeocodingManagement'));
const UserManagement   = lazy(() => import('./pages/UserManagement'));
const PropertyTypeManager = lazy(() => import('./pages/PropertyTypeManager'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
    Loading...
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<Suspense fallback={<LoadingFallback />}>}>
            <Route path="/"                  element={<Dashboard />} />
            <Route path="/properties"        element={<Properties />} />
            <Route path="/properties/:id"    element={<PropertyDetails />} />
            <Route path="/companies"         element={<Companies />} />
            <Route path="/companies/:id"     element={<CompanyDetails />} />
            <Route path="/transfers"         element={<Transfers />} />
            <Route path="/import"            element={<BulkImport />} />
            <Route path="/audit"             element={<AuditLog />} />
            <Route path="/duplicates"        element={<Duplicates />} />
            <Route path="/geocoding"         element={<GeocodingManagement />} />
            <Route path="/users"             element={<UserManagement />} />
            <Route path="/property-types"    element={<PropertyTypeManager />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
```

### Fix — Also update vite.config.ts for manual chunking

```ts
// frontend/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge', 'lucide-react'],
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
```

**Result:** Initial bundle drops significantly. Recharts only loads when Dashboard is visited.

---

## 🟢 Fix 6 — Extract Shared `cn()` Utility

### Problem

The `cn()` helper (combining `clsx` + `tailwind-merge`) is copy-pasted inline in `Dashboard.tsx`:

```ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
```

If other components need it, this pattern gets duplicated everywhere.

### Fix — Create a shared utility file

```ts
// frontend/src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Update imports in Dashboard.tsx and any other components

```ts
// Remove these three lines:
// import { clsx } from 'clsx';
// import { twMerge } from 'tailwind-merge';
// function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

// Replace with:
import { cn } from '../lib/utils';
```

---

## Deployment Order Recommendation

Apply optimizations **before** running `docker compose up`:

```
1. Fix 1  → Edit docker-compose.yml (remove nominatim) + geocodeService.ts (rate limit + User-Agent)
2. Fix 3  → Edit schema.prisma (add indexes)
3. Fix 2  → Edit duplicateEngine.ts + importService.ts (scoped scan)
4. Fix 4  → Edit snapshotService.ts (batch queries)
5. Fix 5  → Edit App.tsx + vite.config.ts (lazy loading)
6. Fix 6  → Create lib/utils.ts, update Dashboard.tsx
```

Then deploy:

```bash
git clone https://github.com/ishantsingh665/PropTrack.git
cd PropTrack
cp .env.example .env
# fill in .env values
docker compose up -d --build
docker compose exec backend npx prisma db push
```
