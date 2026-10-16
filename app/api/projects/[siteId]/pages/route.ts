import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';

const blockSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(['heading','paragraph','button','image']),
  text: z.string().max(100000),
  style: z.object({
    color: z.string().optional(),
    background: z.string().optional(),
    fontSize: z.number().finite().min(0).max(500).optional(),
    padding: z.number().finite().min(0).max(1000).optional(),
    radius: z.number().finite().min(0).max(1000).optional(),
    align: z.enum(['left','center','right']).optional(),
  }).optional(),
});
const contentSchema = z.object({ name: z.string().trim().min(1).max(120), blocks: z.array(blockSchema).max(1000) });
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const createSchema = z.object({ title: z.string().trim().min(1).max(120), slug: slugSchema });
const saveSchema = z.object({ content: contentSchema });
type Context = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true } });
  if (!site) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const pages = await prisma.page.findMany({ where: { siteId }, select: { id: true, slug: true, title: true, content: true, updatedAt: true }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ site, pages });
}
export async function POST(request: Request, { params }: Context) {
  const { siteId } = await params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true } });
  if (!site) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const exists = await prisma.page.findUnique({ where: { siteId_slug: { siteId, slug: parsed.data.slug } }, select: { id: true } });
  if (exists) return NextResponse.json({ error: 'Page URL already exists' }, { status: 409 });
  const content = { name: site.name, blocks: [] };
  const page = await prisma.page.create({ data: { siteId, ...parsed.data, content } });
  return NextResponse.json(page, { status: 201 });
}
