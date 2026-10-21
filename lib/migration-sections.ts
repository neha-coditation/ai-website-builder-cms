export type MigrationSection={id:string;tag:string;label:string;html:string;visible:boolean};
const sectionTags=new Set(['HEADER','NAV','MAIN','SECTION','ARTICLE','ASIDE','FOOTER']);
export function extractEditableSections(html:string):MigrationSection[]{
 const doc=new DOMParser().parseFromString(html,'text/html');
 doc.querySelectorAll('script,iframe,object,embed,form').forEach(el=>el.remove());
 const root=doc.body;
 const candidates=[...root.children].flatMap(el=>{
  if(['DIV','MAIN'].includes(el.tagName)&&el.children.length>1){
   const sections=[...el.children].filter(child=>sectionTags.has(child.tagName)||child.className.toString().includes('section'));
   if(sections.length>=2)return sections;
  }
  return [el];
 }).filter(el=>!['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName));
 return candidates.slice(0,60).map((el,index)=>({
  id:'section-'+(index+1),
  tag:el.tagName.toLowerCase(),
  label:(el.querySelector('h1,h2,h3')?.textContent||el.getAttribute('aria-label')||el.getAttribute('class')||el.tagName).trim().slice(0,90),
  html:el.outerHTML,
  visible:true
 }));
}
export function buildSectionPreview(sourceHtml:string,sections:MigrationSection[]):string{
 const doc=new DOMParser().parseFromString(sourceHtml,'text/html');
 doc.body.innerHTML=sections.filter(s=>s.visible).map(s=>s.html).join('\n');
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
