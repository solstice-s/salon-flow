# Workspace

## Overview

SalonFlow — a full-stack salon booking web app for a women's salon. Customers can browse services and book appointments through a multi-step flow. Admins manage bookings, services, and staff via a protected dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (artifact: `salon-flow`, path: `/`)
- **API framework**: Express 5 (artifact: `api-server`, path: `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Features

### Customer Side
- Browse all salon services with price and duration
- Multi-step booking flow: choose service → choose staff (or any available) → pick date/time → enter contact details
- Working hours: Sat–Thu 10AM–9PM (Friday closed)
- Available time slots fetched from API (30-min intervals, no past times, no double-bookings)
- Booking confirmation page with reference number

### Admin Side
- Login: username `admin`, password `admin123`
- Dashboard with booking stats (total, pending, confirmed, today, revenue)
- Filterable bookings table with status badge and update modal
- Full CRUD for services (name, duration, price, description)
- Full CRUD for staff (name, role)

## Database Tables

- `services` — salon services (name, durationMinutes, price, description)
- `staff` — staff members (name, role)
- `bookings` — customer bookings with reference number, status, and audit fields

## API Routes

All routes under `/api`:
- `GET/POST /services` — list and create services
- `GET/PUT/DELETE /services/:id` — get, update, delete service
- `GET/POST /staff` — list and create staff
- `GET/PUT/DELETE /staff/:id` — get, update, delete staff member
- `GET/POST /bookings` — list (with status filter) and create bookings
- `GET/PATCH /bookings/:id` — get and update booking status/admin notes
- `GET /bookings/available-slots` — available time slots for a date/service/staff combo
- `POST /admin/login` — admin authentication
- `GET /admin/stats` — booking statistics for dashboard

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
