# PropTrack Project Instructions

This project is a self-hosted property management system called PropTrack.

## Architectural Mandates
- **Backend:** Node.js + Fastify + TypeScript + Prisma.
- **Frontend:** React + Vite + Tailwind CSS.
- **Database:** PostgreSQL.
- **Storage:** MinIO (S3-compatible).
- **Geocoding:** Nominatim (OSM).

## Current Progress
- All backend phases (1-9) are completed, including Auth, Companies, Properties, Transfers, Duplicates, Auditing, Geocoding, Bulk Import, Notes/Attachments, and Snapshots.
- Frontend (Phase 10) is in progress:
  - Base skeleton with Vite + Tailwind is set up.
  - Auth flow (Login/Register) is functional.
  - Layout with sidebar and navigation is implemented.
  - Companies module (CRUD, Search, Pagination) is functional.
  - Properties module (CRUD, Filters, Hierarchy, GFA conversion, Building logs) is functional.

## Important Reference
Refer to `PROPTRACK_MASTER_REFERENCE.md` for the complete project roadmap and business rules.
