import { PrismaClient } from "@prisma/client";

// Keep Prisma's database provider as PostgreSQL. A free hosted PostgreSQL
// instance can be used in local/Node development through DATABASE_URL.
// Cloudflare Workers must use a tested Workers-compatible adapter before
// enabling production database routes; do not silently fall back to an
// incompatible connection in Workers.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
