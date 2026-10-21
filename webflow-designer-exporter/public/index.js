/* Runs only inside an authorized Webflow Designer Extension. No source-site writes. */
const status=document.getElementById('status');
const text=(value)=>{status.textContent=value;};
async function attempt(obj,method,...args){try{return typeof obj?.[method]==='function'?await obj[method](...args):null;}catch{return null;}}
function safe(value){try{return JSON.parse(JSON.stringify(value));}catch{return null;}}
async function exportPage(){
 const siteId=document.getElementById('siteId').value.trim();
 const pageId=document.getElementById('pageId').value.trim();
 if(!/^[a-f0-9]{24}$/i.test(siteId)||!pageId){text('Enter the selected Webflow site ID and current page ID.');return;}
 if(typeof webflow==='undefined'){text('Open this app inside the Webflow Designer.');return;}
 text('Reading current Designer page...');
 const elements=await webflow.getAllElements();
 const serialized=[];
 for(const element of elements){
  const styles=await attempt(element,'getStyles');
  serialized.push({id:safe(element.id),type:element.type??null,parentId:safe(await attempt(element,'getParent')),children:safe((await attempt(element,'getChildren'))?.map(e=>e.id)??[]),tag:await attempt(element,'getTag'),text:await attempt(element,'getTextContent'),attributes:safe(await attempt(element,'getCustomAttributes')),styleIds:Array.isArray(styles)?styles.map(s=>s.id):[],componentId:safe(element.componentId??null)});
 }
 const allStyles=await attempt(webflow,'getAllStyles')||[];
 const styleRecords=[];
 for(const style of allStyles){
  const properties=await attempt(style,'getProperties');
  styleRecords.push({id:style.id,name:style.name??await attempt(style,'getName'),type:style.type??null,properties:safe(properties)});
 }
 const components=await attempt(webflow,'getAllComponents')||[];
 const componentRecords=[];
 for(const component of components){componentRecords.push({id:component.id,name:component.name??await attempt(component,'getName')});}
 const variables=await attempt(webflow,'getAllVariables')||[];
 const variableRecords=[];
 for(const variable of variables){variableRecords.push({id:variable.id,name:variable.name??await attempt(variable,'getName'),type:variable.type??null});}
 const payload={version:1,siteId,pages:[{id:pageId,elements:serialized}],styles:styleRecords,components:componentRecords,variables:variableRecords,assets:[],fonts:[],customCode:[],interactions:[]};
 const json=JSON.stringify(payload,null,2);
 const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='webflow-designer-'+pageId+'.json';link.click();URL.revokeObjectURL(url);
 text('Exported '+serialized.length+' elements, '+styleRecords.length+' styles and '+componentRecords.length+' components. Other categories may require additional extraction. Import this JSON in the builder.'); 
}
document.getElementById('export').addEventListener('click',()=>{exportPage().catch(e=>text('Export failed: '+e.message));});
