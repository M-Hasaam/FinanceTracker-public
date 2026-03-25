# @repo/database

Prisma database schema and migrations for the platform.

## Setup

### 1. Environment Variables

This package uses `prisma.config.ts` which requires a `DATABASE_URL` during client generation and at runtime. Ensure you have a `.env` file in the root or set it in your terminal:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### 2. Generate Prisma Client

The Prisma client is generated into the `generated/client` directory. If you encounter a "Could not resolve `../generated/client`" error, run:

```bash
bun run generate
```

## Development

### View Data (Prisma Studio)

```bash
bun run studio
```

### Make Schema Changes

1. Edit `prisma/schema.prisma`
2. Create and apply migration:

```bash
bun run db:migrate:dev
```

### Format Schema

```bash
bun run format
```

## Scripts Reference

- `dev`: Builds the client using `tsup` in watch mode.
- `generate`: Generates the Prisma Client.
- `studio`: Opens Prisma Studio.
- `format`: Formats the `schema.prisma` file.
- `db:migrate:dev`: Creates and applies migrations.
