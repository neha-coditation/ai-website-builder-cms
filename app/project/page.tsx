'use client';
import {Suspense,useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,Blocks,Database,FileText,FolderOpen,Globe,Image as ImageIcon,Inbox,LayoutDashboard,Palette,Search,Settings2,ShieldCheck,UploadCloud} from 'lucide-react';
type Site={id:string;name:string;slug:string;description:string;updatedAt?:string};
const sections=[
 {label:'Designer',path:'/designer',icon:Palette,detail:'Visual canvas, layers, elements, sections and components',state:'Available'},
 {label:'CMS',path:'/cms',icon:Database,detail:'Collections and content management',state:'Available'},
 {label:'Forms',path:'/forms',icon:Inbox,detail:'Submissions inbox and CSV export',state:'MVP'},
 {label:'SEO',path:'/settings',icon:Search,detail:'SEO defaults and indexing configuration',state:'Partial'},
 {label:'Assets',path:'/designer',icon:ImageIcon,detail:'Media library in the Designer',state:'Partial'},
 {label:'Publishing',path:'/publishing',icon:UploadCloud,detail:'Site preview and publishing workflow',state:'Partial'},
 {label:'Site settings',path:'/settings',icon:Settings2,detail:'General, forms, SEO, design and advanced settings',state:'Available'},
] as const;
function Overview(){
 const params=useSearchParams();const siteId=params.get('siteId')||'';
 const [site,setSite]=useState<Site|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{if(!siteId){setError('Select a website from the workspace.');setLoading(false);return;}let live=true;fetch('/api/sites/'+encodeURIComponent(siteId),{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Unable to load this website');return response.json()}).then(data=>{if(live)setSite(data)}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Unable to load website')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[siteId]);
 const href=(path:string)=>path+'?siteId='+encodeURIComponent(siteId);
 return <div className="studio-workspace">
  <aside className="studio-workspace-nav"><Link href="/" className="studio-workspace-brand">✦ Studio CMS</Link><Link href="/" className="studio-workspace-back"><ArrowLeft size={15}/> All websites</Link><div className="studio-workspace-nav-label">SITE WORKSPACE</div><Link className="active" href={href('/project')}><LayoutDashboard size={17}/> Overview</Link>{sections.map(section=><Link key={section.label} href={href(section.path)}><section.icon size={17}/>{section.label}</Link>)}<div className="studio-workspace-nav-foot"><ShieldCheck size={15}/> Local development · QA pending</div></aside>
  <main className="studio-workspace-main"><header className="studio-workspace-top"><span>Workspace / {site?.name||'Website'}</span><Link href={href('/designer')}>Open Designer <ArrowUpRight size={15}/></Link></header>
  {loading?<p role="status">Loading website…</p>:error?<div role="alert" className="hub-error">{error} <Link href="/">Back to dashboard</Link></div>:site&&<><div className="studio-workspace-hero"><p>WEBSITE OVERVIEW</p><h1>{site.name}</h1><span>/{site.slug}</span><p>{site.description||'Manage your site design, content, forms, SEO and settings from one workspace.'}</p></div><div className="studio-workspace-summary"><div><span>Website</span><strong>{site.slug}</strong></div><div><span>Environment</span><strong>Development</strong></div><div><span>Production readiness</span><strong>QA required</strong></div></div><div className="studio-workspace-heading"><h2>Manage your website</h2><p>Choose a tool. Modules marked Partial or MVP still have important unfinished workflows.</p></div><div className="studio-workspace-grid">{sections.map(section=><Link href={href(section.path)} className="studio-workspace-module" key={section.label}><div className="studio-workspace-module-top"><section.icon size={21}/><span className={section.state==='Available'?'ready':'pending'}>{section.state}</span></div><h3>{section.label}</h3><p>{section.detail}</p><ArrowUpRight size={17} className="studio-workspace-module-arrow"/></Link>)}</div><div className="studio-workspace-notice"><FileText size={19}/><div><strong>Development roadmap</strong><p>Authentication, build verification and complete Forms/SEO/Publishing workflows are prioritized before production launch.</p><a href="https://github.com/neha-coditation/ai-website-builder-cms/blob/phase-38-workspace-ui-foundation/docs/WEBFLOW_PARITY_ROADMAP.md" target="_blank" rel="noopener noreferrer">View implementation plan ↗</a></div></div></>}
  </main></div>;
}
export default function ProjectPage(){return <Suspense fallback={<p>Loading website workspace…</p>}><Overview/></Suspense>}
