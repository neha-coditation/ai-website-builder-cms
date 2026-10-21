import {NextResponse} from 'next/server';
import {decryptWebflowToken} from '../credentials/route';

const BASE='https://api.webflow.com/v2';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
type Json=Record<string,unknown>;
async function webflow(path:string,token:string):Promise<Json>{
 const response=await fetch(BASE+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(response.status===401||response.status===403?'Webflow token lacks access to this resource.':'Webflow returned HTTP '+response.status);
 return await response.json() as Json;
}
export async function GET(request:Request){
 const token=await decryptWebflowToken().catch(()=>null) || process.env.WEBFLOW_API_TOKEN;
 if(!token)return NextResponse.json({error:'Webflow is not configured. Connect Webflow with an API token first.'},{status:503,headers});
 const url=new URL(request.url);
 const siteId=url.searchParams.get('siteId');
 if(siteId!==null&&!/^[a-f0-9]{24}$/i.test(siteId))return NextResponse.json({error:'Invalid Webflow site ID'},{status:400,headers});
 try{
  if(!siteId){
   const result=await webflow('/sites?limit=100',token);
   return NextResponse.json({sites:Array.isArray(result.sites)?result.sites:[],pagination:result.pagination??null,readOnly:true},{headers});
  }
  const encoded=encodeURIComponent(siteId);
  const [site,pages,collections]=await Promise.all([
   webflow('/sites/'+encoded,token),
   webflow('/sites/'+encoded+'/pages?limit=100',token),
   webflow('/sites/'+encoded+'/collections?limit=100',token)
  ]);
  return NextResponse.json({site,pages:Array.isArray(pages.pages)?pages.pages:[],collections:Array.isArray(collections.collections)?collections.collections:[],pagination:{pages:pages.pagination??null,collections:collections.pagination??null},readOnly:true,notes:['This is a read-only Webflow API inventory, not an editable migration.','Additional pages and collections may require pagination.','Visual elements, responsive styles, interactions and CMS entries need separate extraction and conversion.']},{headers});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Webflow request failed'},{status:502,headers});}
}
