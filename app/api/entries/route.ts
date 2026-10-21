import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "../../../lib/prisma";

const schema = z.object({ collectionId: z.string().min(1), slug: z.string().min(1), data: z.record(z.unknown()), status: z.enum(["draft", "published"]).default("draft") });

export async function GET(request: Request) {
  const prisma = getPrisma();
  const collectionId = new URL(request.url).searchParams.get("collectionId");
  if (!collectionId) return NextResponse.json({ error: "collectionId is required" }, { status: 400 });
  return NextResponse.json(await prisma.cmsEntry.findMany({ where: { collectionId }, orderBy: { updatedAt: "desc" } }));
}

export async function POST(request: Request) {
  const prisma = getPrisma();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const entry = await prisma.cmsEntry.create({ data: { ...parsed.data, data: parsed.data.data as object } });
  return NextResponse.json(entry, { status: 201 });
}
