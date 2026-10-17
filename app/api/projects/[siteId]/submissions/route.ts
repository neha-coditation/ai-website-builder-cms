import {NextResponse} from 'next/server';
import {prisma} from '../../../../../lib/prisma';
type Context={params:Promise<{siteId:string}>};
export async function GET(request:Request,{params}:Context){
 const {siteId}=await params;
 const site=await prisma.site.findUnique({where:{id:siteId},select:{id:true}});
 if(!site)return NextResponse.json({error:'Site not found'},{status:404});
 const url=new URL(request.url);const formId=url.searchParams.get('formId')||undefined;
 const submissions=await prisma.formSubmission.findMany({where:{siteId,...(formId?{formId}:{})},orderBy:{createdAt:'desc'},take:500});
 return NextResponse.json({submissions},{headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
}
