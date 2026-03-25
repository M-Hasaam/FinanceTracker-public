# Web app

Quick steps to work on the Next.js app.

## Run locally

From repo root (after `bun install`):

```bash
bun run dev --filter web
```

Then open http://localhost:3000.

## Build

```bash
bun run build --filter web
```

## Lint and typecheck

```bash
bun run lint --filter web
cd apps/web && bun run check-types
```
