import {NextResponse} from 'next/server';
import {z} from 'zod';
import {decryptWebflowToken} from '../../../../../lib/webflow-credential';

export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const id=z.string().regex(/^[a-f0-9]{24}$/i);
const record=z.record(z.unknown());
const bundle=z.object({
 version:z.literal(1),siteId:id,
 pages:z.array(z.object({id:z.string().min(1),elements:z.unknown(),settings:record.optional(),interactions:z.unknown().optional()})).max(250).default([]),
 styles:z.array(record).max(30000).default([]),
 components:z.array(record).max(5000).default([]),
 variables:z.array(record).max(10000).default([]),
 assets:z.array(record).max(10000).default([]),
 fonts:z.array(record).max(1000).default([]),
 customCode:z.array(record).max(500).default([]),
 interactions:z.array(record).max(10000).default([])
}).strict();
export async function POST(request:Request){
 const declared=Number(request.headers.get('content-length')||0);
 if(declared>8_000_000)return NextResponse.json({error:'Designer bundle exceeds 8 MB'},{status:413,headers});
 const raw=await request.text();
 if(Buffer.byteLength(raw,'utf8')>8_000_000)return NextResponse.json({error:'Designer bundle exceeds 8 MB'},{status:413,headers});
 let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400,headers});}
 const result=bundle.safeParse(parsed);
 if(!result.success)return NextResponse.json({error:'Invalid Designer bundle',issues:result.error.issues.slice(0,8).map(x=>({path:x.path.join('.'),message:x.message}))},{status:400,headers});
 const token=await decryptWebflowToken().catch(()=>null)||process.env.WEBFLOW_API_TOKEN;
 if(!token)return NextResponse.json({error:'Connect Webflow first'},{status:503,headers});
 try{
  const response=await fetch('https://api.webflow.com/v2/sites/'+result.data.siteId,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)return NextResponse.json({error:'Cannot verify access to bundle site (HTTP '+response.status+')'},{status:403,headers});
 }catch{return NextResponse.json({error:'Unable to verify Webflow site'},{status:502,headers});}
 const b=result.data;
 return NextResponse.json({validated:true,readOnly:true,siteId:b.siteId,summary:{pages:b.pages.length,styles:b.styles.length,components:b.components.length,variables:b.variables.length,assets:b.assets.length,fonts:b.fonts.length,customCode:b.customCode.length,interactions:b.interactions.length},bundle:b,limitations:['Bundle is validated in memory, not persisted to the database.','Designer export must be obtained through an authorized Webflow Designer integration.','Element interactions and custom code are data only and are never executed.']},{headers});
}
