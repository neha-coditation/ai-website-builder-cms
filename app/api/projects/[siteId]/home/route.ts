import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';

const block = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(['heading', 'paragraph', 'button', 'image', 'cms-list','container']),
  text: z.string().max(100000),
  collectionId: z.string().max(120).optional(),
  displayField: z.string().max(120).optional(), parentId: z.string().max(120).optional(), layout: z.enum(['column','row','grid']).optional(), gap: z.number().finite().min(0).max(200).optional(), columns: z.number().int().min(1).max(6).optional(),
  style: z.object({
    color: z.string().optional(),
    background: z.string().optional(),
    fontSize: z.number().finite().min(0).max(500).optional(),
    padding: z.number().finite().min(0).max(1000).optional(),
    radius: z.number().finite().min(0).max(1000).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    width: z.enum(['auto','full','half']).optional(),
    maxWidth: z.number().finite().min(100).max(2000).optional(),
    marginTop: z.number().finite().min(0).max(500).optional(),
    marginBottom: z.number().finite().min(0).max(500).optional(),
  }).optional(),
});
const documentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  blocks: z.array(block).max(1000),
});

type Context = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true } });
  if (!site) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const page = await prisma.page.findUnique({
    where: { siteId_slug: { siteId, slug: 'home' } },
    select: { id: true, content: true, updatedAt: true },
  });
  return NextResponse.json({ site, page });
}

export async function PUT(request: Request, { params }: Context) {
  const { siteId } = await params;
  const payload = documentSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  const exists = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const page = await prisma.page.upsert({
    where: { siteId_slug: { siteId, slug: 'home' } },
    create: { siteId, slug: 'home', title: 'Home', content: payload.data as Prisma.InputJsonValue },
    update: { content: payload.data as Prisma.InputJsonValue },
    select: { id: true, updatedAt: true },
  });
  return NextResponse.json({ page });
}
