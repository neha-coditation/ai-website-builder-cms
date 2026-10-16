import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { mkdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:Request){
 const data=await request.formData().catch(()=>null);
 const siteId=data?.get('siteId'),file=data?.get('file');
 if(typeof siteId!=='string'||!(file instanceof File))return NextResponse.json({error:'Site and video are required'},{status:400});
 if(!['video/mp4','video/webm'].includes(file.type)||!file.size||file.size>50_000_000)return NextResponse.json({error:'Upload an MP4 or WebM video up to 50 MB'},{status:400});
 const site=await prisma.site.findUnique({where:{id:siteId},select:{id:true}});
 if(!site)return NextResponse.json({error:'Site not found'},{status:404});
 const ext=file.type==='video/mp4'?'mp4':'webm';
 const name=randomUUID()+'.'+ext;
 const folder=join(process.cwd(),'public','uploads',siteId);
 await mkdir(folder,{recursive:true});
 await writeFile(join(folder,name),Buffer.from(await file.arrayBuffer()));
 return NextResponse.json({url:'/uploads/'+siteId+'/'+name},{status:201});
}
