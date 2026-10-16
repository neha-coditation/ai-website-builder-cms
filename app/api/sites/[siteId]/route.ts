import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../lib/prisma';

const globalDesignSchema = z.object({
  logoText: z.string().max(120).default(''),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3064fe'),
  bodyTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#131827'),
  pageBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  fontFamily: z.enum(['Inter','Arial','Georgia','system-ui']).default('Inter'),
  headerBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  headerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#131827'),
  footerText: z.string().max(300).default(''),
  footerBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  footerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#697386'),
});
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500),
  defaultTitle: z.string().max(120),
  faviconUrl: z.union([z.literal(''),z.string().url().max(2000)]),
  globalDesign: globalDesignSchema,
});
type Context = { params: Promise<{ siteId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true, slug: true, description: true, defaultTitle: true, faviconUrl: true, globalDesign: true } });
  if (!site) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  return NextResponse.json(site);
}
export async function PATCH(request: Request, { params }: Context) {
  const { siteId } = await params;
  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const exists = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, globalDesign: true } });
  if (!exists) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  return NextResponse.json(await prisma.site.update({ where: { id: siteId }, data: { ...parsed.data, globalDesign: { ...(exists.globalDesign && typeof exists.globalDesign==='object' && !Array.isArray(exists.globalDesign) ? exists.globalDesign as Record<string,unknown> : {}), ...parsed.data.globalDesign } as Prisma.InputJsonValue } }));
}
