import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Create inside the request handler. Cloudflare forbids sharing request-owned
// sockets and in-flight Prisma initialization promises across requests.
export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Configure the Neon connection string.");
  }

  // Workers cannot reuse a socket created by an earlier request.
  const adapter = new PrismaNeon({ connectionString, maxUses: 1, idleTimeoutMillis: 0 });
  return new PrismaClient({ adapter });
}
