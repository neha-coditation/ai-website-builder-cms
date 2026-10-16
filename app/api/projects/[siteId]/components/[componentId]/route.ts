import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../../lib/prisma';
const payload=z.object({name:z.string().trim().min(1).max(120).optional(),blocks:z.array(z.object({id:z.string().min(1),type:z.string().min(1),text:z.string()}).passthrough()).min(1).max(500).optional()}).refine(v=>v.name!==undefined||v.blocks!==undefined);
type Context={params:Promise<{siteId:string;componentId:string}>};
export async function PATCH(request:Request,{params}:Context){
 const {siteId,componentId}=await params;
 const parsed=payload.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});
 const updated=await prisma.siteComponent.updateMany({where:{id:componentId,siteId},data:parsed.data});
 if(!updated.count)return NextResponse.json({error:'Component not found'},{status:404});
 const component=await prisma.siteComponent.findUnique({where:{id:componentId}});
 return NextResponse.json(component);
}
export async function DELETE(_request:Request,{params}:Context){
 const {siteId,componentId}=await params;
 const deleted=await prisma.siteComponent.deleteMany({where:{id:componentId,siteId}});
 if(!deleted.count)return NextResponse.json({error:'Component not found'},{status:404});
 return NextResponse.json({ok:true});
}
