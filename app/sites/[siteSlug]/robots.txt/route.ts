import { prisma } from '../../../../lib/prisma';
type Context={params:Promise<{siteSlug:string}>};
export async function GET(_request:Request,{params}:Context){
 const {siteSlug}=await params;
 const site=await prisma.site.findUnique({where:{slug:siteSlug},select:{id:true}});
 if(!site)return new Response('Not found',{status:404});
 // Preview routes are never intended for indexing. Site robots draft is not published here.
 return new Response('User-agent: *\nDisallow: /sites/'+siteSlug+'/\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
