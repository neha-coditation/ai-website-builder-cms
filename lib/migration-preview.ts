/**
 * Browser-only, read-only HTML snapshot. Runs in an opaque-origin sandboxed iframe.
 * No scripts, forms, navigation, or same-origin permissions are granted.
 */
export function createMigrationPreview(html:string,pageUrl:string):string {
 const url=new URL(pageUrl);
 if(url.protocol!=='https:'||url.hostname!=='www.coditation.com')throw new Error('Unexpected preview source');
 const doc=new DOMParser().parseFromString(html,'text/html');
 doc.querySelectorAll('script,iframe,frame,frameset,object,embed,applet,form,base,meta[http-equiv],link[rel="preload"],link[rel="modulepreload"],link[rel="prefetch"],link[rel="preconnect"]').forEach(node=>node.remove());
 doc.querySelectorAll('*').forEach(element=>{
  for(const attr of [...element.attributes]){
   if(/^on/i.test(attr.name)||attr.name==='srcdoc'||attr.name==='formaction')element.removeAttribute(attr.name);
   if(['href','src','action','poster','xlink:href'].includes(attr.name)&&/^\s*(?:javascript|data|vbscript):/i.test(attr.value))element.removeAttribute(attr.name);
  }
  if(element.tagName==='A'){element.removeAttribute('href');element.setAttribute('title','Navigation disabled in read-only preview');}
 });
 const base=doc.createElement('base');base.href=url.href;doc.head.prepend(base);
 const csp=doc.createElement('meta');csp.setAttribute('http-equiv','Content-Security-Policy');csp.setAttribute('content',"default-src 'none'; img-src https: data:; style-src https: 'unsafe-inline'; font-src https: data:; script-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'");
 doc.head.prepend(csp);
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
