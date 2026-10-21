import { NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { z } from "zod";
const schema = z.object({ slug: z.string().min(1).optional(), data: z.record(z.unknown()).optional(), status: z.enum(["draft","published"]).optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
 const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 const existing = await prisma.cmsEntry.findUnique({ where: { id } });
 if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
 return NextResponse.json(await prisma.cmsEntry.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.data ? { data: parsed.data.data as object } : {}) } }));
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
 const { id } = await params;
 const existing = await prisma.cmsEntry.findUnique({ where: { id } });
 if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
 await prisma.cmsEntry.delete({ where: { id } });
 return new Response(null, { status: 204 });
}
