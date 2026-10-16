'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FilePlus2, Files, Settings2, AlignLeft, ArrowDown, ArrowUp, Undo2, Redo2, ChevronLeft, Code2, Database, Eye, Heading1, Image as ImageIcon, Layers, FolderOpen, LayoutTemplate, Monitor, MousePointer2, Plus, Save, Smartphone, Trash2, Type, X } from 'lucide-react';

type BlockType = 'heading' | 'paragraph' | 'button' | 'image' | 'cms-list' | 'container';
type Block = { id: string; type: BlockType; text: string; collectionId?: string; displayField?: string; htmlId?:string; classNames?:string; alt?:string; href?:string; parentId?:string; layout?:'column'|'row'|'grid';gap?:number;columns?:number; style?: { color?: string; background?: string; fontSize?: number; padding?: number; radius?: number; align?: 'left'|'center'|'right'; width?: 'auto'|'full'|'half'; maxWidth?: number; marginTop?: number; marginBottom?: number } };
type ClassRule={color?:string;background?:string;fontSize?:number;padding?:number;radius?:number};
type ClassRules=Record<string,ClassRule>;
type Seo = { title: string; description: string; noindex: boolean; ogImage: string };
type Site = { name: string; blocks: Block[]; seo?: Seo };
type GlobalDesign = { primaryColor?:string;bodyTextColor?:string;pageBackground?:string;fontFamily?:string;logoText?:string;headerBackground?:string;headerTextColor?:string;footerText?:string;footerBackground?:string;footerTextColor?:string };
type DbSite = { id: string; name: string; globalDesign?:GlobalDesign };
type ProjectPage = { id: string; slug: string; title: string; content: unknown };
type CmsCollection = { id: string; name: string; fields: {name:string;type:string}[] };
type Asset = {id:string;name:string;url:string;alt:string};
type CmsEntry = { id:string; slug:string; status:string; data: Record<string,unknown> };
const starter = (name: string): Site => ({ name, blocks: [
  { id: 'hero-title', type: 'heading', text: 'Build something remarkable.', style: { fontSize: 54 } },
  { id: 'hero-copy', type: 'paragraph', text: 'Create, customize and launch your next website.', style: { fontSize: 19 } },
  { id: 'hero-button', type: 'button', text: 'Get started', style: { background: '#3064fe', color: '#ffffff', radius: 8 } },
] });
function autoClass(type:BlockType,existing:Block[]):string{
  const used=new Set(existing.flatMap(b=>(b.classNames||'').split(/\s+/).filter(Boolean)));
  const base='element-'+type;
  let i=1;
  while(used.has(base+'-'+i))i++;
  return base+'-'+i;
}
const makeId = () => Math.random().toString(36).slice(2);
const palette: { type: BlockType; label: string; icon: typeof Type; description: string }[] = [
  { type: 'heading', label: 'Heading', icon: Heading1, description: 'Titles and headings' },
  { type: 'paragraph', label: 'Text', icon: AlignLeft, description: 'Body copy' },
  { type: 'button', label: 'Button', icon: MousePointer2, description: 'Call to action' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Visual content' },
  { type: 'cms-list', label: 'CMS List', icon: Database, description: 'Collection-driven cards' },
  { type: 'container', label: 'Container', icon: LayoutTemplate, description: 'Nested flex or grid layout' },
];
const defaults: Record<BlockType, string> = { heading: 'New heading', paragraph: 'Write your paragraph here.', button: 'Click here', image: '', 'cms-list': 'Collection list', container:'Container' };

type SectionPreset = { id:string; name:string; description:string; blocks: Omit<Block,'id'>[] };
const sectionPresets: SectionPreset[] = [
  {id:'hero',name:'Hero',description:'Headline, introduction and call to action',blocks:[
    {type:'heading',text:'Your next big idea starts here',style:{fontSize:52,align:'center',padding:16}},
    {type:'paragraph',text:'A clear message that helps visitors understand what you offer.',style:{fontSize:19,align:'center',padding:12}},
    {type:'button',text:'Get started',style:{background:'#3064fe',color:'#ffffff',radius:10,padding:16,align:'center'}}]},
  {id:'features',name:'Features',description:'Section title with three benefit statements',blocks:[
    {type:'heading',text:'Why choose us',style:{fontSize:38,padding:16}},
    {type:'paragraph',text:'01 — Built for your needs. Explain the first benefit.',style:{fontSize:18,padding:12}},
    {type:'paragraph',text:'02 — Simple to use. Explain the second benefit.',style:{fontSize:18,padding:12}},
    {type:'paragraph',text:'03 — Ready to grow. Explain the third benefit.',style:{fontSize:18,padding:12}}]},
  {id:'cta',name:'Call to action',description:'Conversion-focused closing section',blocks:[
    {type:'heading',text:'Ready to work together?',style:{fontSize:36,align:'center',padding:18}},
    {type:'paragraph',text:'Tell us what you are building and we will help you get started.',style:{align:'center',padding:10}},
    {type:'button',text:'Contact us',style:{background:'#3064fe',color:'#ffffff',radius:8,padding:14}}]},
  {id:'content',name:'Editorial',description:'Article heading, image and body copy',blocks:[
    {type:'heading',text:'A story worth sharing',style:{fontSize:42,padding:12}},
    {type:'image',text:'',style:{radius:12,padding:8}},
    {type:'paragraph',text:'Write your story here. Add context, supporting details, and a clear takeaway.',style:{fontSize:17,padding:12}}]},
];
function Workspace() {
  const search = useSearchParams();
  const siteId = search.get('siteId') || '';
  const [site, setSite] = useState<Site>(() => starter('Untitled website'));
  const [globalDesign,setGlobalDesign] = useState<GlobalDesign>({});
  const [selected, setSelected] = useState<string | null>('hero-title');
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop');
  const [leftTab, setLeftTab] = useState<'elements'|'layers'|'assets'>('elements');
  const [rightTab, setRightTab] = useState<'content'|'style'|'seo'>('content');
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [classRules,setClassRules]=useState<ClassRules>({});
  const [classNameDraft,setClassNameDraft]=useState('');
  const [classSaving,setClassSaving]=useState(false);
  const [assets,setAssets]=useState<Asset[]>([]);
  const [assetName,setAssetName]=useState('');
  const [assetUrl,setAssetUrl]=useState('');
  const [assetAlt,setAssetAlt]=useState('');
  const [assetBusy,setAssetBusy]=useState(false);
  const [imagePickerOpen,setImagePickerOpen]=useState(false);
  const [collections, setCollections] = useState<CmsCollection[]>([]);
  const [entriesByCollection, setEntriesByCollection] = useState<Record<string,CmsEntry[]>>({});
  const [pageId, setPageId] = useState('');
  const [pageTitle, setPageTitle] = useState('Home');
  const [creatingPage, setCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [error, setError] = useState('');
  const storageKey = 'studio-cms-designer-' + (siteId || 'local');
  const historyRef = useRef<{pageKey:string;past:Site[];present:Site|null;future:Site[]}>({pageKey:'',past:[],present:null,future:[]});
  const [historyRevision,setHistoryRevision] = useState(0);
  const [historyReady,setHistoryReady] = useState(false);
  const historyKey = siteId + ':' + pageId;
  const resetHistory = (key:string) => {
    historyRef.current = {pageKey:key,past:[],present:null,future:[]};
    setHistoryRevision(n=>n+1);
  };
  useEffect(()=>{
    if (!loaded || !historyReady) return;
    const history=historyRef.current;
    if(history.pageKey!==historyKey) {
      historyRef.current={pageKey:historyKey,past:[],present:structuredClone(site),future:[]};
      setHistoryRevision(n=>n+1);
      return;
    }
    if(!history.present) {
      history.present=structuredClone(site);
      setHistoryRevision(n=>n+1);
      return;
    }
    if(JSON.stringify(history.present)===JSON.stringify(site))return;
    history.past=[...history.past.slice(-49),history.present];
    history.present=structuredClone(site);
    history.future=[];
    setHistoryRevision(n=>n+1);
  },[site,loaded,historyKey,historyReady]);
  function undo() {
    const history=historyRef.current;
    if(!history.past.length || history.pageKey!==historyKey)return;
    const previous=history.past.pop()!;
    if(history.present)history.future.unshift(history.present);
    history.present=previous;
    setSite(structuredClone(previous));
    setSaved(false);
    setHistoryRevision(n=>n+1);
  }
  function redo() {
    const history=historyRef.current;
    if(!history.future.length || history.pageKey!==historyKey)return;
    const next=history.future.shift()!;
    if(history.present)history.past.push(history.present);
    history.present=next;
    setSite(structuredClone(next));
    setSaved(false);
    setHistoryRevision(n=>n+1);
  }
  const canUndo=historyRevision>=0 && historyRef.current.pageKey===historyKey && historyRef.current.past.length>0;
  const canRedo=historyRevision>=0 && historyRef.current.pageKey===historyKey && historyRef.current.future.length>0;
  useEffect(()=>{
    function onKeyDown(event:KeyboardEvent){
      if(preview || event.altKey || !(event.metaKey||event.ctrlKey) || event.key.toLowerCase()!=='z')return;
      const element=event.target as HTMLElement|null;
      if(element?.closest('input,textarea,select,[contenteditable="true"]'))return;
      event.preventDefault();
      if(event.shiftKey)redo();else undo();
    }
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  });


  useEffect(() => {
    let cancelled = false;
    async function load() {
      setHistoryReady(false);
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
          if (!cancelled) setGlobalDesign(data.site.globalDesign || {});
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
      if (!cancelled) { resetHistory(siteId + ':' + (pageId || '')); setSite(value); setSelected(value.blocks[0]?.id || null); setLoaded(true); setHistoryReady(true); }
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
  useEffect(()=>{
    if(!siteId)return;
    let active=true;
    fetch('/api/projects/'+encodeURIComponent(siteId)+'/classes',{cache:'no-store'})
      .then(r=>{if(!r.ok)throw Error('Could not load classes');return r.json()})
      .then(data=>{if(active)setClassRules(data)})
      .catch(()=>{if(active)setError('Could not load reusable classes.')});
    return ()=>{active=false};
  },[siteId]);
  async function saveClasses(next:ClassRules){
    if(!siteId)return;
    setClassSaving(true);
    try{
      const response=await fetch('/api/projects/'+encodeURIComponent(siteId)+'/classes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
      if(!response.ok)throw Error('Unable to save classes');
      setClassRules(next);
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to save classes');}
    finally{setClassSaving(false);}
  }
  function addClass(){
    const name=classNameDraft.trim();
    if(!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)||classRules[name]){setError('Enter a unique CSS class name (letters, numbers, _ and -).');return;}
    void saveClasses({...classRules,[name]:{}});
    setClassNameDraft('');
    if(current)updateBlock({classNames:[...(current.classNames||'').split(/\s+/).filter(Boolean),name].join(' ')});
  }
  function updateClass(name:string,patch:ClassRule){void saveClasses({...classRules,[name]:{...classRules[name],...patch}});}
  function classStyle(block:Block):React.CSSProperties{
    const result:React.CSSProperties={};
    for(const name of (block.classNames||'').split(/\s+/).filter(Boolean)){
      const rule=classRules[name];if(!rule)continue;
      if(rule.color)result.color=rule.color;
      if(rule.background)result.backgroundColor=rule.background;
      if(rule.fontSize!==undefined)result.fontSize=rule.fontSize+'px';
      if(rule.padding!==undefined)result.padding=rule.padding+'px';
      if(rule.radius!==undefined)result.borderRadius=rule.radius+'px';
    }
    return result;
  }
  async function refreshAssets(){
    if(!siteId)return;
    try{const response=await fetch('/api/assets?siteId='+encodeURIComponent(siteId),{cache:'no-store'});if(!response.ok)throw Error('Could not load assets');setAssets(await response.json());}
    catch(cause){setError(cause instanceof Error?cause.message:'Could not load assets');}
  }
  useEffect(()=>{if(siteId)void refreshAssets();},[siteId]);
  async function uploadAssets(files:FileList|null,selectUploaded=false){
    if(!siteId||!files?.length||assetBusy)return;
    setAssetBusy(true);
    try {
      let firstUploaded:Asset|null=null;
      for(const file of Array.from(files)){
        const data=new FormData();
        data.append('siteId',siteId);
        data.append('file',file);
        const response=await fetch('/api/assets/upload',{method:'POST',body:data});
        if(!response.ok){const result=await response.json();throw Error(result.error||'Upload failed');}
        const uploaded:Asset=await response.json();
        if(!firstUploaded)firstUploaded=uploaded;
      }
      await refreshAssets();
      if(selectUploaded&&firstUploaded){useAsset(firstUploaded);setImagePickerOpen(false);}
    }catch(cause){setError(cause instanceof Error?cause.message:'Upload failed');}
    finally{setAssetBusy(false);}
  }
  async function deleteAsset(id:string){
    if(!siteId||!window.confirm('Remove this asset from the library? Existing page references remain.'))return;
    const response=await fetch('/api/assets',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId,id})});
    if(response.ok)await refreshAssets();else setError('Could not remove asset.');
  }
  function useAsset(asset:Asset){
    if(current?.type==='image'){updateBlock({text:asset.url,alt:asset.alt});setRightTab('content');setImagePickerOpen(false);}
    else{const block:Block={id:makeId(),type:'image',text:asset.url,alt:asset.alt,classNames:autoClass('image',site.blocks),style:{}};setSite(previous=>({...previous,blocks:[...previous.blocks,block]}));setSelected(block.id);setRightTab('content');}
  }
  function openPage(page: ProjectPage) {
    setHistoryReady(false);
    resetHistory(siteId + ':' + page.id);
    const content = page.content;
    const blocks = content && typeof content === 'object' && !Array.isArray(content) && 'blocks' in content && Array.isArray((content as { blocks: unknown }).blocks)
      ? (content as { blocks: Block[] }).blocks : [];
    setPageId(page.id);
    setPageTitle(page.title);
    setSite(previous => ({ name: previous.name, blocks, seo: content && typeof content === 'object' && !Array.isArray(content) && 'seo' in content ? (content as { seo: Seo }).seo : undefined }));
    setSelected(blocks[0]?.id || null);
    setError('');
    setHistoryReady(true);
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
    const block: Block = { id: makeId(), type, text: defaults[type], classNames:autoClass(type,site.blocks), style: {} };
    setSite(s => ({ ...s, blocks: [...s.blocks, block] }));
    setSelected(block.id);
    setLeftTab('layers');
    setRightTab('content');
    setPreview(false);
  }

  function insertSection(preset: SectionPreset) {
    const reserved=[...site.blocks];
    const blocks: Block[] = preset.blocks.map(block=>{const next:Block={...block,id:makeId(),classNames:autoClass(block.type,reserved),style:{...block.style}};reserved.push(next);return next;});
    setSite(previous=>({...previous,blocks:[...previous.blocks,...blocks]}));
    setSelected(blocks[0]?.id||null);
    setLeftTab('layers');
    setRightTab('content');
    setPreview(false);
    setSaved(false);
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
      const block: Block = { id: makeId(), type: payload.blockType, text: defaults[payload.blockType], classNames:autoClass(payload.blockType,site.blocks), style: {} };
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
  function moveIntoContainer(childId:string,containerId:string) {
    if(childId===containerId)return;
    setSite(previous=>({...previous,blocks:previous.blocks.map(block=>block.id===childId?{...block,parentId:containerId}:block)}));
  }
  function remove() {
    if (!selected) return;
    setSite(s => ({ ...s, blocks: s.blocks.filter(b => b.id !== selected).map(b=>b.parentId===selected?{...b,parentId:undefined}:b) }));
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
      color: b.style?.color || globalDesign.bodyTextColor,
      backgroundColor: b.style?.background || (b.type==='button' ? globalDesign.primaryColor : undefined),
      fontSize: b.style?.fontSize ? b.style.fontSize + 'px' : undefined,
      padding: b.style?.padding === undefined ? undefined : b.style.padding + 'px',
      borderRadius: b.style?.radius === undefined ? undefined : b.style.radius + 'px',
      textAlign: b.style?.align,
      maxWidth: b.style?.maxWidth ? b.style.maxWidth+'px' : undefined,
      marginTop: b.style?.marginTop===undefined?undefined:b.style.marginTop+'px',
      marginBottom: b.style?.marginBottom===undefined?undefined:b.style.marginBottom+'px',
    };
    Object.assign(style,{...classStyle(b),...Object.fromEntries(Object.entries(style).filter(([,value])=>value!==undefined))});
    if (b.type === 'container') return <div className="builder-container-placeholder"><LayoutTemplate size={17}/><span>{b.layout||'column'} layout</span></div>;
    if (b.type === 'heading') return <h1 style={style}>{b.text}</h1>;
    if (b.type === 'paragraph') return <p style={style}>{b.text}</p>;
    if (b.type === 'button') return <button type="button" className="cta" style={style}>{b.text}</button>;
    if (b.type === 'cms-list') {
      const entries = b.collectionId ? entriesByCollection[b.collectionId] || [] : [];
      const collection = collections.find(item=>item.id===b.collectionId);
      const field = b.displayField || collection?.fields?.[0]?.name || 'title';
      return <div className="builder-cms-block" style={style}><div className="builder-cms-heading"><Database size={16}/><strong>{collection?.name||'CMS Collection'}</strong><small>{entries.length} published</small></div>{!b.collectionId?<p>Select a collection in the Content panel.</p>:entries.length?<div className="builder-cms-cards">{entries.slice(0,12).map(entry=><article key={entry.id}><h3>{String(entry.data?.[field]??entry.slug)}</h3><small>/{entry.slug}</small></article>)}</div>:<p>No published entries yet.</p>}</div>;
    }
    return b.text ? <img style={style} src={b.text} alt={b.alt||''} /> : <div className="builder-image-placeholder" style={style}><ImageIcon size={28}/> Add an image URL in Properties</div>;
  }
  return <div className="builder">
    <aside className="builder-rail">
      <Link href="/" className="builder-brand" aria-label="Back to dashboard">✦</Link>
      <Link href="/" title="All projects" aria-label="All projects"><ChevronLeft size={20}/></Link>
      <button className={!preview ? 'is-active' : ''} title="Designer" aria-label="Designer" onClick={()=>setPreview(false)}><LayoutTemplate size={20}/></button>
      <Link href={'/cms' + (siteId ? '?siteId='+encodeURIComponent(siteId) : '')} title="CMS collections" aria-label="CMS collections"><Database size={20}/></Link><Link href={'/settings?siteId='+encodeURIComponent(siteId)} title="Website settings" aria-label="Website settings"><Settings2 size={20}/></Link>
    </aside>
    <div className="builder-main">
      <header className="builder-toolbar">
        <div className="builder-project"><Link href="/">Projects</Link><span>/</span><strong>{site.name}</strong><span className="builder-mode">{pageTitle} · Designer</span></div>
        <div className="builder-toolbar-actions">
          <div className="builder-device" role="group" aria-label="Viewport"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')} title="Desktop"><Monitor size={17}/></button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')} title="Mobile"><Smartphone size={17}/></button></div>
          <div className="builder-history-actions" role="group" aria-label="Edit history"><button type="button" className="builder-action" title="Undo (⌘/Ctrl+Z)" aria-label="Undo" disabled={!canUndo||preview} onClick={undo}><Undo2 size={17}/></button><button type="button" className="builder-action" title="Redo (⌘/Ctrl+Shift+Z)" aria-label="Redo" disabled={!canRedo||preview} onClick={redo}><Redo2 size={17}/></button></div>
          <button className={preview?'builder-action active':'builder-action'} onClick={()=>setPreview(v=>!v)}><Eye size={17}/><span>{preview?'Exit preview':'Preview'}</span></button>
          <button className="primary" onClick={()=>void save()} disabled={!loaded||saving}><Save size={16}/>{saving?'Saving…':saved?'Saved':'Save'}</button>
        </div>
      </header>
      {error && <div className="builder-error" role="alert">{error}</div>}
      <div className={'builder-workspace'+(preview?' is-preview':'')}>
        {!preview && <aside className="builder-left">
          <div className="builder-pages"><div className="builder-panel-heading"><strong><Files size={15}/> Pages</strong><span>{pages.length}</span></div><div className="builder-page-list">{pages.map(page=><button key={page.id} className={pageId===page.id?'active':''} onClick={()=>openPage(page)}>{page.title}<small>/{page.slug}</small></button>)}</div><div className="builder-new-page"><input aria-label="New page name" placeholder="New page name" value={newPageName} onChange={event=>setNewPageName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void createPage();}}/><button disabled={!newPageName.trim()||creatingPage} onClick={()=>void createPage()} title="Create page"><FilePlus2 size={16}/></button></div>{pages.find(page=>page.id===pageId)?.slug!=='home'&&pageId&&<button className="builder-remove-page" onClick={()=>void deletePage()}><Trash2 size={14}/> Delete page</button>}</div><div className="builder-tabs"><button className={leftTab==='elements'?'active':''} onClick={()=>setLeftTab('elements')}><Plus size={16}/> Elements</button><button className={leftTab==='layers'?'active':''} onClick={()=>setLeftTab('layers')}><Layers size={16}/> Layers</button><button className={leftTab==='assets'?'active':''} onClick={()=>setLeftTab('assets')}><FolderOpen size={16}/> Assets</button></div>
          {leftTab==='elements' ? <div className="builder-side-content"><p className="builder-hint">Drag an element onto the canvas, or click to append it.</p><div className="builder-element-grid">{palette.map(item=><button key={item.type} draggable onDragStart={event=>startDrag(event,{type:"new",blockType:item.type})} onDragEnd={endDrag} title={"Drag "+item.label+" onto canvas"} onClick={()=>add(item.type)}><item.icon size={23}/><strong>{item.label}</strong><small>{item.description}</small></button>)}</div><div className="builder-section-presets"><div className="builder-panel-heading"><strong>Sections</strong><span>Ready-made</span></div><p className="builder-hint">Insert a section, then customize its elements in Layers.</p>{sectionPresets.map(preset=><button key={preset.id} className="builder-section-preset" onClick={()=>insertSection(preset)}><span><strong>{preset.name}</strong><small>{preset.description}</small></span><Plus size={17}/></button>)}</div></div> : leftTab==='assets'?<div className="builder-side-content builder-assets-panel"><div className="builder-panel-heading"><strong>Assets</strong><span>{assets.length}</span></div><p className="builder-hint">Upload images from your computer, then select Use to insert them.</p><label className="builder-upload-zone">Upload images<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={assetBusy} onChange={e=>{void uploadAssets(e.target.files);e.target.value='';}}/></label><p className="builder-hint">PNG, JPEG or WebP, maximum 10 MB each. Local development storage.</p>{assetBusy&&<p>Uploading images…</p>}<div className="builder-asset-grid">{assets.map(asset=><div className="builder-asset-card" key={asset.id}><img src={asset.url} alt={asset.alt||''} loading="lazy"/><strong>{asset.name}</strong><div><button onClick={()=>useAsset(asset)}>Use</button><button onClick={()=>void deleteAsset(asset.id)} aria-label={'Remove '+asset.name}><Trash2 size={14}/></button></div></div>)}</div></div> : <div className="builder-side-content"><div className="builder-panel-heading"><strong>Page layers</strong><span>{site.blocks.length}</span></div>{site.blocks.length===0?<p className="builder-hint">No elements. Add one from Elements.</p>:site.blocks.map((b,index)=><div className={'builder-layer'+(selected===b.id?' active':'')} key={b.id} draggable onDragStart={event=>startDrag(event,{type:"move",id:b.id})} onDragEnd={endDrag}><button onClick={()=>setSelected(b.id)}><Layers size={15}/>{b.type} <small>{index+1}</small></button><div><button aria-label="Move up" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button aria-label="Move down" disabled={index===site.blocks.length-1} onClick={()=>move(index,1)}><ArrowDown size={13}/></button></div></div>)}</div>}
        </aside>}
        <div className="builder-stage"><div className="builder-stage-heading"><span>{device==='desktop'?'Desktop canvas':'Mobile canvas'}</span><span>{device==='desktop'?'Responsive':'390px wide'}</span></div><div className={'builder-canvas'+(device==='mobile'?' mobile':'')}>
          <div className="builder-site-header" style={{backgroundColor:globalDesign.headerBackground||undefined,color:globalDesign.headerTextColor||undefined}}><strong>{globalDesign.logoText||site.name}</strong><nav className="builder-site-links">{pages.map(page=><button key={page.id} className={page.id===pageId?'active':''} onClick={()=>{if(!preview)openPage(page);}}>{page.title}</button>)}</nav></div>
          <div className={'builder-site-body'+(dragging?' is-dragging':'')} style={{backgroundColor:globalDesign.pageBackground||undefined,color:globalDesign.bodyTextColor||undefined,fontFamily:globalDesign.fontFamily||undefined}} onDragOver={event=>{if(event.dataTransfer.types.includes(dragMime))event.preventDefault();}}>
            {site.blocks.filter(b=>!b.parentId || !site.blocks.some(parent=>parent.id===b.parentId && parent.type==='container')).map((b,index)=><div key={b.id}>
              {!preview && dropZone(site.blocks.indexOf(b))}
              <div className={'builder-block'+(selected===b.id&&!preview?' selected':'')} style={{width:b.style?.width==='full'?'100%':b.style?.width==='half'?'50%':undefined,maxWidth:'100%'}} draggable={!preview}
                onDragStart={event=>{event.stopPropagation();startDrag(event,{type:'move',id:b.id});}} onDragEnd={endDrag}
                onDragOver={event=>{if(preview)return;event.stopPropagation();if(b.type==='container'&&event.dataTransfer.types.includes(dragMime)){event.preventDefault();setDropIndex(-1);return;}const rect=event.currentTarget.getBoundingClientRect();acceptDrag(event,site.blocks.indexOf(b)+(event.clientY>rect.top+rect.height/2?1:0));}}
                onDrop={event=>{if(preview)return;event.stopPropagation();if(b.type==='container'){event.preventDefault();const raw=event.dataTransfer.getData(dragMime);try{const payload=JSON.parse(raw);if(payload.type==='move'){moveIntoContainer(payload.id,b.id);}else if(payload.type==='new'&&payload.blockType!=='container'&&palette.some(item=>item.type===payload.blockType)){const child:Block={id:makeId(),type:payload.blockType,text:defaults[payload.blockType],parentId:b.id,style:{}};setSite(previous=>({...previous,blocks:[...previous.blocks,child]}));setSelected(child.id);}}catch{}endDrag();return;}const rect=event.currentTarget.getBoundingClientRect();dropBlock(event,site.blocks.indexOf(b)+(event.clientY>rect.top+rect.height/2?1:0));}}
                onClick={event=>{event.stopPropagation();if(!preview){setSelected(b.id);setRightTab('content');}}}>
                {b.type==='container'?<div className="builder-layout-container" style={{display:b.layout==='grid'?'grid':'flex',flexDirection:b.layout==='row'?'row':'column',gridTemplateColumns:b.layout==='grid'?`repeat(${b.columns||2}, minmax(0,1fr))`:undefined,gap:(b.gap??16)+'px',padding:(b.style?.padding??20)+'px',background:b.style?.background||'#f5f7fb',borderRadius:(b.style?.radius??12)+'px'}}>
                  {site.blocks.filter(child=>child.parentId===b.id).map(child=><div key={child.id} className={'builder-block builder-nested-block'+(selected===child.id?' selected':'')} onClick={event=>{event.stopPropagation();if(!preview){setSelected(child.id);setRightTab('content');}}}>{renderBlock(child)}</div>)}
                  {!site.blocks.some(child=>child.parentId===b.id)&&<div className="builder-container-placeholder">Drop an element here or assign it from Layers</div>}
                </div>:renderBlock(b)}
              </div>
            </div>)}
            {!preview && dropZone(site.blocks.length)}
            {site.blocks.length===0&&<div className="builder-empty-canvas">Drag elements here to start designing your page.</div>}
          </div>
          <div className="builder-site-footer" style={{backgroundColor:globalDesign.footerBackground||undefined,color:globalDesign.footerTextColor||undefined}}>{globalDesign.footerText||`© ${new Date().getFullYear()} ${site.name}`}</div>
        </div></div>
        {!preview && <aside className="builder-right"><div className="builder-tabs"><button className={rightTab==='content'?'active':''} onClick={()=>setRightTab('content')}><Type size={16}/> Content</button><button className={rightTab==='style'?'active':''} onClick={()=>setRightTab('style')}><Code2 size={16}/> Style</button><button className={rightTab==='seo'?'active':''} onClick={()=>setRightTab('seo')}>SEO</button></div>
          {rightTab==='seo' ? <div className="builder-side-content"><div className="builder-panel-heading"><strong>Page SEO</strong></div><label htmlFor="seo-title">Search title</label><input id="seo-title" maxLength={70} value={site.seo?.title||''} onChange={e=>updateSeo({title:e.target.value})}/><label htmlFor="seo-description">Meta description</label><textarea id="seo-description" rows={5} maxLength={320} value={site.seo?.description||''} onChange={e=>updateSeo({description:e.target.value})}/><label htmlFor="seo-image">Social image URL</label><input id="seo-image" type="url" value={site.seo?.ogImage||''} onChange={e=>updateSeo({ogImage:e.target.value})}/><label className="builder-seo-toggle"><input type="checkbox" checked={site.seo?.noindex||false} onChange={e=>updateSeo({noindex:e.target.checked})}/> Noindex</label><p className="builder-hint">SEO values are saved with the page. Public metadata rendering is not implemented yet.</p></div> : current ? <div className="builder-side-content"><div className="builder-panel-heading"><strong>{current.type.charAt(0).toUpperCase()+current.type.slice(1)}</strong><button onClick={remove} className="builder-icon-danger" title="Delete element" aria-label="Delete element"><Trash2 size={17}/></button></div>
            <div className="builder-class-manager"><div className="builder-layout-heading">Reusable classes</div><div className="builder-class-add"><input aria-label="New class name" placeholder="e.g. card-title" value={classNameDraft} onChange={e=>setClassNameDraft(e.target.value)}/><button disabled={classSaving||!siteId} onClick={addClass}>Create</button></div>{Object.entries(classRules).map(([name,rule])=><div className="builder-class-rule" key={name}><div><strong>.{name}</strong><button disabled={classSaving} onClick={()=>{if(!current)return;const names=new Set((current.classNames||'').split(/\s+/).filter(Boolean));if(names.has(name))names.delete(name);else names.add(name);updateBlock({classNames:[...names].join(' ')});}}>{(current.classNames||'').split(/\s+/).includes(name)?'Remove':'Apply'}</button></div><label>Text color</label><input type="color" value={rule.color||'#131827'} onChange={e=>updateClass(name,{color:e.target.value})}/><label>Background</label><input type="color" value={rule.background||'#ffffff'} onChange={e=>updateClass(name,{background:e.target.value})}/><label>Font size (px)</label><input type="number" min="8" max="200" value={rule.fontSize??16} onChange={e=>updateClass(name,{fontSize:Number(e.target.value)})}/><label>Padding (px)</label><input type="number" min="0" max="300" value={rule.padding??0} onChange={e=>updateClass(name,{padding:Number(e.target.value)})}/><label>Radius (px)</label><input type="number" min="0" max="200" value={rule.radius??0} onChange={e=>updateClass(name,{radius:Number(e.target.value)})}/></div>)}</div><div className="builder-technical-panel"><div className="builder-layout-heading">Element attributes</div><label htmlFor="builder-html-id">HTML ID</label><input id="builder-html-id" value={current.htmlId||''} placeholder="hero-title" onChange={e=>updateBlock({htmlId:e.target.value})}/><label htmlFor="builder-css-class">CSS class names</label><input id="builder-css-class" value={current.classNames||''} placeholder="hero-heading text-large" onChange={e=>updateBlock({classNames:e.target.value})}/>{current.type==='image'&&<><label htmlFor="builder-alt">Image alt text</label><input id="builder-alt" value={current.alt||''} onChange={e=>updateBlock({alt:e.target.value})}/><button onClick={()=>setLeftTab('assets')}>Open asset library →</button></>}{current.type==='button'&&<><label htmlFor="builder-href">Button link</label><input id="builder-href" value={current.href||''} placeholder="/contact or https://example.com" onChange={e=>updateBlock({href:e.target.value})}/></>}<p className="builder-hint">IDs must start with a letter and be unique on each page. Classes use letters, numbers, underscores and hyphens.</p></div>
            {rightTab==='content' ? current.type==='cms-list' ? <><label htmlFor="builder-collection">CMS collection</label><select id="builder-collection" value={current.collectionId||''} onChange={e=>updateBlock({collectionId:e.target.value,displayField:''})}><option value="">Choose collection</option>{collections.map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><label htmlFor="builder-display-field">Card heading field</label><select id="builder-display-field" value={current.displayField||''} onChange={e=>updateBlock({displayField:e.target.value})}><option value="">First field</option>{collections.find(collection=>collection.id===current.collectionId)?.fields?.map(field=><option key={field.name} value={field.name}>{field.name}</option>)}</select><p className="builder-hint">Only published entries are displayed. Manage collection content in CMS.</p><Link href={'/cms?siteId='+encodeURIComponent(siteId)}>Manage CMS →</Link></> : current.type==='image'?<div className="builder-image-source"><strong>Image source</strong>{current.text&&<img className="builder-image-source-preview" src={current.text} alt={current.alt||''}/>}<button className="primary" onClick={()=>{void refreshAssets();setImagePickerOpen(true);}}>Choose from Assets</button><label className="builder-upload-zone">Upload new image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={assetBusy} onChange={e=>{void uploadAssets(e.target.files,true);e.target.value='';}}/></label>{assetBusy&&<p>Uploading…</p>}<p className="builder-hint">Upload or select an image. The element updates automatically.</p></div>:<><label htmlFor="builder-content">Text content</label><textarea id="builder-content" rows={current.type==='paragraph'?8:4} value={current.text} onChange={e=>updateBlock({text:e.target.value})}/><p className="builder-hint">Changes appear immediately on the canvas.</p></> :
            <><label htmlFor="builder-color">Text color</label><div className="builder-color-control"><input id="builder-color" type="color" value={current.style?.color||'#131827'} onChange={e=>updateStyle({color:e.target.value})}/><span>{current.style?.color||'Default'}</span></div>
              <label htmlFor="builder-bg">Background color</label><div className="builder-color-control"><input id="builder-bg" type="color" value={current.style?.background||'#ffffff'} onChange={e=>updateStyle({background:e.target.value})}/><span>{current.style?.background||'Default'}</span></div>
              <label htmlFor="builder-font-size">Font size (px)</label><input id="builder-font-size" type="number" min="8" max="120" placeholder="Default" value={current.style?.fontSize??''} onChange={e=>updateStyle({fontSize:e.target.value?Number(e.target.value):undefined})}/>
              <label htmlFor="builder-padding">Padding (px)</label><input id="builder-padding" type="number" min="0" max="160" placeholder="Default" value={current.style?.padding??''} onChange={e=>updateStyle({padding:e.target.value?Number(e.target.value):0})}/>
              <label htmlFor="builder-radius">Corner radius (px)</label><input id="builder-radius" type="number" min="0" max="120" placeholder="Default" value={current.style?.radius??''} onChange={e=>updateStyle({radius:e.target.value?Number(e.target.value):0})}/>
              <div className="builder-layout-heading">Layout & spacing</div><label htmlFor="builder-width">Element width</label><select id="builder-width" value={current.style?.width||'auto'} onChange={e=>updateStyle({width:e.target.value as 'auto'|'full'|'half'})}><option value="auto">Auto</option><option value="full">Full width</option><option value="half">Half width</option></select><label htmlFor="builder-max-width">Max width (px)</label><input id="builder-max-width" type="number" min="100" max="2000" placeholder="None" value={current.style?.maxWidth??''} onChange={e=>updateStyle({maxWidth:e.target.value?Number(e.target.value):undefined})}/><label htmlFor="builder-margin-top">Space above (px)</label><input id="builder-margin-top" type="number" min="0" max="500" value={current.style?.marginTop??''} onChange={e=>updateStyle({marginTop:e.target.value?Number(e.target.value):undefined})}/><label htmlFor="builder-margin-bottom">Space below (px)</label><input id="builder-margin-bottom" type="number" min="0" max="500" value={current.style?.marginBottom??''} onChange={e=>updateStyle({marginBottom:e.target.value?Number(e.target.value):undefined})}/>{current.type==='container'&&<><label htmlFor="builder-container-layout">Container layout</label><select id="builder-container-layout" value={current.layout||'column'} onChange={e=>updateBlock({layout:e.target.value as 'column'|'row'|'grid'})}><option value="column">Column</option><option value="row">Row</option><option value="grid">Grid</option></select><label htmlFor="builder-container-gap">Gap (px)</label><input id="builder-container-gap" type="number" min="0" max="200" value={current.gap??16} onChange={e=>updateBlock({gap:Number(e.target.value)})}/>{current.layout==='grid'&&<><label htmlFor="builder-container-columns">Grid columns</label><input id="builder-container-columns" type="number" min="1" max="6" value={current.columns??2} onChange={e=>updateBlock({columns:Number(e.target.value)})}/></>}</>}<label htmlFor="builder-align">Text alignment</label><select id="builder-align" value={current.style?.align||'left'} onChange={e=>updateStyle({align:e.target.value as 'left'|'center'|'right'})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></>}
          </div> : <div className="builder-side-content builder-hint">Select an element on the canvas or in Layers to edit its content and styles.</div>}
        </aside>}
      </div>
{imagePickerOpen&&<div className="builder-asset-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setImagePickerOpen(false);}}><div className="builder-asset-modal" role="dialog" aria-modal="true" aria-label="Choose image"><div className="builder-panel-heading"><strong>Choose image from Assets</strong><button onClick={()=>setImagePickerOpen(false)} aria-label="Close image picker"><X size={18}/></button></div><label className="builder-upload-zone">Upload new image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={assetBusy} onChange={e=>{void uploadAssets(e.target.files,true);e.target.value='';}}/></label><div className="builder-asset-modal-grid">{assets.map(asset=><button key={asset.id} onClick={()=>useAsset(asset)}><img src={asset.url} alt={asset.alt||asset.name}/><span>{asset.name}</span></button>)}</div>{assets.length===0&&<p>No images yet. Upload one to get started.</p>}</div></div>}
    </div>
  </div>;
}
export default function DesignerPage(){return <Suspense fallback={<div className="builder">Loading designer…</div>}><Workspace/></Suspense>}
