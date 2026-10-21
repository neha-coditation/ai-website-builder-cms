'use client';
import { useState } from 'react';
import Link from 'next/link';
type Result = {
  site: { name: string; shortName: string };
  summary: { pages: number; collections: number; assets: number };
  pages: { id: string; title: string; path: string; seoTitle: string }[];
  collections: { id: string; name: string; slug: string }[];
  warnings: string[];
};
export default function ImportWebsite() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function analyze() {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const data = new FormData(); data.append('file', file);
      const response = await fetch('/api/import/webflow-export', { method: 'POST', body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Import analysis failed');
      setResult(body);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); }
    finally { setLoading(false); }
  }
  return <main style={{maxWidth:1100,margin:'48px auto',padding:'0 24px',color:'inherit'}}>
    <Link href="/">← Dashboard</Link>
    <p style={{marginTop:36,opacity:.65}}>WEBSITE MIGRATION</p>
    <h1>Import website</h1>
    <p>Upload a Webflow combined export to inspect pages, CMS collections, SEO metadata, and assets. Nothing is published or changed.</p>
    <section style={{padding:28,border:'1px solid #64748b55',borderRadius:16,marginTop:28}}>
      <label htmlFor="site-zip">Webflow export ZIP</label>
      <div style={{marginTop:16}}><input id="site-zip" type="file" accept=".zip,application/zip" onChange={e=>setFile(e.target.files?.[0]??null)}/></div>
      <button onClick={analyze} disabled={!file||loading} style={{padding:'12px 20px',marginTop:20,borderRadius:8,background:'#3064fe',color:'white',border:0,cursor:'pointer'}}>{loading?'Analyzing…':'Analyze export'}</button>
      {error && <p role="alert" style={{color:'#ef4444'}}>{error}</p>}
    </section>
    {result && <section style={{marginTop:36}}>
      <h2>{result.site.name} — import preview</h2>
      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
        {Object.entries(result.summary).map(([key,value])=><div key={key} style={{border:'1px solid #64748b55',borderRadius:12,padding:20,minWidth:140}}><strong style={{fontSize:28}}>{value}</strong><div>{key}</div></div>)}
      </div>
      <h3>Pages</h3>
      <div style={{maxHeight:300,overflow:'auto'}}>{result.pages.map(p=><div key={p.id} style={{padding:12,borderBottom:'1px solid #64748b44'}}><strong>{p.title||p.path||'Untitled'}</strong> <span style={{opacity:.65}}>{p.path}</span></div>)}</div>
      <h3>CMS collections</h3>
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>{result.collections.map(c=><span key={c.id} style={{padding:10,border:'1px solid #64748b55',borderRadius:8}}>{c.name}</span>)}</div>
      <h3>Migration limitations</h3>
      <ul>{result.warnings.map(w=><li key={w}>{w}</li>)}</ul>
    </section>}
  </main>;
}
