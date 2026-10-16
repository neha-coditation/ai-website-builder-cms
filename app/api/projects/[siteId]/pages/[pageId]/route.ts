import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../../../../lib/prisma';

const style = z.object({ color: z.string().optional(), background: z.string().optional(), fontSize: z.number().finite().min(0).max(500).optional(), padding: z.number().finite().min(0).max(1000).optional(), radius: z.number().finite().min(0).max(1000).optional(), align: z.enum(['left','center','right']).optional() }).optional();
const block = z.object({ id: z.string().min(1).max(120), type: z.enum(['heading','paragraph','button','image']), text: z.string().max(100000), style });
const schema = z.object({ content: z.object({ name: z.string().trim().min(1).max(120), blocks: z.array(block).max(1000) }) });
type Context = { params: Promise<{ siteId: string; pageId: string }> };
export async function PUT(request: Request, { params }: Context) {
  const { siteId, pageId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const page = await prisma.page.findFirst({ where: { id: pageId, siteId }, select: { id: true } });
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  const saved = await prisma.page.update({ where: { id: pageId }, data: { content: parsed.data.content as Prisma.InputJsonValue }, select: { id: true, updatedAt: true } });
  return NextResponse.json({ page: saved });
}
export async function DELETE(_request: Request, { params }: Context) {
  const { siteId, pageId } = await params;
  const page = await prisma.page.findFirst({ where: { id: pageId, siteId }, select: { id: true, slug: true } });
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  if (page.slug === 'home') return NextResponse.json({ error: 'The home page cannot be deleted' }, { status: 400 });
  await prisma.page.delete({ where: { id: pageId } });
  return NextResponse.json({ deleted: true });
}
