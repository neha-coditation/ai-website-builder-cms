import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";

const schema = z.object({ siteId: z.string().min(1), title: z.string().min(1), slug: z.string().min(1), content: z.unknown() });

export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  return NextResponse.json(await prisma.page.findMany({ where: { siteId }, orderBy: { updatedAt: "desc" } }));
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { siteId, title, slug, content } = parsed.data;
  const page = await prisma.page.create({ data: { siteId, title, slug, content: content as object } });
  return NextResponse.json(page, { status: 201 });
}
