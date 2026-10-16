import { prisma } from '../../../../lib/prisma';
type Context={params:Promise<{siteSlug:string}>};
export async function GET(_request:Request,{params}:Context){
 const {siteSlug}=await params;
 const site=await prisma.site.findUnique({where:{slug:siteSlug},select:{slug:true,pages:{select:{slug:true,updatedAt:true}}}});
 if(!site)return new Response('Not found',{status:404});
 // Preview-only sitemap: do not submit to search engines before publishing.
 const base='/sites/'+encodeURIComponent(site.slug);
 const urls=site.pages.map(p=>'<url><loc>'+base+(p.slug==='home'?'':'/'+encodeURIComponent(p.slug))+'</loc><lastmod>'+p.updatedAt.toISOString()+'</lastmod></url>').join('');
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
