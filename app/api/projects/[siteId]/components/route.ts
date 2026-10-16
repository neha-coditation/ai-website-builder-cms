import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';
const block=z.object({id:z.string().min(1),type:z.string().min(1),text:z.string(),parentId:z.string().optional(),classNames:z.string().optional(),style:z.record(z.unknown()).optional()}).passthrough();
const payload=z.object({name:z.string().trim().min(1).max(120),blocks:z.array(block).min(1).max(500)});
type Context={params:Promise<{siteId:string}>};
export async function GET(_request:Request,{params}:Context){
 const {siteId}=await params;
 const items=await prisma.siteComponent.findMany({where:{siteId},orderBy:{createdAt:'asc'}});
 return NextResponse.json({components:items});
}
export async function POST(request:Request,{params}:Context){
 const {siteId}=await params;
 const parsed=payload.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});
 const site=await prisma.site.findUnique({where:{id:siteId},select:{id:true}});
 if(!site)return NextResponse.json({error:'Site not found'},{status:404});
 const component=await prisma.siteComponent.create({data:{siteId,name:parsed.data.name,blocks:parsed.data.blocks}});
 return NextResponse.json(component,{status:201});
}
