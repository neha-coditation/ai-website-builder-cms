'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Database, LayoutTemplate, Save, Settings2 } from 'lucide-react';

type GlobalDesign = { primaryColor:string;bodyTextColor:string;pageBackground:string;fontFamily:'Inter'|'Arial'|'Georgia'|'system-ui';logoText:string; headerBackground:string; headerTextColor:string; footerText:string; footerBackground:string; footerTextColor:string };
const defaults: GlobalDesign = { primaryColor:'#3064fe',bodyTextColor:'#131827',pageBackground:'#ffffff',fontFamily:'Inter',logoText:'',headerBackground:'#ffffff',headerTextColor:'#131827',footerText:'',footerBackground:'#ffffff',footerTextColor:'#697386' };
type Settings = { globalDesign: GlobalDesign; id:string; name:string; slug:string; description:string; defaultTitle:string; faviconUrl:string };
function SiteSettings() {
  const params = useSearchParams();
  const siteId = params.get('siteId') || '';
  const [site,setSite] = useState<Settings|null>(null);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  const [saving,setSaving] = useState(false);
  useEffect(()=>{
    if (!siteId) { setError('Open website settings from the dashboard.'); return; }
    let active=true;
    fetch('/api/sites/'+encodeURIComponent(siteId),{cache:'no-store'})
      .then(async response=>{if(!response.ok)throw new Error('Website not found.');return response.json();})
      .then((data:Settings)=>{if(active)setSite({...data,globalDesign:{...defaults,...data.globalDesign}});})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Could not load settings.');});
    return ()=>{active=false;};
  },[siteId]);
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!site||saving)return;
    setSaving(true);setError('');setSaved(false);
    try {
      const response=await fetch('/api/sites/'+encodeURIComponent(siteId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:site.name,description:site.description,defaultTitle:site.defaultTitle,faviconUrl:site.faviconUrl,globalDesign:site.globalDesign})});
      if(!response.ok)throw new Error('Unable to save website settings ('+response.status+').');
      setSite(await response.json());setSaved(true);
    }catch(cause){setError(cause instanceof Error?cause.message:'Save failed.');}
    finally{setSaving(false);}
  }
  return <div className="site-settings-screen"><div className="site-settings-header"><Link href="/"><ArrowLeft size={16}/> Dashboard</Link><div className="site-settings-nav"><Link href={'/designer?siteId='+encodeURIComponent(siteId)}><LayoutTemplate size={16}/> Designer</Link><Link href={'/cms?siteId='+encodeURIComponent(siteId)}><Database size={16}/> CMS</Link></div></div><main className="site-settings-main"><div className="site-settings-intro"><Settings2 size={25}/><div><p>WEBSITE SETTINGS</p><h1>{site?.name||'Website settings'}</h1><span>Manage project-wide information separately from individual page settings.</span></div></div>{error&&<p className="site-settings-error" role="alert">{error}</p>}{site&&<form onSubmit={save} className="site-settings-form"><label htmlFor="site-name">Website name</label><input id="site-name" required maxLength={120} value={site.name} onChange={e=>setSite({...site,name:e.target.value})}/><label htmlFor="site-slug">Website identifier</label><input id="site-slug" value={site.slug} disabled/><p>The website identifier cannot be changed here.</p><label htmlFor="site-description">Website description</label><textarea id="site-description" rows={4} maxLength={500} value={site.description} onChange={e=>setSite({...site,description:e.target.value})}/><label htmlFor="site-default-title">Default SEO title</label><input id="site-default-title" maxLength={120} value={site.defaultTitle} onChange={e=>setSite({...site,defaultTitle:e.target.value})}/><label htmlFor="site-favicon">Favicon URL</label><input id="site-favicon" type="url" placeholder="https://example.com/favicon.ico" value={site.faviconUrl} onChange={e=>setSite({...site,faviconUrl:e.target.value})}/><div className="site-global-heading"><h2>Global styles</h2><p>These defaults apply to all pages unless an element overrides them.</p></div><label htmlFor="site-primary-color">Primary / button color</label><input id="site-primary-color" type="color" value={site.globalDesign.primaryColor} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,primaryColor:e.target.value}})}/><label htmlFor="site-body-text">Body text color</label><input id="site-body-text" type="color" value={site.globalDesign.bodyTextColor} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,bodyTextColor:e.target.value}})}/><label htmlFor="site-page-bg">Page background</label><input id="site-page-bg" type="color" value={site.globalDesign.pageBackground} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,pageBackground:e.target.value}})}/><label htmlFor="site-font-family">Website font family</label><select id="site-font-family" value={site.globalDesign.fontFamily} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,fontFamily:e.target.value as GlobalDesign['fontFamily']}})}><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="system-ui">System UI</option></select><div className="site-global-heading"><h2>Global components</h2><p>Shared header and footer appearance across all pages in the designer.</p></div><label htmlFor="site-logo-text">Header brand text</label><input id="site-logo-text" maxLength={120} value={site.globalDesign.logoText} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,logoText:e.target.value}})}/><label htmlFor="site-header-bg">Header background</label><input id="site-header-bg" type="color" value={site.globalDesign.headerBackground} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,headerBackground:e.target.value}})}/><label htmlFor="site-header-color">Header text color</label><input id="site-header-color" type="color" value={site.globalDesign.headerTextColor} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,headerTextColor:e.target.value}})}/><label htmlFor="site-footer-text">Footer text</label><input id="site-footer-text" maxLength={300} placeholder="Copyright and company details" value={site.globalDesign.footerText} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,footerText:e.target.value}})}/><label htmlFor="site-footer-bg">Footer background</label><input id="site-footer-bg" type="color" value={site.globalDesign.footerBackground} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,footerBackground:e.target.value}})}/><label htmlFor="site-footer-color">Footer text color</label><input id="site-footer-color" type="color" value={site.globalDesign.footerTextColor} onChange={e=>setSite({...site,globalDesign:{...site.globalDesign,footerTextColor:e.target.value}})}/><p>These settings are stored at website level. Public-site SEO and favicon rendering will be connected during publishing.</p><button className="primary" type="submit" disabled={saving}><Save size={16}/>{saving?'Saving…':'Save settings'}</button>{saved&&<span className="site-settings-success">Settings saved.</span>}</form>}</main></div>;
}
export default function SettingsPage(){return <Suspense fallback={<div className="site-settings-screen">Loading settings…</div>}><SiteSettings/></Suspense>}
