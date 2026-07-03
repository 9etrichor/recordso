# Tech Report — recordso

> **recordso** is a time-tracking and activity-logging web application. Users record activities with ratings (Good/Normal/Bad) and view daily analytical breakdowns of their time distribution.

---

## Overview

| Category | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | ^5 |
| Package Manager | npm | lockfile v3 |
| Module System | ESM | `"type": "module"` |

---

## Frontend

### Styling

- **Tailwind CSS v4** (4.3.1) — via `@tailwindcss/postcss` PostCSS plugin
- Tailwind v4's `@theme inline` directive for custom brand colors: `#482615`, `#B05B2D`, `#D06C33`, `#FCB797`, `#FFE2D9`
- Inline `style` props used alongside Tailwind classes for brand color consistency
- **Geist** font (`next/font/google`)

### State Management

- React built-in state (`useState`, `useEffect`, `useCallback`)
- `useSession` from NextAuth for auth state
- **No** global state library (Redux, Zustand, etc.)

### Forms & Validation

| Library | Version | Purpose |
|---|---|---|
| react-hook-form | 7.80.0 | Form state & validation |
| @hookform/resolvers | 5.4.0 | Zod resolver integration |
| Zod | 4.4.3 | Schema validation |

### Charts

- **Chart.js** (4.5.1) — pie chart on analysis page

### Date Handling

- **date-fns** (4.4.0) — formatting & manipulation

---

## Backend

### API

- **Next.js App Router API routes** under `app/api/`
  - `GET/POST /api/records` — list / create records
  - `PUT/DELETE /api/records/[id]` — update / delete a record
  - `POST /api/auth/register` — registration endpoint
  - `[...nextauth]/route.ts` — NextAuth handler
- All API routes explicitly set `runtime = "nodejs"` and use dynamic `import("@/lib/prisma")`
- Timezone handling: datetime-local inputs are adjusted to local time before storage

### Authentication

| Library | Version | Notes |
|---|---|---|
| NextAuth.js | 5.0.0-beta.31 | v5 beta, App Router |
| bcrypt | 6.0.0 | Password hashing |

- **Strategy**: JWT-based (no database sessions)
- **Provider**: Credentials (email + password)
- Custom `/login` sign-in page

### Database

| Technology | Version | Notes |
|---|---|---|
| Prisma ORM | 7.8.0 | `prisma` CLI + `@prisma/client` |
| @prisma/adapter-pg | 7.8.0 | pg driver adapter |
| PostgreSQL | — | Database provider |

#### Schema

- **User**: `id` (cuid), `email` (unique), `password` (hashed), `name`, timestamps
- **Record**: `id` (cuid), `userId` (FK), `timestamp`, `timestampEnd` (nullable), `activity` (VarChar 200), `rating` (enum: GOOD/NORMAL/BAD), timestamps. Indexed on `[userId, timestamp]`.
- Prisma v7 uses the new driver adapter pattern (`@prisma/adapter-pg`) instead of the traditional direct connection.

---

## Tooling & Config

### Linting

- **ESLint ^9** — flat config (`eslint.config.mjs`)
- **eslint-config-next** (16.2.9) — Core Web Vitals + TypeScript

### TypeScript

- `target`: ES2023
- `moduleResolution`: bundler
- `strict`: true
- Path alias: `@/*` → `./*`

### Key Config Files

| File | Purpose |
|---|---|
| `next.config.ts` | Default Next.js config |
| `postcss.config.mjs` | Only `@tailwindcss/postcss` plugin |
| `tsconfig.json` | TypeScript configuration |
| `eslint.config.mjs` | ESLint flat config |
| `prisma/schema.prisma` | Database schema |
| `prisma/prisma.config.ts` | Prisma config with `dotenv` |

### Package.json Scripts

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |

---

## Gaps & Notes

| Area | Status |
|---|---|
| **Testing** | No test framework configured |
| **Docker / CI** | No Dockerfile or CI/CD configs |
| **Deployment** | No specific config; likely Vercel |
| **Monitoring** | None |
| **Email** | No email service (registration is bare-bones) |

---

## Architecture Highlights

- **ESM-only** — all imports use ESM syntax
- **Server components by default** — pages opt into `"use client"` as needed
- **Prisma singleton** — `lib/prisma.ts` uses the v7 driver adapter pattern
- **No ORM sessions** — authentication uses JWT, not database sessions
- **Local-first timezone** — inputs treat datetime-local values as local time, adjusting for `getTimezoneOffset()` before storage
