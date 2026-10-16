import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

const siteSchema = z.object({ name: z.string().trim().min(1).max(120), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });

export async function GET() {
  return NextResponse.json(await prisma.site.findMany({ orderBy: { updatedAt: "desc" } }));
}

export async function POST(request: Request) {
  const parsed = siteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const exists = await prisma.site.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  const site = await prisma.site.create({ data: parsed.data });
  return NextResponse.json(site, { status: 201 });
}
