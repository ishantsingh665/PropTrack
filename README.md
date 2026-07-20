# PropTrack

PropTrack is a comprehensive, self-hosted property management system designed to streamline portfolio tracking, ownership documentation, and data due diligence.

## Features

- **Asset Management**: Full CRUD capabilities for buildings and units with hierarchical linking.
- **Ownership Tracking**: Multi-leg transfer engine, swaps, and comprehensive ownership timelines.
- **Data Integrity**: Automated address normalization, geocoding via Nominatim, and duplicate detection/merge logic.
- **Intelligence**: Portfolio dashboard with growth analytics (GFA, Property Count) and monthly point-in-time snapshots.
- **Governance**: Role-Based Access Control (RBAC), system-wide audit logs, and "Snapshot Gate" to prevent data drift.
- **Due Diligence**: Research notes and file attachments storage managed via MinIO.
- **Bulk Operations**: High-throughput CSV imports with real-time error reporting.

## Architecture

- **Backend**: Node.js, Fastify, TypeScript, Prisma (PostgreSQL).
- **Frontend**: React, Vite, Tailwind CSS, Recharts.
- **Geocoding**: Nominatim (OSM) with async background queue.
- **Storage**: MinIO (S3-compatible).

## Installation

### Prerequisites
- Docker & Docker Compose
- Node.js (v20+)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ishantsingh665/PropTrack.git
   cd PropTrack
   ```

2. Create your environment configuration:
   ```bash
   cp .env.example .env
   # Update .env with your production credentials
   ```

3. Start the infrastructure:
   ```bash
   docker-compose up -d
   ```

4. Install and run backend:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run dev
   ```

5. Install and run frontend:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## Documentation

For business rules and project roadmap, please refer to `PROPTRACK_MASTER_REFERENCE.md`.
