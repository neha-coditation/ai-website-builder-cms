'use client';
import { Suspense, useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FilePlus2, Files, AlignLeft, ArrowDown, ArrowUp, ChevronLeft, Code2, Database, Eye, Heading1, Image as ImageIcon, Layers, LayoutTemplate, Monitor, MousePointer2, Plus, Save, Smartphone, Trash2, Type, X } from 'lucide-react';

type BlockType = 'heading' | 'paragraph' | 'button' | 'image' | 'cms-list';
type Block = { id: string; type: BlockType; text: string; collectionId?: string; displayField?: string; style?: { color?: string; background?: string; fontSize?: number; padding?: number; radius?: number; align?: 'left'|'center'|'right' } };
type Seo = { title: string; description: string; noindex: boolean; ogImage: string };
type Site = { name: string; blocks: Block[]; seo?: Seo };
type DbSite = { id: string; name: string };
type ProjectPage = { id: string; slug: string; title: string; content: unknown };
type CmsCollection = { id: string; name: string; fields: {name:string;type:string}[] };
type CmsEntry = { id:string; slug:string; status:string; data: Record<string,unknown> };
const starter = (name: string): Site => ({ name, blocks: [
  { id: 'hero-title', type: 'heading', text: 'Build something remarkable.', style: { fontSize: 54 } },
  { id: 'hero-copy', type: 'paragraph', text: 'Create, customize and launch your next website.', style: { fontSize: 19 } },
  { id: 'hero-button', type: 'button', text: 'Get started', style: { background: '#3064fe', color: '#ffffff', radius: 8 } },
] });
const makeId = () => Math.random().toString(36).slice(2);
const palette: { type: BlockType; label: string; icon: typeof Type; description: string }[] = [
  { type: 'heading', label: 'Heading', icon: Heading1, description: 'Titles and headings' },
  { type: 'paragraph', label: 'Text', icon: AlignLeft, description: 'Body copy' },
  { type: 'button', label: 'Button', icon: MousePointer2, description: 'Call to action' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Visual content' },
  { type: 'cms-list', label: 'CMS List', icon: Database, description: 'Collection-driven cards' },
];
const defaults: Record<BlockType, string> = { heading: 'New heading', paragraph: 'Write your paragraph here.', button: 'Click here', image: '', 'cms-list': 'Collection list' };

function Workspace() {
  const search = useSearchParams();
  const siteId = search.get('siteId') || '';
  const [site, setSite] = useState<Site>(() => starter('Untitled website'));
  const [selected, setSelected] = useState<string | null>('hero-title');
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop');
  const [leftTab, setLeftTab] = useState<'elements'|'layers'>('elements');
  const [rightTab, setRightTab] = useState<'content'|'style'|'seo'>('content');
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [collections, setCollections] = useState<CmsCollection[]>([]);
  const [entriesByCollection, setEntriesByCollection] = useState<Record<string,CmsEntry[]>>({});
  const [pageId, setPageId] = useState('');
  const [pageTitle, setPageTitle] = useState('Home');
  const [creatingPage, setCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [error, setError] = useState('');
  const storageKey = 'studio-cms-designer-' + (siteId || 'local');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoaded(false);
      setError('');
      let projectName = 'Untitled website';
      let value: Site | null = null;
      if (siteId) {
        try {
          const res = await fetch('/api/projects/' + encodeURIComponent(siteId) + '/pages', { cache: 'no-store' });
          if (!res.ok) throw new Error(res.status === 404 ? 'Project not found.' : 'Unable to load project from database.');
          const data: { site: DbSite; pages: ProjectPage[] } = await res.json();
          projectName = data.site.name;
          const available = [...data.pages];
          if (!available.some(page => page.slug === 'home')) {
            const homeRes = await fetch('/api/projects/' + encodeURIComponent(siteId) + '/home', { cache: 'no-store' });
            if (!homeRes.ok) throw new Error('Unable to load homepage.');
            const homeData: { page: { id: string; content: unknown } | null } = await homeRes.json();
            if (homeData.page) available.unshift({ ...homeData.page, slug: 'home', title: 'Home' });
          }
          if (!cancelled) setPages(available);
          const active = available.find(page => page.slug === 'home') || available[0];
          if (!cancelled) { setPageId(active?.id || ''); setPageTitle(active?.title || 'Home'); }
          const content = active?.content;
          if (content && typeof content === 'object' && !Array.isArray(content) && 'blocks' in content) {
            const blocks = (content as { blocks: unknown }).blocks;
            if (Array.isArray(blocks)) value = { name: projectName, blocks: blocks as Block[], seo: 'seo' in content ? (content as { seo: Seo }).seo : undefined };
          }
        } catch (cause) {
          if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load project.');
          if (!cancelled) setLoaded(true);
          return;
        }
      }
      if (!value) {
        value = starter(projectName);
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw) as Site;
            if (parsed && Array.isArray(parsed.blocks)) value = { ...parsed, name: projectName };
          }
        } catch { /* Invalid browser draft: use starter. */ }
      }
      if (!cancelled) { setSite(value); setSelected(value.blocks[0]?.id || null); setLoaded(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [siteId, storageKey]);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch('/api/collections?siteId='+encodeURIComponent(siteId),{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error('Could not load CMS collections');return response.json();})
      .then((data:CmsCollection[])=>{if(!cancelled)setCollections(data);})
      .catch(()=>{if(!cancelled)setCollections([]);});
    return ()=>{cancelled=true;};
  },[siteId]);
  useEffect(() => {
    const ids = [...new Set(site.blocks.filter(block=>block.type==='cms-list'&&block.collectionId).map(block=>block.collectionId!))];
    let cancelled = false;
    for (const id of ids) {
      fetch('/api/entries?collectionId='+encodeURIComponent(id),{cache:'no-store'})
        .then(response=>{if(!response.ok)throw new Error('Could not load CMS entries');return response.json();})
        .then((data:CmsEntry[])=>{if(!cancelled)setEntriesByCollection(previous=>({...previous,[id]:data.filter(entry=>entry.status==='published')}));})
        .catch(()=>{if(!cancelled)setEntriesByCollection(previous=>({...previous,[id]:[]}));});
    }
    return ()=>{cancelled=true;};
  },[site.blocks,siteId]);
  function openPage(page: ProjectPage) {
    const content = page.content;
    const blocks = content && typeof content === 'object' && !Array.isArray(content) && 'blocks' in content && Array.isArray((content as { blocks: unknown }).blocks)
      ? (content as { blocks: Block[] }).blocks : [];
    setPageId(page.id);
    setPageTitle(page.title);
    setSite(previous => ({ name: previous.name, blocks, seo: content && typeof content === 'object' && !Array.isArray(content) && 'seo' in content ? (content as { seo: Seo }).seo : undefined }));
    setSelected(blocks[0]?.id || null);
    setError('');
  }
  async function createPage() {
    const title = newPageName.trim();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if (!siteId || !slug) return;
    setCreatingPage(true);
    try {
      const response = await fetch('/api/projects/' + encodeURIComponent(siteId) + '/pages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, slug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not create page.');
      const page = result as ProjectPage;
      setPages(previous => [...previous, page]);
      openPage(page);
      setNewPageName('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create page.'); }
    finally { setCreatingPage(false); }
  }
  async function deletePage() {
    if (!siteId || !pageId || pages.find(page=>page.id===pageId)?.slug==='home') return;
    if (!window.confirm('Delete this page permanently?')) return;
    const response = await fetch('/api/projects/'+encodeURIComponent(siteId)+'/pages/'+encodeURIComponent(pageId),{method:'DELETE'});
    if (!response.ok) { setError('Could not delete page.'); return; }
    const remaining = pages.filter(page=>page.id!==pageId);
    setPages(remaining);
    const next = remaining.find(page=>page.slug==='home') || remaining[0];
    if (next) openPage(next);
  }
  const current = site.blocks.find(b => b.id === selected);
  function updateSeo(patch: Partial<Seo>) { setSite(previous => ({ ...previous, seo: { title:'',description:'',noindex:false,ogImage:'',...previous.seo,...patch } })); }
  function add(type: BlockType) {
    const block: Block = { id: makeId(), type, text: defaults[type], style: {} };
    setSite(s => ({ ...s, blocks: [...s.blocks, block] }));
    setSelected(block.id);
    setLeftTab('layers');
    setRightTab('content');
    setPreview(false);
  }

  const dragMime = 'application/x-studio-cms-block';
  function startDrag(event: DragEvent<HTMLElement>, payload: { type: 'new'; blockType: BlockType } | { type: 'move'; id: string }) {
    event.dataTransfer.effectAllowed = payload.type === 'new' ? 'copy' : 'move';
    event.dataTransfer.setData(dragMime, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', payload.type === 'new' ? payload.blockType : payload.id);
    setDragging(true);
  }
  function endDrag() { setDragging(false); setDropIndex(null); }
  function acceptDrag(event: DragEvent<HTMLElement>, index: number) {
    if (!event.dataTransfer.types.includes(dragMime)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  }
  function dropBlock(event: DragEvent<HTMLElement>, index: number) {
    event.preventDefault();
    const raw = event.dataTransfer.getData(dragMime);
    endDrag();
    if (!raw) return;
    let payload: { type: 'new'; blockType: BlockType } | { type: 'move'; id: string };
    try { payload = JSON.parse(raw); } catch { return; }
    if (payload.type === 'new') {
      if (!palette.some(item => item.type === payload.blockType)) return;
      const block: Block = { id: makeId(), type: payload.blockType, text: defaults[payload.blockType], style: {} };
      setSite(prev => ({ ...prev, blocks: [...prev.blocks.slice(0, index), block, ...prev.blocks.slice(index)] }));
      setSelected(block.id);
      setRightTab('content');
    } else if (payload.type === 'move') {
      setSite(prev => {
        const from = prev.blocks.findIndex(block => block.id === payload.id);
        if (from < 0) return prev;
        const blocks = [...prev.blocks];
        const [block] = blocks.splice(from, 1);
        blocks.splice(Math.max(0, Math.min(index - (from < index ? 1 : 0), blocks.length)), 0, block);
        return { ...prev, blocks };
      });
      setSelected(payload.id);
    }
  }
  function dropZone(index: number) {
    return <div key={'drop-'+index} className={'builder-drop-zone'+(dropIndex === index ? ' is-over' : '')}
      onDragOver={event => acceptDrag(event, index)}
      onDragEnter={event => acceptDrag(event, index)}
      onDrop={event => dropBlock(event, index)}
      aria-hidden="true"><span>Drop here</span></div>;
  }
  function updateBlock(patch: Partial<Block>) {
    if (!selected) return;
    setSite(s => ({ ...s, blocks: s.blocks.map(b => b.id === selected ? { ...b, ...patch } : b) }));
  }
  function updateStyle(patch: Partial<NonNullable<Block['style']>>) {
    if (!current) return;
    updateBlock({ style: { ...current.style, ...patch } });
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= site.blocks.length) return;
    setSite(s => { const blocks = [...s.blocks]; [blocks[index], blocks[target]] = [blocks[target], blocks[index]]; return { ...s, blocks }; });
  }
  function remove() {
    if (!selected) return;
    setSite(s => ({ ...s, blocks: s.blocks.filter(b => b.id !== selected) }));
    setSelected(null);
  }

  async function save() {
    if (saving || !loaded) return;
    setSaving(true);
    setError('');
    try {
      if (siteId) {
        const url = pageId ? '/api/projects/' + encodeURIComponent(siteId) + '/pages/' + encodeURIComponent(pageId) : '/api/projects/' + encodeURIComponent(siteId) + '/home';
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pageId ? { content: site } : site),
        });
        if (!response.ok) throw new Error('Could not save page to PostgreSQL (' + response.status + ').');
      }
      setPages(previous => previous.map(page => page.id === pageId ? { ...page, content: site } : page));
      localStorage.setItem(storageKey, JSON.stringify(site));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save changes.'); }
    finally { setSaving(false); }
  }
  function renderBlock(b: Block) {
    const style: React.CSSProperties = {
      color: b.style?.color,
      backgroundColor: b.style?.background,
      fontSize: b.style?.fontSize ? b.style.fontSize + 'px' : undefined,
      padding: b.style?.padding === undefined ? undefined : b.style.padding + 'px',
      borderRadius: b.style?.radius === undefined ? undefined : b.style.radius + 'px',
      textAlign: b.style?.align,
    };
    if (b.type === 'heading') return <h1 style={style}>{b.text}</h1>;
    if (b.type === 'paragraph') return <p style={style}>{b.text}</p>;
    if (b.type === 'button') return <button type="button" className="cta" style={style}>{b.text}</button>;
    if (b.type === 'cms-list') {
      const entries = b.collectionId ? entriesByCollection[b.collectionId] || [] : [];
      const collection = collections.find(item=>item.id===b.collectionId);
      const field = b.displayField || collection?.fields?.[0]?.name || 'title';
      return <div className="builder-cms-block" style={style}><div className="builder-cms-heading"><Database size={16}/><strong>{collection?.name||'CMS Collection'}</strong><small>{entries.length} published</small></div>{!b.collectionId?<p>Select a collection in the Content panel.</p>:entries.length?<div className="builder-cms-cards">{entries.slice(0,12).map(entry=><article key={entry.id}><h3>{String(entry.data?.[field]??entry.slug)}</h3><small>/{entry.slug}</small></article>)}</div>:<p>No published entries yet.</p>}</div>;
    }
    return b.text ? <img style={style} src={b.text} alt="Website visual" /> : <div className="builder-image-placeholder" style={style}><ImageIcon size={28}/> Add an image URL in Properties</div>;
  }
  return <div className="builder">
    <aside className="builder-rail">
      <Link href="/" className="builder-brand" aria-label="Back to dashboard">✦</Link>
      <Link href="/" title="All projects" aria-label="All projects"><ChevronLeft size={20}/></Link>
      <button className={!preview ? 'is-active' : ''} title="Designer" aria-label="Designer" onClick={()=>setPreview(false)}><LayoutTemplate size={20}/></button>
      <Link href={'/cms' + (siteId ? '?siteId='+encodeURIComponent(siteId) : '')} title="CMS collections" aria-label="CMS collections"><Database size={20}/></Link>
    </aside>
    <div className="builder-main">
      <header className="builder-toolbar">
        <div className="builder-project"><Link href="/">Projects</Link><span>/</span><strong>{site.name}</strong><span className="builder-mode">{pageTitle} · Designer</span></div>
        <div className="builder-toolbar-actions">
          <div className="builder-device" role="group" aria-label="Viewport"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')} title="Desktop"><Monitor size={17}/></button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')} title="Mobile"><Smartphone size={17}/></button></div>
          <button className={preview?'builder-action active':'builder-action'} onClick={()=>setPreview(v=>!v)}><Eye size={17}/><span>{preview?'Exit preview':'Preview'}</span></button>
          <button className="primary" onClick={()=>void save()} disabled={!loaded||saving}><Save size={16}/>{saving?'Saving…':saved?'Saved':'Save'}</button>
        </div>
      </header>
      {error && <div className="builder-error" role="alert">{error}</div>}
      <div className={'builder-workspace'+(preview?' is-preview':'')}>
        {!preview && <aside className="builder-left">
          <div className="builder-pages"><div className="builder-panel-heading"><strong><Files size={15}/> Pages</strong><span>{pages.length}</span></div><div className="builder-page-list">{pages.map(page=><button key={page.id} className={pageId===page.id?'active':''} onClick={()=>openPage(page)}>{page.title}<small>/{page.slug}</small></button>)}</div><div className="builder-new-page"><input aria-label="New page name" placeholder="New page name" value={newPageName} onChange={event=>setNewPageName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void createPage();}}/><button disabled={!newPageName.trim()||creatingPage} onClick={()=>void createPage()} title="Create page"><FilePlus2 size={16}/></button></div>{pages.find(page=>page.id===pageId)?.slug!=='home'&&pageId&&<button className="builder-remove-page" onClick={()=>void deletePage()}><Trash2 size={14}/> Delete page</button>}</div><div className="builder-tabs"><button className={leftTab==='elements'?'active':''} onClick={()=>setLeftTab('elements')}><Plus size={16}/> Elements</button><button className={leftTab==='layers'?'active':''} onClick={()=>setLeftTab('layers')}><Layers size={16}/> Layers</button></div>
          {leftTab==='elements' ? <div className="builder-side-content"><p className="builder-hint">Drag an element onto the canvas, or click to append it.</p><div className="builder-element-grid">{palette.map(item=><button key={item.type} draggable onDragStart={event=>startDrag(event,{type:"new",blockType:item.type})} onDragEnd={endDrag} title={"Drag "+item.label+" onto canvas"} onClick={()=>add(item.type)}><item.icon size={23}/><strong>{item.label}</strong><small>{item.description}</small></button>)}</div></div> : <div className="builder-side-content"><div className="builder-panel-heading"><strong>Page layers</strong><span>{site.blocks.length}</span></div>{site.blocks.length===0?<p className="builder-hint">No elements. Add one from Elements.</p>:site.blocks.map((b,index)=><div className={'builder-layer'+(selected===b.id?' active':'')} key={b.id} draggable onDragStart={event=>startDrag(event,{type:"move",id:b.id})} onDragEnd={endDrag}><button onClick={()=>setSelected(b.id)}><Layers size={15}/>{b.type} <small>{index+1}</small></button><div><button aria-label="Move up" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button aria-label="Move down" disabled={index===site.blocks.length-1} onClick={()=>move(index,1)}><ArrowDown size={13}/></button></div></div>)}</div>}
        </aside>}
        <div className="builder-stage"><div className="builder-stage-heading"><span>{device==='desktop'?'Desktop canvas':'Mobile canvas'}</span><span>{device==='desktop'?'Responsive':'390px wide'}</span></div><div className={'builder-canvas'+(device==='mobile'?' mobile':'')}>
          <div className="builder-site-header"><strong>{site.name}</strong><nav className="builder-site-links">{pages.map(page=><button key={page.id} className={page.id===pageId?'active':''} onClick={()=>{if(!preview)openPage(page);}}>{page.title}</button>)}</nav></div>
          <div className={'builder-site-body'+(dragging?' is-dragging':'')} onDragOver={event=>{if(event.dataTransfer.types.includes(dragMime))event.preventDefault();}}>
            {site.blocks.map((b,index)=><div key={b.id}>
              {!preview && dropZone(index)}
              <div className={'builder-block'+(selected===b.id&&!preview?' selected':'')} draggable={!preview}
                onDragStart={event=>startDrag(event,{type:'move',id:b.id})} onDragEnd={endDrag}
                onDragOver={event=>{if(preview)return;const rect=event.currentTarget.getBoundingClientRect();acceptDrag(event,index+(event.clientY>rect.top+rect.height/2?1:0));}}
                onDrop={event=>{if(preview)return;const rect=event.currentTarget.getBoundingClientRect();dropBlock(event,index+(event.clientY>rect.top+rect.height/2?1:0));}}
                onClick={()=>{if(!preview){setSelected(b.id);setRightTab('content');}}}>{renderBlock(b)}</div>
            </div>)}
            {!preview && dropZone(site.blocks.length)}
            {site.blocks.length===0&&<div className="builder-empty-canvas">Drag elements here to start designing your page.</div>}
          </div>
          <div className="builder-site-footer">© {new Date().getFullYear()} {site.name}</div>
        </div></div>
        {!preview && <aside className="builder-right"><div className="builder-tabs"><button className={rightTab==='content'?'active':''} onClick={()=>setRightTab('content')}><Type size={16}/> Content</button><button className={rightTab==='style'?'active':''} onClick={()=>setRightTab('style')}><Code2 size={16}/> Style</button><button className={rightTab==='seo'?'active':''} onClick={()=>setRightTab('seo')}>SEO</button></div>
          {rightTab==='seo' ? <div className="builder-side-content"><div className="builder-panel-heading"><strong>Page SEO</strong></div><label htmlFor="seo-title">Search title</label><input id="seo-title" maxLength={70} value={site.seo?.title||''} onChange={e=>updateSeo({title:e.target.value})}/><label htmlFor="seo-description">Meta description</label><textarea id="seo-description" rows={5} maxLength={320} value={site.seo?.description||''} onChange={e=>updateSeo({description:e.target.value})}/><label htmlFor="seo-image">Social image URL</label><input id="seo-image" type="url" value={site.seo?.ogImage||''} onChange={e=>updateSeo({ogImage:e.target.value})}/><label className="builder-seo-toggle"><input type="checkbox" checked={site.seo?.noindex||false} onChange={e=>updateSeo({noindex:e.target.checked})}/> Noindex</label><p className="builder-hint">SEO values are saved with the page. Public metadata rendering is not implemented yet.</p></div> : current ? <div className="builder-side-content"><div className="builder-panel-heading"><strong>{current.type.charAt(0).toUpperCase()+current.type.slice(1)}</strong><button onClick={remove} className="builder-icon-danger" title="Delete element" aria-label="Delete element"><Trash2 size={17}/></button></div>
            {rightTab==='content' ? current.type==='cms-list' ? <><label htmlFor="builder-collection">CMS collection</label><select id="builder-collection" value={current.collectionId||''} onChange={e=>updateBlock({collectionId:e.target.value,displayField:''})}><option value="">Choose collection</option>{collections.map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><label htmlFor="builder-display-field">Card heading field</label><select id="builder-display-field" value={current.displayField||''} onChange={e=>updateBlock({displayField:e.target.value})}><option value="">First field</option>{collections.find(collection=>collection.id===current.collectionId)?.fields?.map(field=><option key={field.name} value={field.name}>{field.name}</option>)}</select><p className="builder-hint">Only published entries are displayed. Manage collection content in CMS.</p><Link href={'/cms?siteId='+encodeURIComponent(siteId)}>Manage CMS →</Link></> : <><label htmlFor="builder-content">{current.type==='image'?'Image URL':'Text content'}</label><textarea id="builder-content" rows={current.type==='paragraph'?8:4} value={current.text} onChange={e=>updateBlock({text:e.target.value})}/><p className="builder-hint">Changes appear immediately on the canvas.</p></> :
            <><label htmlFor="builder-color">Text color</label><div className="builder-color-control"><input id="builder-color" type="color" value={current.style?.color||'#131827'} onChange={e=>updateStyle({color:e.target.value})}/><span>{current.style?.color||'Default'}</span></div>
              <label htmlFor="builder-bg">Background color</label><div className="builder-color-control"><input id="builder-bg" type="color" value={current.style?.background||'#ffffff'} onChange={e=>updateStyle({background:e.target.value})}/><span>{current.style?.background||'Default'}</span></div>
              <label htmlFor="builder-font-size">Font size (px)</label><input id="builder-font-size" type="number" min="8" max="120" placeholder="Default" value={current.style?.fontSize??''} onChange={e=>updateStyle({fontSize:e.target.value?Number(e.target.value):undefined})}/>
              <label htmlFor="builder-padding">Padding (px)</label><input id="builder-padding" type="number" min="0" max="160" placeholder="Default" value={current.style?.padding??''} onChange={e=>updateStyle({padding:e.target.value?Number(e.target.value):0})}/>
              <label htmlFor="builder-radius">Corner radius (px)</label><input id="builder-radius" type="number" min="0" max="120" placeholder="Default" value={current.style?.radius??''} onChange={e=>updateStyle({radius:e.target.value?Number(e.target.value):0})}/>
              <label htmlFor="builder-align">Text alignment</label><select id="builder-align" value={current.style?.align||'left'} onChange={e=>updateStyle({align:e.target.value as 'left'|'center'|'right'})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></>}
          </div> : <div className="builder-side-content builder-hint">Select an element on the canvas or in Layers to edit its content and styles.</div>}
        </aside>}
      </div>
    </div>
  </div>;
}
export default function DesignerPage(){return <Suspense fallback={<div className="builder">Loading designer…</div>}><Workspace/></Suspense>}
