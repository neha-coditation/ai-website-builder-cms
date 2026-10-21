'use client';
import { readJsonResponse } from '../../lib/read-json-response';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
type Field = { name: string; type: 'text'|'richText'|'number'|'boolean'|'date'|'image'|'reference' };
type Site = { id:string; name:string };
type Collection = { id:string; name:string; slug:string; fields:Field[]; _count?:{entries:number} };
type Entry = { id:string; slug:string; status:string; data:Record<string,unknown> };
const fieldTypes:Field['type'][]=['text','richText','number','boolean','date','image','reference'];
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function api<T>(path:string, init?:RequestInit):Promise<T>{
 const response=await fetch(path,{...init,headers:{'Content-Type':'application/json',...init?.headers}});
 const payload=await readJsonResponse(response).catch(()=>null);
 if(!response.ok)throw new Error(typeof payload?.error==='string'?payload.error:'Request failed: '+response.status);
 return payload as T;
}
function CmsWorkspace(){
 const searchParams=useSearchParams();
 const requestedSiteId=searchParams.get('siteId')||'';
 const [sites,setSites]=useState<Site[]>([]);const [siteId,setSiteId]=useState('');const [collections,setCollections]=useState<Collection[]>([]);const [collectionId,setCollectionId]=useState('');const [entries,setEntries]=useState<Entry[]>([]);
 const [newCollection,setNewCollection]=useState('');const [fields,setFields]=useState<Field[]>([{name:'title',type:'text'}]);const [entryId,setEntryId]=useState('');const [slug,setSlug]=useState('');const [values,setValues]=useState<Record<string,unknown>>({});const [status,setStatus]=useState<'draft'|'published'>('draft');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const collection=collections.find(c=>c.id===collectionId);
 const refreshSites=async()=>{const data=await api<Site[]>('/api/sites');setSites(data);setSiteId(s=>s||(data.find(x=>x.id===requestedSiteId)?.id)||data[0]?.id||'');};
 const refreshCollections=async(id:string)=>{const data=await api<Collection[]>('/api/collections?siteId='+encodeURIComponent(id));setCollections(data);setCollectionId(c=>data.some(x=>x.id===c)?c:data[0]?.id||'');};
 const refreshEntries=async(id:string)=>{setEntries(await api<Entry[]>('/api/entries?collectionId='+encodeURIComponent(id)));};
 useEffect(()=>{refreshSites().catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(siteId)refreshCollections(siteId).catch(e=>setError(e.message));else{setCollections([]);setCollectionId('');}},[siteId]);
 useEffect(()=>{if(collectionId)refreshEntries(collectionId).catch(e=>setError(e.message));else setEntries([]);setEntryId('');setSlug('');setValues({});setStatus('draft');},[collectionId]);
 const run=async(fn:()=>Promise<void>)=>{setError('');setBusy(true);try{await fn();}catch(e){setError(e instanceof Error?e.message:'Unexpected error');}finally{setBusy(false);}};
 const createCollection=()=>run(async()=>{if(!siteId||!newCollection.trim())return;await api('/api/collections',{method:'POST',body:JSON.stringify({siteId,name:newCollection.trim(),slug:slugify(newCollection),fields})});setNewCollection('');await refreshCollections(siteId);});
 const editEntry=(entry?:Entry)=>{setEntryId(entry?.id||'');setSlug(entry?.slug||'');setValues(entry?.data||{});setStatus(entry?.status==='published'?'published':'draft');};
 const saveEntry=()=>run(async()=>{if(!collectionId||!slug.trim())throw new Error('Entry slug is required');const data={slug:slugify(slug),data:values,status};if(entryId)await api('/api/entries/'+entryId,{method:'PATCH',body:JSON.stringify(data)});else await api('/api/entries',{method:'POST',body:JSON.stringify({collectionId,...data})});await refreshEntries(collectionId);editEntry();});
 const deleteEntry=(entry:Entry)=>{if(!confirm('Delete entry '+entry.slug+'?'))return;run(async()=>{await api('/api/entries/'+entry.id,{method:'DELETE'});await refreshEntries(collectionId);if(entryId===entry.id)editEntry();});};
 return <div className="cms-screen"><div className="cms-top"><div className="cms-breadcrumbs"><Link href="/">← All projects</Link><Link href={"/designer?siteId="+encodeURIComponent(siteId||requestedSiteId)}>← Back to Designer</Link><Link href={"/settings?siteId="+encodeURIComponent(siteId||requestedSiteId)}>Website settings</Link></div><h1>CMS Collections</h1><span>Local development</span></div>{error&&<div className="cms-error" role="alert">{error}</div>}<div className="cms-columns"><aside className="cms-side"><h2>Collections</h2><p className="muted cms-project-label">Project: {sites.find(s=>s.id===siteId)?.name||"Select a project from Dashboard"}</p>{collections.map(c=><button key={c.id} className={'cms-item '+(c.id===collectionId?'is-active':'')} onClick={()=>setCollectionId(c.id)}>{c.name} <small>{c._count?.entries||0}</small></button>)}<h3>New collection</h3><input placeholder="e.g. Blog posts" value={newCollection} onChange={e=>setNewCollection(e.target.value)}/><div className="cms-fields">{fields.map((f,i)=><div key={i} className="cms-field"><input aria-label="Field name" value={f.name} onChange={e=>setFields(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><select aria-label="Field type" value={f.type} onChange={e=>setFields(v=>v.map((x,j)=>j===i?{...x,type:e.target.value as Field['type']}:x))}>{fieldTypes.map(t=><option key={t}>{t}</option>)}</select><button aria-label="Remove field" onClick={()=>setFields(v=>v.filter((_,j)=>j!==i))}>×</button></div>)}</div><button onClick={()=>setFields(v=>[...v,{name:'newField',type:'text'}])}>+ Field</button><button className="primary" disabled={busy||!siteId} onClick={createCollection}>Create collection</button></aside><section className="cms-list"><div className="cms-section-heading"><h2>{collection?.name||'Select a collection'}</h2><button disabled={!collectionId} onClick={()=>editEntry()}>+ New entry</button></div>{entries.length===0?<p className="muted">No entries yet.</p>:entries.map(entry=><div className="cms-entry" key={entry.id}><button onClick={()=>editEntry(entry)}>{entry.slug}<small>{entry.status}</small></button><button onClick={()=>deleteEntry(entry)} disabled={busy} aria-label={'Delete '+entry.slug}>Delete</button></div>)}</section><section className="cms-editor"><h2>{entryId?'Edit entry':'New entry'}</h2>{!collection?<p className="muted">Choose a collection first.</p>:<><label>Slug<input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="my-first-post"/></label>{collection.fields.map(f=><label key={f.name}>{f.name}{f.type==='boolean'?<input type="checkbox" checked={Boolean(values[f.name])} onChange={e=>setValues(v=>({...v,[f.name]:e.target.checked}))}/>:f.type==='richText'?<textarea rows={5} value={String(values[f.name]??'')} onChange={e=>setValues(v=>({...v,[f.name]:e.target.value}))}/>:<input type={f.type==='number'?'number':f.type==='date'?'date':'text'} value={String(values[f.name]??'')} onChange={e=>setValues(v=>({...v,[f.name]:f.type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value}))}/>}</label>)}<label>Status<select value={status} onChange={e=>setStatus(e.target.value as 'draft'|'published')}><option value="draft">Draft</option><option value="published">Published</option></select></label><button className="primary" disabled={busy} onClick={saveEntry}>Save entry</button></>}</section></div></div>;
}

export default function CmsPage(){return <Suspense fallback={<div className="cms-screen">Loading CMS…</div>}><CmsWorkspace/></Suspense>}
