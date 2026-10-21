import { NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { z } from "zod";
const schema = z.object({ name: z.string().min(1).optional(), fields: z.array(z.object({ name: z.string().min(1), type: z.enum(["text","richText","number","boolean","date","image","reference"]) })).optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
 const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 const existing = await prisma.cmsCollection.findUnique({ where: { id } });
 if (!existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
 return NextResponse.json(await prisma.cmsCollection.update({ where: { id }, data: parsed.data }));
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
 const { id } = await params;
 const existing = await prisma.cmsCollection.findUnique({ where: { id } });
 if (!existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
 await prisma.cmsCollection.delete({ where: { id } });
 return new Response(null, { status: 204 });
}
