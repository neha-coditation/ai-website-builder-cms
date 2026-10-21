import {NextResponse} from 'next/server';
import {getPrisma} from '../../../../../../../lib/prisma';
import {z} from 'zod';

type Context={params:Promise<{siteId:string;submissionId:string}>};
const schema=z.object({status:z.enum(['new','read','archived'])});

export async function PATCH(request:Request,{params}:Context){
 const prisma=getPrisma();
 const {siteId,submissionId}=await params;
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid status'},{status:400});
 const result=await prisma.formSubmission.updateMany({
  where:{id:submissionId,siteId},data:{status:parsed.data.status}
 });
 if(!result.count)return NextResponse.json({error:'Submission not found'},{status:404});
 return NextResponse.json({ok:true,status:parsed.data.status});
}
