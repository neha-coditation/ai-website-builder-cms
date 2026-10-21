import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "../../../lib/prisma";

const schema = z.object({ siteId: z.string().min(1), name: z.string().min(1), slug: z.string().min(1), fields: z.array(z.object({ name: z.string().min(1), type: z.enum(["text", "richText", "number", "boolean", "date", "image", "reference"]) })) });

export async function GET(request: Request) {
  const prisma = getPrisma();
  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  return NextResponse.json(await prisma.cmsCollection.findMany({ where: { siteId }, include: { _count: { select: { entries: true } } } }));
}

export async function POST(request: Request) {
  const prisma = getPrisma();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const collection = await prisma.cmsCollection.create({ data: parsed.data });
  return NextResponse.json(collection, { status: 201 });
}
