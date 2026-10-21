import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../../../../../lib/prisma';

const rule=z.object({
 color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
 background:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
 fontSize:z.number().finite().min(8).max(200).optional(),
 padding:z.number().finite().min(0).max(300).optional(),
 radius:z.number().finite().min(0).max(200).optional(),
});
const classes=z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/).max(80),rule).refine(v=>Object.keys(v).length<=100,'Maximum 100 classes');
type Context={params:Promise<{siteId:string}>};
export async function GET(_request:Request,{params}:Context){
  const prisma = getPrisma();
 const {siteId}=await params;
 const site=await prisma.site.findUnique({where:{id:siteId},select:{globalDesign:true}});
 if(!site)return NextResponse.json({error:'Website not found'},{status:404});
 const design=site.globalDesign&&typeof site.globalDesign==='object'&&!Array.isArray(site.globalDesign)?site.globalDesign as Record<string,unknown>:{};
 return NextResponse.json(design.classes||{});
}
export async function PUT(request:Request,{params}:Context){
  const prisma = getPrisma();
 const {siteId}=await params;
 const parsed=classes.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});
 const result=await prisma.$transaction(async tx=>{
  const site=await tx.site.findUnique({where:{id:siteId},select:{globalDesign:true}});
  if(!site)return null;
  const design=site.globalDesign&&typeof site.globalDesign==='object'&&!Array.isArray(site.globalDesign)?site.globalDesign as Record<string,unknown>:{};
  return tx.site.update({where:{id:siteId},data:{globalDesign:{...design,classes:parsed.data} as Prisma.InputJsonValue},select:{id:true}});
 });
 if(!result)return NextResponse.json({error:'Website not found'},{status:404});
 return NextResponse.json({classes:parsed.data});
}
