export type MigrationSection={id:string;tag:string;label:string;html:string;visible:boolean};
const sectionTags=new Set(['HEADER','NAV','MAIN','SECTION','ARTICLE','ASIDE','FOOTER']);
export function extractEditableSections(html:string):MigrationSection[]{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const root=doc.body;
 // Keep the complete DOM hierarchy. Only select direct siblings from one container.
 const container=[...root.querySelectorAll('main, [role="main"], body > div, body > main')].find(el=>{
  const children=[...el.children];
  return children.length>=2&&children.filter(child=>sectionTags.has(child.tagName)||/section|hero|footer|nav/i.test(String(child.className))).length>=2;
 })??root;
 return [...container.children].filter(el=>!['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)).slice(0,60).map((el,index)=>({
  id:'section-'+index,tag:el.tagName.toLowerCase(),
  label:(el.querySelector('h1,h2,h3')?.textContent||el.getAttribute('aria-label')||el.getAttribute('class')||el.tagName).trim().slice(0,90),
  html:el.outerHTML,visible:true
 }));
}
export function buildSectionPreview(sourceHtml:string,sections:MigrationSection[]):string{
 const doc=new DOMParser().parseFromString(sourceHtml,'text/html');
 const root=doc.body;
 const container=[...root.querySelectorAll('main, [role="main"], body > div, body > main')].find(el=>{
  const children=[...el.children];
  return children.length>=2&&children.filter(child=>sectionTags.has(child.tagName)||/section|hero|footer|nav/i.test(String(child.className))).length>=2;
 })??root;
 const children=[...container.children].filter(el=>!['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)).slice(0,60);
 // Reorder existing nodes rather than replacing body markup, retaining wrapper CSS and scripts for sanitization.
 const ordered=sections.map(s=>({section:s,node:children[Number(s.id.replace('section-',''))]})).filter(x=>x.node);
 for(const {node} of ordered)node.remove();
 for(const {section,node} of ordered){if(!section.visible)node.setAttribute('hidden','');else node.removeAttribute('hidden');container.appendChild(node);}
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
