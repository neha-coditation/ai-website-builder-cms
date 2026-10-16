import {NextResponse} from 'next/server';
import {prisma} from '../../../lib/prisma';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
const schema=z.object({siteId:z.string().min(1),formId:z.string().min(1).max(120),pageSlug:z.string().max(300),fields:z.record(z.string().max(5000)),website:z.string().max(200).optional()});
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin){try{if(new URL(origin).host!==request.headers.get('host'))return NextResponse.json({error:'Origin not allowed'},{status:403});}catch{return NextResponse.json({error:'Invalid origin'},{status:403});}}
 const length=Number(request.headers.get('content-length')||0);
 if(length>20000)return NextResponse.json({error:'Submission too large'},{status:413});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid form data'},{status:400});
 const {siteId,formId,pageSlug,fields,website}=parsed.data;
 if(website)return NextResponse.json({ok:true});
 if(Object.keys(fields).length>30)return NextResponse.json({error:'Too many fields'},{status:400});
 const site=await prisma.site.findUnique({where:{id:siteId},select:{id:true,pages:{select:{slug:true,content:true}}}});
 if(!site)return NextResponse.json({error:'Website not found'},{status:404});
 const page=site.pages.find(p=>p.slug===pageSlug);
 if(!page||!page.content||typeof page.content!=='object'||Array.isArray(page.content))return NextResponse.json({error:'Form not found'},{status:404});
 const blocks=(page.content as Record<string,unknown>).blocks;
 if(!Array.isArray(blocks)||!blocks.some(b=>b&&typeof b==='object'&&(b as Record<string,unknown>).id===formId&&(b as Record<string,unknown>).type==='form'))return NextResponse.json({error:'Form not found'},{status:404});
 const data:Record<string,string>={};
 for(const [key,value] of Object.entries(fields)){if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(key))return NextResponse.json({error:'Invalid field name'},{status:400});data[key]=value.trim();}
 if(!data.name||!data.email||!z.string().email().safeParse(data.email).success)return NextResponse.json({error:'Name and valid email are required'},{status:400});
 await prisma.formSubmission.create({data:{siteId,formId,pageSlug,data:data as Prisma.InputJsonValue}});
 return NextResponse.json({ok:true},{status:201});
}
