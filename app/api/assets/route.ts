import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';

const schema=z.object({
 siteId:z.string().min(1),
 name:z.string().trim().min(1).max(180),
 url:z.string().url().max(2000).refine(v=>v.startsWith('https://'),'HTTPS image URLs only'),
 alt:z.string().max(500).default(''),
});
export async function GET(request:Request){
 const siteId=new URL(request.url).searchParams.get('siteId');
 if(!siteId)return NextResponse.json({error:'siteId required'},{status:400});
 const assets=await prisma.siteAsset.findMany({where:{siteId},orderBy:{createdAt:'desc'},take:200});
 return NextResponse.json(assets);
}
export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});
 const site=await prisma.site.findUnique({where:{id:parsed.data.siteId},select:{id:true}});
 if(!site)return NextResponse.json({error:'Website not found'},{status:404});
 const asset=await prisma.siteAsset.create({data:parsed.data});
 return NextResponse.json(asset,{status:201});
}
export async function DELETE(request:Request){
 const parsed=z.object({siteId:z.string().min(1),id:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid request'},{status:400});
 const result=await prisma.siteAsset.deleteMany({where:{id:parsed.data.id,siteId:parsed.data.siteId}});
 return NextResponse.json({deleted:result.count});
}
