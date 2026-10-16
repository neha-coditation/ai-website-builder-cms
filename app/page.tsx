'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, FolderOpen, Globe, LayoutDashboard, Plus, Search, Settings2 } from 'lucide-react';

type Site = { id: string; name: string; slug: string; updatedAt: string };
const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadSites() {
    setLoading(true);
    try {
      const response = await fetch('/api/sites', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load projects. Check the database connection and Prisma migrations.');
      setSites(await response.json());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load projects.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadSites(); }, []);

  async function createSite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slugify(name) + '-' + Date.now().toString(36) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not create website.');
      setCreating(false);
      setName('');
      await loadSites();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create website.');
    } finally { setSaving(false); }
  }

  const visible = sites.filter(site => (site.name + ' ' + site.slug).toLowerCase().includes(query.toLowerCase()));
  return <div className="hub">
    <aside className="hub-sidebar">
      <Link className="hub-logo" href="/"><span className="brandicon">✦</span> Studio<span className="muted">CMS</span></Link>
      <div className="section">WORKSPACE</div>
      <Link className="hub-nav active" href="/"><LayoutDashboard size={18}/> Dashboard</Link>
      <div className="hub-nav muted"><FolderOpen size={18}/> Projects</div>
      <div className="hub-sidebar-foot">Website Builder · Local development</div>
    </aside>
    <main className="hub-main">
      <div className="hub-top"><span>Workspace / Dashboard</span><span className="hub-top-status">Local workspace</span></div>
      <div className="hub-content">
        <div className="hub-heading"><div><p className="hub-eyebrow">YOUR WORKSPACE</p><h1>Dashboard</h1><p>Manage your websites and start something new.</p></div><button className="primary" onClick={() => setCreating(true)}><Plus size={17}/> New website</button></div>
        <div className="hub-stats"><div><strong>{sites.length}</strong><span>Total websites</span></div><div><strong>Local</strong><span>Environment</span></div></div>
        <div className="hub-list-head"><div><h2>All projects</h2><p>Open a website to manage its designer, CMS, forms, SEO and settings.</p></div><div className="hub-search"><Search size={16}/><input aria-label="Search projects" placeholder="Search projects" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
        {error && <div className="hub-error" role="alert">{error} <button onClick={()=>void loadSites()}>Retry</button></div>}
        {loading ? <p className="hub-muted">Loading projects…</p> : visible.length ? <div className="hub-grid">{visible.map(site=><article className="hub-project" key={site.id}>
          <div className="hub-project-art"><Globe size={34}/></div><div className="hub-project-body"><h3>{site.name}</h3><p>/{site.slug}</p><small>Updated {new Date(site.updatedAt).toLocaleDateString()}</small><div className="hub-project-actions"><Link href={'/project?siteId='+encodeURIComponent(site.id)}>Manage website <ArrowRight size={15}/></Link><Link href={'/designer?siteId='+encodeURIComponent(site.id)}>Designer</Link><Link href={'/cms?siteId='+encodeURIComponent(site.id)}><Database size={15}/> CMS</Link><Link href={'/settings?siteId='+encodeURIComponent(site.id)}><Settings2 size={15}/> Settings</Link></div></div>
        </article>)}</div> : <div className="hub-empty"><FolderOpen size={36}/><h3>{query ? 'No matching projects' : 'No websites yet'}</h3><p>{query ? 'Try another search.' : 'Create your first website to get started.'}</p>{!query && <button className="primary" onClick={()=>setCreating(true)}><Plus size={16}/> Create website</button>}</div>}
      </div>
    </main>
    {creating && <div className="hub-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCreating(false)}}><form className="hub-modal" onSubmit={createSite}><div className="hub-modal-icon"><Settings2 size={22}/></div><h2>Create website</h2><p>Give your new project a name. You can edit its content after creation.</p><label htmlFor="project-name">Website name</label><input id="project-name" autoFocus maxLength={120} required placeholder="e.g. My portfolio" value={name} onChange={e=>setName(e.target.value)}/><div className="hub-modal-actions"><button type="button" onClick={()=>setCreating(false)}>Cancel</button><button className="primary" disabled={saving || !slugify(name)} type="submit">{saving ? 'Creating…' : 'Create website'}</button></div></form></div>}
  </div>;
}
