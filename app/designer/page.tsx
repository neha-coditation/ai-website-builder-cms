'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlignLeft, ArrowDown, ArrowUp, ChevronLeft, Code2, Database, Eye, Heading1, Image as ImageIcon, Layers, LayoutTemplate, Monitor, MousePointer2, Plus, Save, Smartphone, Trash2, Type, X } from 'lucide-react';

type BlockType = 'heading' | 'paragraph' | 'button' | 'image';
type Block = { id: string; type: BlockType; text: string; style?: { color?: string; background?: string; fontSize?: number; padding?: number; radius?: number; align?: 'left'|'center'|'right' } };
type Site = { name: string; blocks: Block[] };
type DbSite = { id: string; name: string };
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
];
const defaults: Record<BlockType, string> = { heading: 'New heading', paragraph: 'Write your paragraph here.', button: 'Click here', image: '' };

function Workspace() {
  const search = useSearchParams();
  const siteId = search.get('siteId') || '';
  const [site, setSite] = useState<Site>(() => starter('Untitled website'));
  const [selected, setSelected] = useState<string | null>('hero-title');
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop');
  const [leftTab, setLeftTab] = useState<'elements'|'layers'>('elements');
  const [rightTab, setRightTab] = useState<'content'|'style'>('content');
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const storageKey = 'studio-cms-designer-' + (siteId || 'local');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let projectName = 'Untitled website';
      if (siteId) {
        try {
          const res = await fetch('/api/sites', { cache: 'no-store' });
          if (res.ok) {
            const sites: DbSite[] = await res.json();
            const match = sites.find(s => s.id === siteId);
            if (match) projectName = match.name;
            else setError('This project could not be found. Return to the dashboard.');
          } else setError('Unable to load project details.');
        } catch { setError('Unable to load project details.'); }
      }
      let value = starter(projectName);
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Site;
          if (parsed && Array.isArray(parsed.blocks)) value = { ...parsed, name: projectName };
        }
      } catch { /* Start from the template if browser storage is invalid. */ }
      if (!cancelled) { setSite(value); setSelected(value.blocks[0]?.id || null); setLoaded(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [siteId, storageKey]);
  const current = site.blocks.find(b => b.id === selected);
  function add(type: BlockType) {
    const block: Block = { id: makeId(), type, text: defaults[type], style: {} };
    setSite(s => ({ ...s, blocks: [...s.blocks, block] }));
    setSelected(block.id);
    setLeftTab('layers');
    setRightTab('content');
    setPreview(false);
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
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(site)); setSaved(true); setError(''); window.setTimeout(() => setSaved(false), 1600); }
    catch { setError('Could not save to this browser. Check available storage.'); }
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
        <div className="builder-project"><Link href="/">Projects</Link><span>/</span><strong>{site.name}</strong><span className="builder-mode">Designer</span></div>
        <div className="builder-toolbar-actions">
          <div className="builder-device" role="group" aria-label="Viewport"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')} title="Desktop"><Monitor size={17}/></button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')} title="Mobile"><Smartphone size={17}/></button></div>
          <button className={preview?'builder-action active':'builder-action'} onClick={()=>setPreview(v=>!v)}><Eye size={17}/><span>{preview?'Exit preview':'Preview'}</span></button>
          <button className="primary" onClick={save} disabled={!loaded}><Save size={16}/>{saved?'Saved':'Save'}</button>
        </div>
      </header>
      {error && <div className="builder-error" role="alert">{error}</div>}
      <div className={'builder-workspace'+(preview?' is-preview':'')}>
        {!preview && <aside className="builder-left">
          <div className="builder-tabs"><button className={leftTab==='elements'?'active':''} onClick={()=>setLeftTab('elements')}><Plus size={16}/> Elements</button><button className={leftTab==='layers'?'active':''} onClick={()=>setLeftTab('layers')}><Layers size={16}/> Layers</button></div>
          {leftTab==='elements' ? <div className="builder-side-content"><p className="builder-hint">Click an element to add it to your page.</p><div className="builder-element-grid">{palette.map(item=><button key={item.type} onClick={()=>add(item.type)}><item.icon size={23}/><strong>{item.label}</strong><small>{item.description}</small></button>)}</div></div> : <div className="builder-side-content"><div className="builder-panel-heading"><strong>Page layers</strong><span>{site.blocks.length}</span></div>{site.blocks.length===0?<p className="builder-hint">No elements. Add one from Elements.</p>:site.blocks.map((b,index)=><div className={'builder-layer'+(selected===b.id?' active':'')} key={b.id}><button onClick={()=>setSelected(b.id)}><Layers size={15}/>{b.type} <small>{index+1}</small></button><div><button aria-label="Move up" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button aria-label="Move down" disabled={index===site.blocks.length-1} onClick={()=>move(index,1)}><ArrowDown size={13}/></button></div></div>)}</div>}
        </aside>}
        <div className="builder-stage"><div className="builder-stage-heading"><span>{device==='desktop'?'Desktop canvas':'Mobile canvas'}</span><span>{device==='desktop'?'Responsive':'390px wide'}</span></div><div className={'builder-canvas'+(device==='mobile'?' mobile':'')}>
          <div className="builder-site-header"><strong>{site.name}</strong><span>Home　 About　 Contact</span></div>
          <div className="builder-site-body">{site.blocks.map(b=><div key={b.id} className={'builder-block'+(selected===b.id&&!preview?' selected':'')} onClick={()=>{if(!preview){setSelected(b.id);setRightTab('content');}}}>{renderBlock(b)}</div>)}{site.blocks.length===0&&<div className="builder-empty-canvas">Add elements to start designing your page.</div>}</div>
          <div className="builder-site-footer">© {new Date().getFullYear()} {site.name}</div>
        </div></div>
        {!preview && <aside className="builder-right"><div className="builder-tabs"><button className={rightTab==='content'?'active':''} onClick={()=>setRightTab('content')}><Type size={16}/> Content</button><button className={rightTab==='style'?'active':''} onClick={()=>setRightTab('style')}><Code2 size={16}/> Style</button></div>
          {current ? <div className="builder-side-content"><div className="builder-panel-heading"><strong>{current.type.charAt(0).toUpperCase()+current.type.slice(1)}</strong><button onClick={remove} className="builder-icon-danger" title="Delete element" aria-label="Delete element"><Trash2 size={17}/></button></div>
            {rightTab==='content' ? <><label htmlFor="builder-content">{current.type==='image'?'Image URL':'Text content'}</label><textarea id="builder-content" rows={current.type==='paragraph'?8:4} value={current.text} onChange={e=>updateBlock({text:e.target.value})}/><p className="builder-hint">Changes appear immediately on the canvas.</p></> :
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
