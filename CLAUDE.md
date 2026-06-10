# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NeonCortex** is a "Second Brain" personal memory management app with a Cyberpunk/Matrix aesthetic. It organizes information into three temporal memory tiers: RAM (short-term), Cache (medium-term), and Vault/Hard Drive (long-term).

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

### Database

```bash
npx prisma db push          # Apply schema changes to SQLite dev.db
npx prisma studio           # Open Prisma GUI to inspect data
npx prisma generate         # Regenerate Prisma client after schema changes
```

The SQLite file is at `prisma/dev.db`. `DATABASE_URL=file:./dev.db` is in `.env`.

## Architecture

### Data Model — the `MemoryNode` table

The Prisma model uses `level` internally (`"SHORT" | "MEDIUM" | "LONG"`), but the REST API maps it to `category` in all responses. This mismatch is intentional — don't collapse it without updating both the API routes and the frontend.

Key field notes:
- `tags` is stored as a comma-separated string in SQLite, serialized/deserialized to an array at the API layer.
- `linkedIds` and `metadata` are stored as JSON strings and parsed at the API layer.
- `targetDate` is only meaningful for `MEDIUM` level entries.

### API Routes

- `GET/POST /api/memories` — fetch all or create a memory
- `PATCH /api/memories/[id]` — update status, category (→ `level`), content, or `target_date`
- `DELETE /api/memories/[id]` — delete a memory

### Frontend Components

- **`src/app/page.tsx`** — the single page; owns all state (memories array) and all API calls. Child components call the handlers passed as props.
- **`src/components/MemoryColumn.tsx`** — renders one panel (RAM, Cache, or Vault) with its inline add/edit form. Exports the `MemoryItem` TypeScript interface used throughout.
- **`src/components/TerminalConsole.tsx`** — CLI-style input bar. `/help` and `/clear` are handled internally; all other commands are forwarded to `handleTerminalCommand` in `page.tsx`.
- **`src/components/BootSequence.tsx`** — animated splash screen shown on first load per browser session (tracked via `sessionStorage['neoncortex_booted']`).
- **`src/components/MatrixRain.tsx`** — canvas-based falling characters background.
- **`src/utils/audio.ts`** — Web Audio API helpers (`playClick`, `playHover`) for sound effects.
- **`src/lib/prisma.ts`** — singleton Prisma client (prevents connection pool exhaustion during Next.js hot reloads).

### Terminal Commands (CLI)

Parsed in `handleTerminalCommand` in `page.tsx`:

| Command | Description |
|---|---|
| `/ram <text>` | Add to SHORT-term RAM |
| `/cache <days> <text>` | Add to MEDIUM Cache, scheduled N days out |
| `/hdd <text>` | Add to LONG-term Vault |
| `/promote "<search>" hdd` | Move a matching memory to LONG |
| `/promote "<search>" cache <days>` | Move a matching memory to MEDIUM |

### Styling

All CSS variables (colors, fonts) are defined in `src/app/globals.css` under `:root`. Utility classes (`terminal-panel`, `cyber-button`, `glitch-text`, `terminal-glow`) are global. Per-page layout uses CSS Modules (`page.module.css`). The three columns are color-coded: green (RAM), purple (Cache), red (Vault).

### Database seeding

If the database returns 0 records on first load, `page.tsx` auto-seeds it with the mock data in `INITIAL_MEMORIES`. This runs once client-side and does not require a separate seed script.
