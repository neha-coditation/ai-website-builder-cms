import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const siteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

function reportDatabaseFailure(operation: string, error: unknown) {
  const details = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: String(error) };
  // Only log server-side. Do not expose connection strings or credentials in API responses.
  console.error("[api/sites] " + operation + " failed", details);
  return NextResponse.json(
    { error: "Database request failed. Check the Worker server logs." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    // Import within the handler so initialization errors are logged too.
    const { prisma } = await import("../../../lib/prisma");
    const sites = await prisma.site.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(sites);
  } catch (error) {
    return reportDatabaseFailure("GET", error);
  }
}

export async function POST(request: Request) {
  const parsed = siteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const { prisma } = await import("../../../lib/prisma");
    const exists = await prisma.site.findUnique({ where: { slug: parsed.data.slug } });
    if (exists) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    const site = await prisma.site.create({ data: parsed.data });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return reportDatabaseFailure("POST", error);
  }
}
