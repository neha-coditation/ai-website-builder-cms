import { NextResponse } from 'next/server';
import { getPrisma } from '../../../../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
type B={id:string;type:string;text:string;parentId?:string;componentId?:string;componentInstanceId?:string;componentSourceId?:string;classNames?:string;[key:string]:unknown};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const isBlock=(v:unknown):v is B=>isObject(v)&&typeof v.id==='string'&&typeof v.type==='string'&&typeof v.text==='string';
type Context={params:Promise<{siteId:string;componentId:string}>};
export async function POST(_request:Request,{params}:Context){
  const prisma = getPrisma();
 const {siteId,componentId}=await params;
 const component=await prisma.siteComponent.findFirst({where:{id:componentId,siteId}});
 if(!component)return NextResponse.json({error:'Component not found'},{status:404});
 if(!Array.isArray(component.blocks)||!component.blocks.every(isBlock))return NextResponse.json({error:'Invalid component definition'},{status:422});
 const source=component.blocks as B[];
 const pages=await prisma.page.findMany({where:{siteId},select:{id:true,content:true}});
 let updatedPages=0,updatedInstances=0;
 await prisma.$transaction(async tx=>{
  for(const page of pages){
   if(!isObject(page.content)||!Array.isArray(page.content.blocks))continue;
   const content=page.content as Record<string,unknown>;
   const blocks=(content.blocks as unknown[]).filter(isBlock);
   const instanceIds=[...new Set(blocks.filter(b=>b.componentId===componentId&&b.componentInstanceId).map(b=>b.componentInstanceId!))];
   if(!instanceIds.length)continue;
   let result=[...blocks];
   for(const instanceId of instanceIds){
    const existing=result.filter(b=>b.componentId===componentId&&b.componentInstanceId===instanceId);
    if(!existing.length)continue;
    const root=existing.find(b=>!b.parentId||!existing.some(p=>p.id===b.parentId));
    const outerParent=root?.parentId;
    const position=result.findIndex(b=>b.id===existing[0].id);
    result=result.filter(b=>!(b.componentId===componentId&&b.componentInstanceId===instanceId));
    const idMap=new Map(source.map(b=>[b.id,randomUUID()]));
    const replacements=source.map(b=>({...b,id:idMap.get(b.id)!,parentId:b.parentId?(idMap.get(b.parentId)||outerParent):outerParent,componentId,componentInstanceId:instanceId,componentSourceId:b.id}));
    result.splice(Math.min(position,result.length),0,...replacements);
    updatedInstances++;
   }
   await tx.page.update({where:{id:page.id},data:{content:{...content,blocks:result} as Prisma.InputJsonValue}});
   updatedPages++;
  }
 },{timeout:30000});
 return NextResponse.json({updatedPages,updatedInstances});
}
