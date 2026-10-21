import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const origin="https://api.webflow.com/v2";
export async function POST(req:NextRequest){
 try{
  if(Number(req.headers.get("content-length")||"0")>10000)return NextResponse.json({error:"Request too large."},{status:413});
  const body=await req.json();
  if(body.platform!=="webflow"||typeof body.token!=="string"||typeof body.siteId!=="string"||body.token.length<10||body.token.length>2000||!/^[a-zA-Z0-9_-]{8,80}$/.test(body.siteId))return NextResponse.json({error:"Provide a valid Webflow site ID and API token."},{status:400});
  const headers={Authorization:"Bearer "+body.token,Accept:"application/json"};
  const siteResponse=await fetch(origin+"/sites/"+encodeURIComponent(body.siteId),{headers,cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!siteResponse.ok)return NextResponse.json({error:siteResponse.status===401||siteResponse.status===403?"Webflow token lacks permission or is invalid.":"Webflow site lookup failed (HTTP "+siteResponse.status+")."},{status:siteResponse.status===401||siteResponse.status===403?403:502});
  const site=await siteResponse.json();
  const pageResponse=await fetch(origin+"/sites/"+encodeURIComponent(body.siteId)+"/pages?limit=100",{headers,cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!pageResponse.ok)return NextResponse.json({error:"Webflow pages API failed (HTTP "+pageResponse.status+"). Confirm sites:read and pages:read permissions."},{status:502});
  const result=await pageResponse.json();
  const pages=Array.isArray(result.pages)?result.pages:[];
  return NextResponse.json({siteName:String(site.displayName||site.shortName||site.name||"Webflow site"),siteId:String(body.siteId),pages:pages.map((p:{id?:string;title?:string;slug?:string})=>({id:String(p.id||""),title:String(p.title||""),slug:String(p.slug||"")})),notes:["Connected to Webflow API v2 with the supplied token.","Retrieved site details and up to 100 pages.","No content was changed and the token was not persisted."]},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Could not connect to Webflow. Verify credentials and network access."},{status:400,headers:{"cache-control":"no-store"}})}
}
