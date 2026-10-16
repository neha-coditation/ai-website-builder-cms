import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const data = await request.formData();
  const siteId = data.get('siteId');
  const file = data.get('file');
  if (typeof siteId !== 'string' || !(file instanceof File)) return NextResponse.json({error:'Missing site or image'}, {status:400});
  const extensions:Record<string,string> = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  const extension = extensions[file.type];
  if (!extension || file.size > 10_000_000 || file.size === 0) return NextResponse.json({error:'Use a PNG, JPEG or WebP image under 10 MB'}, {status:400});
  const site = await prisma.site.findUnique({where:{id:siteId},select:{id:true}});
  if (!site) return NextResponse.json({error:'Site not found'}, {status:404});
  const filename = randomUUID()+'.'+extension;
  const folder = join(process.cwd(),'public','uploads',siteId);
  await mkdir(folder,{recursive:true});
  await writeFile(join(folder,filename),Buffer.from(await file.arrayBuffer()));
  const asset = await prisma.siteAsset.create({data:{siteId,name:file.name.slice(0,180),url:'/uploads/'+siteId+'/'+filename}});
  return NextResponse.json(asset,{status:201});
}
