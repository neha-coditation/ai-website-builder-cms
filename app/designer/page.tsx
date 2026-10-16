'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, FormInput, ListFilter, PanelsTopLeft, CheckSquare, Minus, MoveVertical, Video, TextCursorInput, ChevronDown, FileText, GripVertical, ChevronsUpDown, FilePlus2, Files, Settings2, AlignLeft, ArrowDown, ArrowUp, Undo2, Redo2, ChevronLeft, Code2, Database, Eye, Heading1, Image as ImageIcon, Layers, FolderOpen, LayoutTemplate, Monitor, MousePointer2, Plus, Save, Smartphone, Trash2, Pencil, RefreshCw, Type, X } from 'lucide-react';

type BlockType = 'heading' | 'paragraph' | 'button' | 'image' | 'cms-list' | 'container' | 'form' | 'search' | 'dropdown' | 'tabs' | 'input' | 'textarea' | 'checkbox' | 'select' | 'divider' | 'spacer' | 'video' | 'embed';
type Block = { id: string; type: BlockType; text: string; collectionId?: string; displayField?: string; htmlId?:string; classNames?:string; alt?:string; href?:string; parentId?:string; componentId?:string; componentInstanceId?:string; componentSourceId?:string; layout?:'column'|'row'|'grid';gap?:number;columns?:number; style?: { color?: string; background?: string; fontSize?: number; padding?: number; radius?: number; align?: 'left'|'center'|'right'; width?: 'auto'|'full'|'half'; maxWidth?: number; marginTop?: number; marginBottom?: number } };
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
  { type: 'form', label: 'Form', icon: Files, description: 'Form layout and fields' },
  { type: 'search', label: 'Search', icon: MousePointer2, description: 'Search input' },
  { type: 'dropdown', label: 'Dropdown', icon: Layers, description: 'Expandable menu' },
  { type: 'tabs', label: 'Tabs', icon: LayoutTemplate, description: 'Tabbed content' },
  { type: 'input', label: 'Input', icon: Type, description: 'Single-line form field' },
  { type: 'textarea', label: 'Text area', icon: AlignLeft, description: 'Multi-line form field' },
  { type: 'checkbox', label: 'Checkbox', icon: MousePointer2, description: 'Boolean form field' },
  { type: 'select', label: 'Select', icon: Layers, description: 'Form option selector' },
  { type: 'divider', label: 'Divider', icon: Layers, description: 'Horizontal separator' },
  { type: 'spacer', label: 'Spacer', icon: LayoutTemplate, description: 'Layout spacing' },
  { type: 'video', label: 'Video', icon: ImageIcon, description: 'Video embed placeholder' },
  { type: 'embed', label: 'Embed', icon: Code2, description: 'Custom embed placeholder' },
];
const layerIcons:Record<BlockType,typeof Type>={
 heading:Heading1,paragraph:AlignLeft,button:MousePointer2,image:ImageIcon,'cms-list':Database,container:LayoutTemplate,
 form:FormInput,search:Search,dropdown:ChevronDown,tabs:PanelsTopLeft,input:TextCursorInput,textarea:FileText,
 checkbox:CheckSquare,select:ListFilter,divider:Minus,spacer:MoveVertical,video:Video,embed:Code2
};
function layerLabel(block:Block){return block.type==='container'?(block.text||'Container'):block.type==='heading'?(block.text||'Heading'):block.type==='paragraph'?(block.text.slice(0,32)||'Text'):block.type==='image'?(block.alt||'Image'):block.type==='button'?(block.text||'Button'):palette.find(p=>p.type===block.type)?.label||block.type;}
const defaults: Record<BlockType, string> = { heading: 'New heading', paragraph: 'Write your paragraph here.', button: 'Click here', image: '', 'cms-list': 'Collection list', container:'Container', form:'Contact us',search:'Search',dropdown:'Menu',tabs:'Overview|Details|FAQ',input:'Your name',textarea:'Your message',checkbox:'I agree',select:'Option 1|Option 2|Option 3',divider:'',spacer:'',video:'',embed:'' };

type SavedComponent = { id:string; name:string; blocks:Block[]; createdAt:string };
type SectionPreset = { id:string; name:string; description:string; category:'Marketing'|'Content'|'Commerce'|'Layout'; blocks: Omit<Block,'id'>[] };
const sectionPresets: SectionPreset[] = [
  {id:'hero',category:'Marketing',name:'Hero',description:'Headline, introduction and call to action',blocks:[
    {type:'heading',text:'Your next big idea starts here',style:{fontSize:52,align:'center',padding:16}},
    {type:'paragraph',text:'A clear message that helps visitors understand what you offer.',style:{fontSize:19,align:'center',padding:12}},
    {type:'button',text:'Get started',style:{background:'#3064fe',color:'#ffffff',radius:10,padding:16,align:'center'}}]},
  {id:'features',category:'Marketing',name:'Features',description:'Section title with three benefit statements',blocks:[
    {type:'heading',text:'Why choose us',style:{fontSize:38,padding:16}},
    {type:'paragraph',text:'01 — Built for your needs. Explain the first benefit.',style:{fontSize:18,padding:12}},
    {type:'paragraph',text:'02 — Simple to use. Explain the second benefit.',style:{fontSize:18,padding:12}},
    {type:'paragraph',text:'03 — Ready to grow. Explain the third benefit.',style:{fontSize:18,padding:12}}]},
  {id:'cta',category:'Marketing',name:'Call to action',description:'Conversion-focused closing section',blocks:[
    {type:'heading',text:'Ready to work together?',style:{fontSize:36,align:'center',padding:18}},
    {type:'paragraph',text:'Tell us what you are building and we will help you get started.',style:{align:'center',padding:10}},
    {type:'button',text:'Contact us',style:{background:'#3064fe',color:'#ffffff',radius:8,padding:14}}]},
  {id:'content',category:'Content',name:'Editorial',description:'Article heading, image and body copy',blocks:[
    {type:'heading',text:'A story worth sharing',style:{fontSize:42,padding:12}},
    {type:'image',text:'',style:{radius:12,padding:8}},
    {type:'paragraph',text:'Write your story here. Add context, supporting details, and a clear takeaway.',style:{fontSize:17,padding:12}}]},
  {id:'faq',category:'Content',name:'FAQ',description:'Questions and answers',blocks:[
    {type:'heading',text:'Frequently asked questions',style:{fontSize:36,padding:14}},
    {type:'dropdown',text:'What does your service include?',style:{padding:12}},
    {type:'dropdown',text:'How do I get started?',style:{padding:12}},
    {type:'dropdown',text:'Can I contact your team?',style:{padding:12}}]},
  {id:'contact',category:'Marketing',name:'Contact',description:'Heading and contact form',blocks:[
    {type:'heading',text:'Get in touch',style:{fontSize:38,padding:14}},
    {type:'paragraph',text:'Tell us about your project.',style:{fontSize:17,padding:12}},
    {type:'form',text:'Contact us',style:{padding:16}}]},
  {id:'testimonials',category:'Marketing',name:'Testimonials',description:'Customer quotes and social proof',blocks:[
    {type:'heading',text:'What our customers say',style:{fontSize:36,padding:12}},
    {type:'paragraph',text:'“A great experience from start to finish.” — Customer',style:{fontSize:20,padding:14}},
    {type:'paragraph',text:'“We would happily recommend this team.” — Customer',style:{fontSize:20,padding:14}}]},
  {id:'newsletter',category:'Marketing',name:'Newsletter',description:'Newsletter signup section',blocks:[
    {type:'heading',text:'Stay in the loop',style:{fontSize:34,padding:12}},
    {type:'paragraph',text:'Get product news and updates.',style:{padding:10}},
    {type:'form',text:'Subscribe',style:{padding:14}}]},
  {id:'gallery',category:'Content',name:'Gallery',description:'Image-led content section',blocks:[
    {type:'heading',text:'Explore our work',style:{fontSize:36,padding:12}},
    {type:'image',text:'',style:{radius:12,padding:10}},
    {type:'image',text:'',style:{radius:12,padding:10}}]},
  {id:'pricing',category:'Commerce',name:'Pricing',description:'Pricing plan and conversion action',blocks:[
    {type:'heading',text:'Simple, transparent pricing',style:{fontSize:38,padding:12}},
    {type:'paragraph',text:'Starter — $29/month. Customize this plan.',style:{fontSize:20,padding:12}},
    {type:'button',text:'Choose plan',style:{background:'#3064fe',color:'#ffffff',padding:14,radius:8}}]},
  {id:'blank',category:'Layout',name:'Blank section',description:'Empty section container for your own layout',blocks:[]},
];
function Workspace() {
  const search = useSearchParams();
  const siteId = search.get('siteId') || '';
  const [site, setSite] = useState<Site>(() => starter('Untitled website'));
  const [globalDesign,setGlobalDesign] = useState<GlobalDesign>({});
  const [selected, setSelected] = useState<string | null>('hero-title');
  const [multiSelected,setMultiSelected]=useState<string[]>([]);
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop');
  const [leftTab, setLeftTab] = useState<'pages'|'elements'|'layers'|'assets'>('pages');
  const [layerSearch,setLayerSearch]=useState('');
  const [collapsedLayers,setCollapsedLayers]=useState<string[]>([]);
  const [pagesExpanded,setPagesExpanded]=useState(true);
  const [pageSettingsOpen,setPageSettingsOpen]=useState(false);
  const [leftCollapsed,setLeftCollapsed]=useState(false);
  const [rightCollapsed,setRightCollapsed]=useState(false);
  const [rightTab, setRightTab] = useState<'content'|'style'>('content');
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus,setAutoSaveStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [components,setComponents]=useState<SavedComponent[]>([]);
  const [componentsLoaded,setComponentsLoaded]=useState(false);
  const [componentBusy,setComponentBusy]=useState(false);
  const [componentName,setComponentName]=useState('');
  const [elementSearch,setElementSearch]=useState('');
  const [elementCategory,setElementCategory]=useState<'All'|'Elements'|'Sections'|'Components'>('All');
  const lastAutoSaved=useRef<{key:string;json:string}>({key:'',json:''});
  const autoSaveRequest=useRef<Promise<void>>(Promise.resolve());
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
  const [videoBusy,setVideoBusy]=useState(false);
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
  useEffect(()=>{
    if(!siteId)return;
    let active=true;
    setComponentsLoaded(false);
    fetch('/api/projects/'+encodeURIComponent(siteId)+'/components').then(async response=>{
      if(!response.ok)throw Error('Unable to load components');
      return response.json();
    }).then(data=>{if(active){setComponents(data.components||[]);setComponentsLoaded(true);}})
      .catch(error=>{if(active){setComponents([]);setComponentsLoaded(true);setError(error instanceof Error?error.message:'Unable to load components');}});
    return ()=>{active=false;};
  },[siteId]);
  useEffect(()=>{
    if(!loaded||!historyReady||!siteId)return;
    const key=siteId+':'+pageId;
    const json=JSON.stringify(site);
    if(lastAutoSaved.current.key!==key){
      lastAutoSaved.current={key,json};
      setAutoSaveStatus('idle');
      return;
    }
    if(lastAutoSaved.current.json===json)return;
    setAutoSaveStatus('idle');
    const timer=window.setTimeout(()=>{
      setAutoSaveStatus('saving');
      const url=pageId?'/api/projects/'+encodeURIComponent(siteId)+'/pages/'+encodeURIComponent(pageId):'/api/projects/'+encodeURIComponent(siteId)+'/home';
      autoSaveRequest.current=autoSaveRequest.current.catch(()=>{}).then(async()=>{
        const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(pageId?{content:JSON.parse(json)}:JSON.parse(json))});
        if(!response.ok)throw new Error('Autosave failed ('+response.status+')');
        lastAutoSaved.current={key,json};
        localStorage.setItem('studio-cms-designer-'+siteId,json);
        setAutoSaveStatus('saved');
      }).catch(error=>{setAutoSaveStatus('error');setError(error instanceof Error?error.message:'Autosave failed');});
    },1100);
    return ()=>window.clearTimeout(timer);
  },[site,siteId,pageId,loaded,historyReady]);
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
      if(preview || pageSettingsOpen || imagePickerOpen || !loaded)return;
      const element=event.target as HTMLElement|null;
      if(element?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
      const command=event.metaKey||event.ctrlKey;
      const key=event.key.toLowerCase();
      if(command&&key==='z'&&!event.altKey){event.preventDefault();if(event.shiftKey)redo();else undo();return;}
      if(command&&key==='d'&&!event.altKey){event.preventDefault();duplicateSelection();return;}
      if(!command&&!event.altKey&&(event.key==='Delete'||event.key==='Backspace')){if(selectedIds().length){event.preventDefault();remove();}return;}
      if(!command&&!event.altKey&&event.key==='Escape'){setSelected(null);setMultiSelected([]);}
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
  function renameClass(name:string){
    const next=window.prompt('Rename CSS class',name)?.trim();
    if(!next||next===name)return;
    if(!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(next)||classRules[next]){setError('Enter a unique, valid CSS class name.');return;}
    const updated={...classRules,[next]:classRules[name]};
    delete updated[name];
    void saveClasses(updated);
    setSite(previous=>({...previous,blocks:previous.blocks.map(block=>({...block,classNames:(block.classNames||'').split(/\s+/).filter(Boolean).map(value=>value===name?next:value).join(' ')}))}));
    setSaved(false);
  }
  function removeClass(name:string){
    if(!window.confirm('Delete class .'+name+'? It will be removed from every element on this page.'))return;
    const updated={...classRules};
    delete updated[name];
    void saveClasses(updated);
    setSite(previous=>({...previous,blocks:previous.blocks.map(block=>({...block,classNames:(block.classNames||'').split(/\s+/).filter(value=>value&&value!==name).join(' ')}))}));
    setSaved(false);
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
    setMultiSelected([block.id]);
    setLeftTab('layers');
    setRightTab('content');
    setPreview(false);
  }

  async function saveAsComponent(){
    const ids=new Set(multiSelected.length?multiSelected:(selected?[selected]:[]));
    const name=componentName.trim()||window.prompt('Component name')?.trim();
    if(!name||!ids.size)return;
    let changed=true;
    while(changed){changed=false;for(const b of site.blocks){if(b.parentId&&ids.has(b.parentId)&&!ids.has(b.id)){ids.add(b.id);changed=true;}}}
    const blocks=site.blocks.filter(b=>ids.has(b.id)).map(b=>structuredClone(b));
    
    if(!siteId)return;
    setComponentBusy(true);
    try{const response=await fetch('/api/projects/'+encodeURIComponent(siteId)+'/components',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,blocks})});if(!response.ok)throw Error('Unable to create component');const saved=await response.json();setComponents(previous=>[...previous,saved]);setComponentName('');}catch(error){setError(error instanceof Error?error.message:'Unable to create component');}finally{setComponentBusy(false);}
  }
  function syncComponentInstances(component:SavedComponent){
    const instances=new Set(site.blocks.filter(b=>b.componentId===component.id&&b.componentInstanceId).map(b=>b.componentInstanceId!));
    if(!instances.size){setError('No linked instances of this component on the current page.');return;}
    setSite(previous=>{
      let blocks=[...previous.blocks];
      for(const instanceId of instances){
        const old=blocks.filter(b=>b.componentId===component.id&&b.componentInstanceId===instanceId);
        if(!old.length)continue;
        const oldRoot=old.find(b=>!b.parentId||!old.some(parent=>parent.id===b.parentId));
        const outsideParent=oldRoot?.parentId;
        const index=blocks.findIndex(b=>b.id===old[0].id);
        blocks=blocks.filter(b=>!(b.componentId===component.id&&b.componentInstanceId===instanceId));
        const idMap=new Map(component.blocks.map(b=>[b.id,makeId()]));
        const newBlocks=component.blocks.map(b=>({
          ...structuredClone(b),
          id:idMap.get(b.id)!,
          parentId:b.parentId?(idMap.get(b.parentId)||outsideParent):outsideParent,
          componentId:component.id,
          componentInstanceId:instanceId,
          componentSourceId:b.id
        }));
        blocks.splice(Math.min(index,blocks.length),0,...newBlocks);
      }
      return {...previous,blocks};
    });
    setSaved(false);
  }
  function detachComponentInstance(){
    if(!current?.componentInstanceId)return;
    const instance=current.componentInstanceId;
    setSite(previous=>({...previous,blocks:previous.blocks.map(b=>b.componentInstanceId===instance?{...b,componentId:undefined,componentInstanceId:undefined,componentSourceId:undefined}:b)}));
    setSaved(false);
  }
  function insertComponent(component:SavedComponent){
    const ids=new Map(component.blocks.map(b=>[b.id,makeId()]));
    const instanceId=makeId();
    const reserved=[...site.blocks];
    const copies=component.blocks.map(b=>{
      const next:Block={...structuredClone(b),id:ids.get(b.id)!,parentId:b.parentId?ids.get(b.parentId):undefined,classNames:autoClass(b.type,reserved),componentId:component.id,componentInstanceId:instanceId,componentSourceId:b.id};
      reserved.push(next);return next;
    });
    setSite(previous=>({...previous,blocks:[...previous.blocks,...copies]}));
    setSelected(copies[0]?.id||null);setMultiSelected(copies.map(b=>b.id));setSaved(false);setLeftTab('layers');
  }
  async function renameComponent(id:string){
    const component=components.find(c=>c.id===id);
    if(!component)return;
    const name=window.prompt('Rename component',component.name)?.trim();
    if(!name)return;
    if(!siteId)return;
    setComponentBusy(true);try{const response=await fetch('/api/projects/'+encodeURIComponent(siteId)+'/components/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});if(!response.ok)throw Error('Rename failed');setComponents(previous=>previous.map(c=>c.id===id?{...c,name}:c));}catch(error){setError(error instanceof Error?error.message:'Rename failed');}finally{setComponentBusy(false);}
  }
  async function replaceComponentFromSelection(id:string){
    const component=components.find(c=>c.id===id);
    if(!component)return;
    const ids=new Set(multiSelected.length?multiSelected:(selected?[selected]:[]));
    if(!ids.size){setError('Select the updated elements in Layers before updating this component.');return;}
    let changed=true;
    while(changed){changed=false;for(const b of site.blocks){if(b.parentId&&ids.has(b.parentId)&&!ids.has(b.id)){ids.add(b.id);changed=true;}}}
    const blocks=site.blocks.filter(b=>ids.has(b.id)).map(b=>structuredClone(b));
    if(!window.confirm('Replace saved component "'+component.name+'" with '+blocks.length+' selected elements? Existing inserted copies will not change.'))return;
    if(!siteId)return;
    setComponentBusy(true);try{const response=await fetch('/api/projects/'+encodeURIComponent(siteId)+'/components/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({blocks})});if(!response.ok)throw Error('Update failed');setComponents(previous=>previous.map(c=>c.id===id?{...c,blocks}:c));}catch(error){setError(error instanceof Error?error.message:'Update failed');}finally{setComponentBusy(false);}
  }
  async function deleteComponent(id:string){if(!siteId)return;setComponentBusy(true);try{const response=await fetch('/api/projects/'+encodeURIComponent(siteId)+'/components/'+encodeURIComponent(id),{method:'DELETE'});if(!response.ok)throw Error('Delete failed');setComponents(previous=>previous.filter(c=>c.id!==id));}catch(error){setError(error instanceof Error?error.message:'Delete failed');}finally{setComponentBusy(false);}}
  function insertSection(preset: SectionPreset) {
    const reserved=[...site.blocks];
    const parent:Block={id:makeId(),type:'container',text:preset.name+' section',classNames:autoClass('container',reserved),layout:'column',gap:16,style:{padding:24,width:'full'}};
    reserved.push(parent);
    const children:Block[]=preset.blocks.map(block=>{
      const next:Block={...block,id:makeId(),parentId:parent.id,classNames:autoClass(block.type,reserved),style:{...block.style}};
      reserved.push(next);return next;
    });
    setSite(previous=>({...previous,blocks:[...previous.blocks,parent,...children]}));
    setSelected(parent.id);
    setMultiSelected([parent.id]);
    setLeftTab('layers');setRightTab('content');setPreview(false);setSaved(false);
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
      setMultiSelected([block.id]);
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
      setSelected(payload.id);setMultiSelected([payload.id]);
    }
  }
  function dropZone(index: number) {
    return <div key={'drop-'+index} className={'builder-drop-zone'+(dropIndex === index ? ' is-over' : '')}
      onDragOver={event => acceptDrag(event, index)}
      onDragEnter={event => acceptDrag(event, index)}
      onDrop={event => dropBlock(event, index)}
      aria-hidden="true"><span>Drop here</span></div>;
  }
  function toggleSelection(id:string,additive:boolean){
    if(!additive){setSelected(id);setMultiSelected([id]);return;}
    const currentIds=multiSelected.length?multiSelected:(selected?[selected]:[]);
    const next=currentIds.includes(id)?currentIds.filter(item=>item!==id):[...currentIds,id];
    setMultiSelected(next);setSelected(next[next.length-1]||null);
  }
  function groupSelection(){
    const ids=new Set(multiSelected);
    if(ids.size<2)return;
    const chosen=site.blocks.filter(b=>ids.has(b.id));
    if(chosen.length<2)return;
    const parent=chosen.every(b=>b.parentId===chosen[0].parentId)?chosen[0].parentId:undefined;
    const containerId=makeId();
    const wrapper:Block={id:containerId,type:'container',text:'Group',classNames:autoClass('container',site.blocks),layout:'column',gap:12,parentId:parent,style:{}};
    setSite(previous=>{
      const blocks=[...previous.blocks];const first=blocks.findIndex(b=>ids.has(b.id));
      blocks.splice(first,0,wrapper);
      return {...previous,blocks:blocks.map(b=>ids.has(b.id)?{...b,parentId:containerId}:b)};
    });
    setSelected(containerId);setMultiSelected([containerId]);setRightTab('style');setSaved(false);
  }
  function ungroupSelection(){
    if(!current||current.type!=='container')return;
    const parent=current.parentId;
    setSite(previous=>({...previous,blocks:previous.blocks.filter(b=>b.id!==current.id).map(b=>b.parentId===current.id?{...b,parentId:parent}:b)}));
    setSelected(null);setMultiSelected([]);setSaved(false);
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
  function dropOnLayer(event:DragEvent<HTMLElement>,targetId:string,position:'before'|'inside'|'after'){
    event.preventDefault();event.stopPropagation();
    const raw=event.dataTransfer.getData(dragMime);endDrag();
    if(!raw)return;
    let payload:{type:'move';id:string}|{type:'new';blockType:BlockType};
    try{payload=JSON.parse(raw);}catch{return;}
    const target=site.blocks.find(block=>block.id===targetId);
    if(!target)return;
    if(position==='inside'&&target.type!=='container')return;
    const parentId=position==='inside'?target.id:target.parentId;
    if(payload.type==='move'){
      if(payload.id===targetId)return;
      const descendants=new Set([payload.id]);
      let changed=true;
      while(changed){changed=false;for(const b of site.blocks){if(b.parentId&&descendants.has(b.parentId)&&!descendants.has(b.id)){descendants.add(b.id);changed=true;}}}
      if(parentId&&descendants.has(parentId))return;
      setSite(previous=>{
        const moved=previous.blocks.find(b=>b.id===payload.id);
        if(!moved)return previous;
        const subtree=previous.blocks.filter(b=>descendants.has(b.id));
        const remaining=previous.blocks.filter(b=>!descendants.has(b.id));
        const targetIndex=remaining.findIndex(b=>b.id===targetId);
        const insertAt=position==='inside'?targetIndex+1:position==='before'?targetIndex:targetIndex+1;
        if(insertAt<0)return previous;
        const reordered=[...remaining];
        reordered.splice(insertAt,0,...subtree.map(b=>b.id===payload.id?{...b,parentId}:b));
        return {...previous,blocks:reordered};
      });
    }else{
      const type=payload.blockType;
      if(!palette.some(item=>item.type===type))return;
      const block:Block={id:makeId(),type,text:defaults[type],classNames:autoClass(type,site.blocks),parentId,style:{}};
      setSite(previous=>{
        const next=[...previous.blocks];
        const index=next.findIndex(b=>b.id===targetId);
        next.splice(position==='before'?index:index+1,0,block);
        return {...previous,blocks:next};
      });
      setSelected(block.id);setMultiSelected([block.id]);setRightTab('content');
    }
    if(parentId)setCollapsedLayers(previous=>previous.filter(id=>id!==parentId));
    setSaved(false);
  }
  function layerDragOver(event:DragEvent<HTMLElement>){
    if(!event.dataTransfer.types.includes(dragMime))return;
    event.preventDefault();event.stopPropagation();
    event.dataTransfer.dropEffect='move';
  }
  function visibleLayerRows(){
    const children=new Map<string,Block[]>();
    const ids=new Set(site.blocks.map(block=>block.id));
    for(const block of site.blocks){
      const parent=block.parentId&&ids.has(block.parentId)&&block.parentId!==block.id?block.parentId:'root';
      const list=children.get(parent)||[];list.push(block);children.set(parent,list);
    }
    const matching=new Set<string>();
    const query=layerSearch.trim().toLowerCase();
    for(const block of site.blocks){
      if(!query||[layerLabel(block),block.type,block.classNames||''].join(' ').toLowerCase().includes(query)){
        matching.add(block.id);
        let parent=block.parentId;
        const visited=new Set<string>();
        while(parent&&ids.has(parent)&&!visited.has(parent)){visited.add(parent);matching.add(parent);parent=site.blocks.find(b=>b.id===parent)?.parentId;}
      }
    }
    const rows:{block:Block;depth:number;hasChildren:boolean}[]=[];
    const visited=new Set<string>();
    function walk(parent:string,depth:number){
      if(depth>20)return;
      for(const block of children.get(parent)||[]){
        if(visited.has(block.id)||!matching.has(block.id))continue;
        visited.add(block.id);
        const hasChildren=(children.get(block.id)||[]).length>0;
        rows.push({block,depth,hasChildren});
        if(query||!collapsedLayers.includes(block.id))walk(block.id,depth+1);
      }
    }
    walk('root',0);
    // Surface malformed/cyclic orphan records instead of silently hiding them.
    for(const block of site.blocks){if(!visited.has(block.id)&&matching.has(block.id)){rows.push({block,depth:0,hasChildren:false});}}
    return rows;
  }
  function toggleLayerCollapsed(id:string){
    setCollapsedLayers(previous=>previous.includes(id)?previous.filter(item=>item!==id):[...previous,id]);
  }
  function moveIntoContainer(childId:string,containerId:string) {
    if(childId===containerId)return;
    const descendants=new Set([childId]);
    let changed=true;
    while(changed){changed=false;for(const block of site.blocks){if(block.parentId&&descendants.has(block.parentId)&&!descendants.has(block.id)){descendants.add(block.id);changed=true;}}}
    if(descendants.has(containerId))return;
    setSite(previous=>({...previous,blocks:previous.blocks.map(block=>block.id===childId?{...block,parentId:containerId}:block)}));
  }
  function dropIntoContainer(event:DragEvent<HTMLElement>,containerId:string,index?:number){
    event.preventDefault();event.stopPropagation();
    const raw=event.dataTransfer.getData(dragMime);endDrag();
    if(!raw)return;
    try{
      const payload=JSON.parse(raw) as {type:'move';id:string}|{type:'new';blockType:BlockType};
      if(payload.type==='new'){
        if(!palette.some(p=>p.type===payload.blockType))return;
        const child:Block={id:makeId(),type:payload.blockType,text:defaults[payload.blockType],classNames:autoClass(payload.blockType,site.blocks),parentId:containerId,style:{}};
        setSite(prev=>{const next=[...prev.blocks];next.splice(index??next.length,0,child);return {...prev,blocks:next};});
        setSelected(child.id);setMultiSelected([child.id]);setRightTab('content');
      }else if(payload.type==='move'){
        if(payload.id===containerId)return;
        const descendants=new Set([payload.id]);let changed=true;
        while(changed){changed=false;for(const b of site.blocks){if(b.parentId&&descendants.has(b.parentId)&&!descendants.has(b.id)){descendants.add(b.id);changed=true;}}}
        if(descendants.has(containerId))return;
        setSite(prev=>{
          const blocks=[...prev.blocks];const from=blocks.findIndex(b=>b.id===payload.id);
          if(from<0)return prev;
          const [moved]=blocks.splice(from,1);moved.parentId=containerId;
          const target=index===undefined?blocks.length:Math.min(index,blocks.length);
          blocks.splice(target,0,moved);
          return {...prev,blocks};
        });
      }
    }catch{setError('Unable to drop element in container');}
  }
  async function uploadVideo(files:FileList|null){
    if(!siteId||!files?.length||!current||current.type!=='video')return;
    setVideoBusy(true);
    try{
      const form=new FormData();form.append('siteId',siteId);form.append('file',files[0]);
      const response=await fetch('/api/videos/upload',{method:'POST',body:form});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Video upload failed');
      updateBlock({text:data.url});
    }catch(cause){setError(cause instanceof Error?cause.message:'Video upload failed');}
    finally{setVideoBusy(false);}
  }
  function selectedIds(){
    return multiSelected.length?multiSelected:(selected?[selected]:[]);
  }
  function duplicateSelection(){
    const selectedSet=new Set(selectedIds());
    if(!selectedSet.size)return;
    // Duplicate selected containers with their descendants, preserving nested relationships.
    let changed=true;
    while(changed){changed=false;for(const block of site.blocks){if(block.parentId&&selectedSet.has(block.parentId)&&!selectedSet.has(block.id)){selectedSet.add(block.id);changed=true;}}}
    const ids=new Map<string,string>();
    const existing=[...site.blocks];
    for(const block of site.blocks){if(selectedSet.has(block.id))ids.set(block.id,makeId());}
    const copies:Block[]=[];
    for(const block of site.blocks){
      if(!selectedSet.has(block.id))continue;
      const copy:Block={...block,id:ids.get(block.id)!,parentId:block.parentId?(ids.get(block.parentId)||block.parentId):undefined,classNames:autoClass(block.type,existing),style:{...block.style}};
      existing.push(copy);copies.push(copy);
    }
    setSite(prev=>({...prev,blocks:[...prev.blocks,...copies]}));
    setSelected(copies[0]?.id||null);
    setMultiSelected(copies.map(block=>block.id));
    setSaved(false);
  }
  function remove(){
    const ids=new Set(selectedIds());
    if(!ids.size)return;
    // Deleting a container also removes its descendants to avoid orphaned blocks.
    let changed=true;
    while(changed){changed=false;for(const block of site.blocks){if(block.parentId&&ids.has(block.parentId)&&!ids.has(block.id)){ids.add(block.id);changed=true;}}}
    setSite(prev=>({...prev,blocks:prev.blocks.filter(block=>!ids.has(block.id))}));
    setSelected(null);setMultiSelected([]);setSaved(false);
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
    if(b.type==='form')return <form className="builder-element-form" style={style} onSubmit={e=>e.preventDefault()}><strong>{b.text}</strong><label>Name<input placeholder="Your name" /></label><label>Email<input type="email" placeholder="you@example.com"/></label><label>Message<textarea placeholder="Your message"/></label><button type="submit">Submit</button></form>;
    if(b.type==='search')return <div className="builder-element-search" style={style}><input type="search" placeholder={b.text||'Search'}/><button type="button">Search</button></div>;
    if(b.type==='dropdown')return <details style={style}><summary>{b.text||'Menu'}</summary><div>Dropdown content</div></details>;
    if(b.type==='tabs'){const labels=b.text.split('|').map(t=>t.trim()).filter(Boolean);return <div style={style}><div className="builder-element-tabs">{labels.map((t,i)=><button key={i} type="button">{t}</button>)}</div><p>Tab content preview</p></div>;}
    if(b.type==='input')return <input style={style} placeholder={b.text||'Enter text'}/>;
    if(b.type==='textarea')return <textarea style={style} placeholder={b.text||'Enter text'}/>;
    if(b.type==='checkbox')return <label style={style}><input type="checkbox"/> {b.text}</label>;
    if(b.type==='select')return <select style={style}>{b.text.split('|').map((t,i)=><option key={i}>{t.trim()}</option>)}</select>;
    if(b.type==='divider')return <hr style={style}/>;
    if(b.type==='spacer')return <div style={{height:40,...style}} aria-hidden="true"/>;
    if(b.type==='video')return /^https:\/\//.test(b.text)||b.text.startsWith('/uploads/')?<video style={{...style,maxWidth:'100%'}} src={b.text} controls preload="metadata"/>:<div style={style} className="builder-container-placeholder">Select video to upload or paste an MP4/WebM URL in Content</div>;
    if(b.type==='embed')return b.text.trim()?<iframe title="Custom code preview" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={b.text} style={{display:'block',width:'100%',minHeight:260,border:'1px solid #52617d',borderRadius:8,background:'#fff',...style}}/>:<div style={style} className="builder-container-placeholder">Add HTML, CSS or JavaScript in the Content inspector to preview it here</div>;
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
    <div className="builder-main">
      <header className="builder-toolbar">
        <div className="builder-project"><Link href="/">Projects</Link><span>/</span><strong>{site.name}</strong><span className="builder-mode">{pageTitle} · Designer</span></div>
        <nav className="builder-top-nav" aria-label="Designer navigation"><button onClick={()=>{setLeftTab('pages');setLeftCollapsed(false);}}><Files size={16}/> Pages</button><button onClick={()=>{setLeftTab('elements');setLeftCollapsed(false);}}><Plus size={16}/> Elements</button><button onClick={()=>{setLeftTab('layers');setLeftCollapsed(false);}}><Layers size={16}/> Layers</button><button onClick={()=>{setLeftTab('assets');setLeftCollapsed(false);}}><FolderOpen size={16}/> Assets</button><Link href={'/cms'+(siteId?'?siteId='+encodeURIComponent(siteId):'')}><Database size={16}/> CMS</Link><Link href={'/settings?siteId='+encodeURIComponent(siteId)}><Settings2 size={16}/> Site settings</Link></nav><span className="builder-autosave-status" role="status">{autoSaveStatus==='saving'?'Saving…':autoSaveStatus==='saved'?'All changes saved':autoSaveStatus==='error'?'Autosave failed':'Autosave on'}</span><div className="builder-toolbar-actions">
          <div className="builder-device" role="group" aria-label="Viewport"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')} title="Desktop"><Monitor size={17}/></button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')} title="Mobile"><Smartphone size={17}/></button></div>
          <div className="builder-history-actions" role="group" aria-label="Edit history"><button type="button" className="builder-action" title="Undo (⌘/Ctrl+Z)" aria-label="Undo" disabled={!canUndo||preview} onClick={undo}><Undo2 size={17}/></button><button type="button" className="builder-action" title="Redo (⌘/Ctrl+Shift+Z)" aria-label="Redo" disabled={!canRedo||preview} onClick={redo}><Redo2 size={17}/></button></div>
          <button className={preview?'builder-action active':'builder-action'} onClick={()=>setPreview(v=>!v)}><Eye size={17}/><span>{preview?'Exit preview':'Preview'}</span></button>
          <button className="primary" onClick={()=>void save()} disabled={!loaded||saving}><Save size={16}/>{saving?'Saving…':saved?'Saved':'Save'}</button>
        </div>
      </header>
      {error && <div className="builder-error" role="alert">{error}</div>}
      <div className={'builder-workspace'+(preview?' is-preview':'')+(leftCollapsed?' left-collapsed':'')+(rightCollapsed?' right-collapsed':'')}>
        {!preview&&<button className="builder-panel-toggle builder-panel-toggle-left" onClick={()=>setLeftCollapsed(v=>!v)} title={leftCollapsed?'Show left panel':'Hide left panel'} aria-label={leftCollapsed?'Show left panel':'Hide left panel'}><ChevronLeft size={16} style={{transform:leftCollapsed?'rotate(180deg)':undefined}}/></button>}
        {!preview&&<button className="builder-panel-toggle builder-panel-toggle-right" onClick={()=>setRightCollapsed(v=>!v)} title={rightCollapsed?'Show inspector':'Hide inspector'} aria-label={rightCollapsed?'Show inspector':'Hide inspector'}><ChevronLeft size={16} style={{transform:rightCollapsed?undefined:'rotate(180deg)'}}/></button>}
        {!preview && <aside className="builder-left">
          {leftTab==='pages'&&<div className={"builder-pages"+(pagesExpanded?" expanded":"")}><div className="builder-panel-heading"><strong><Files size={15}/> Pages</strong><button type="button" className="builder-pages-toggle" onClick={()=>setPagesExpanded(v=>!v)} aria-expanded={pagesExpanded} aria-label={pagesExpanded?"Collapse pages":"Expand pages"}><ChevronsUpDown size={14}/><span>{pages.length}</span></button></div><div className="builder-pages-details"><div className="builder-page-list">{pages.map(page=><button key={page.id} className={pageId===page.id?'active':''} onClick={()=>openPage(page)}>{page.title}<small>/{page.slug}</small></button>)}</div><button className="builder-page-settings-open" onClick={()=>setPageSettingsOpen(true)}><Settings2 size={15}/> Page settings</button><div className="builder-new-page"><input aria-label="New page name" placeholder="New page name" value={newPageName} onChange={event=>setNewPageName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void createPage();}}/><button disabled={!newPageName.trim()||creatingPage} onClick={()=>void createPage()} title="Create page"><FilePlus2 size={16}/></button></div>{pages.find(page=>page.id===pageId)?.slug!=='home'&&pageId&&<button className="builder-remove-page" onClick={()=>void deletePage()}><Trash2 size={14}/> Delete page</button>}</div></div>}
          {leftTab==='elements' ? <div className="builder-side-content"><div className="builder-element-search"><Search size={15}/><input value={elementSearch} onChange={event=>setElementSearch(event.target.value)} placeholder="Search elements, sections, components" aria-label="Search elements and sections"/></div><div className="builder-element-categories">{(['All','Elements','Sections','Components'] as const).map(category=><button key={category} className={elementCategory===category?'active':''} onClick={()=>setElementCategory(category)}>{category}</button>)}</div>{(elementCategory==='All'||elementCategory==='Elements')&&<><p className="builder-hint">Drag an element onto the canvas, or click to append it.</p><div className="builder-element-grid">{palette.filter(item=>[item.label,item.description,item.type].join(' ').toLowerCase().includes(elementSearch.toLowerCase())).map(item=><button key={item.type} draggable onDragStart={event=>startDrag(event,{type:"new",blockType:item.type})} onDragEnd={endDrag} title={"Drag "+item.label+" onto canvas"} onClick={()=>add(item.type)}><item.icon size={23}/><strong>{item.label}</strong><small>{item.description}</small></button>)}</div></>}{(elementCategory==='All'||elementCategory==='Components')&&<div className="builder-section-presets"><div className="builder-panel-heading"><strong>Components</strong><span>{components.length}</span></div><p className="builder-hint">Select elements in Layers to create or update a component. Click a component to insert it; use the pencil to rename or refresh icon to update from selection.</p><input aria-label="Component name" placeholder="Component name" value={componentName} onChange={e=>setComponentName(e.target.value)}/><button className="builder-section-preset" disabled={componentBusy||(!selected&&!multiSelected.length)} onClick={saveAsComponent}><span><strong>Create component</strong><small>Save selected elements</small></span></button>{components.filter(component=>component.name.toLowerCase().includes(elementSearch.toLowerCase())).map(component=><div className="builder-component-row" key={component.id}><button title="Insert a copy into this page" onClick={()=>insertComponent(component)}><strong>{component.name}</strong><small>{component.blocks.length} elements · Insert</small></button><div className="builder-component-actions"><button title="Rename component" aria-label={'Rename '+component.name} onClick={()=>renameComponent(component.id)}><Pencil size={14}/></button><button title="Sync linked instances on current page" aria-label={'Sync '+component.name+' on current page'} onClick={()=>syncComponentInstances(component)}><RefreshCw size={14}/></button><button title="Update component from current Layers selection" aria-label={'Update '+component.name+' from selection'} onClick={()=>replaceComponentFromSelection(component.id)}><RefreshCw size={14}/></button><button title="Delete component" aria-label={'Delete '+component.name} onClick={()=>{if(window.confirm('Delete component '+component.name+' from this browser library?'))deleteComponent(component.id);}}><Trash2 size={14}/></button></div></div>)}</div>}{(elementCategory==='All'||elementCategory==='Sections')&&<div className="builder-section-presets"><div className="builder-panel-heading"><strong>Sections</strong><span>Ready-made</span></div><p className="builder-hint">Insert a section, then customize its elements in Layers.</p>{sectionPresets.filter(preset=>[preset.name,preset.description,preset.category].join(' ').toLowerCase().includes(elementSearch.toLowerCase())).map(preset=><button key={preset.id} className="builder-section-preset" onClick={()=>insertSection(preset)}><span><strong>{preset.name}</strong><small>{preset.category} · {preset.description}</small></span></button>)}</div>}</div> : leftTab==='assets'?<div className="builder-side-content builder-assets-panel"><div className="builder-panel-heading"><strong>Assets</strong><span>{assets.length}</span></div><p className="builder-hint">Upload images from your computer, then select Use to insert them.</p><label className="builder-upload-zone">Upload images<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={assetBusy} onChange={e=>{void uploadAssets(e.target.files);e.target.value='';}}/></label><p className="builder-hint">PNG, JPEG or WebP, maximum 10 MB each. Local development storage.</p>{assetBusy&&<p>Uploading images…</p>}<div className="builder-asset-grid">{assets.map(asset=><div className="builder-asset-card" key={asset.id}><img src={asset.url} alt={asset.alt||''} loading="lazy"/><strong>{asset.name}</strong><div><button onClick={()=>useAsset(asset)}>Use</button><button onClick={()=>void deleteAsset(asset.id)} aria-label={'Remove '+asset.name}><Trash2 size={14}/></button></div></div>)}</div></div> : leftTab==='layers'?<div className="builder-side-content"><div className="builder-panel-heading"><strong>Page layers</strong><span>{site.blocks.length}</span></div><div className="builder-group-actions"><span>{multiSelected.length} selected</span><button disabled={multiSelected.length<2} onClick={groupSelection}>Group in Container</button><button disabled={!current||current.type!=='container'} onClick={ungroupSelection}>Ungroup</button><button disabled={!selectedIds().length} onClick={duplicateSelection} title="Duplicate selected (Cmd/Ctrl+D)">Duplicate</button><button disabled={!selectedIds().length} onClick={remove} title="Delete selected (Delete/Backspace)">Delete</button></div><p className="builder-hint">Cmd/Ctrl-click or Shift-click layers to select multiple elements.</p><div className="builder-layer-search"><Search size={15}/><input aria-label="Search layers" placeholder="Find layers…" value={layerSearch} onChange={e=>setLayerSearch(e.target.value)}/></div>{site.blocks.length===0?<p className="builder-hint">No elements. Add one from Elements.</p>:visibleLayerRows().map(({block:b,depth,hasChildren})=>{const Icon=layerIcons[b.type]||Layers;const index=site.blocks.findIndex(item=>item.id===b.id);return <div className={'builder-layer'+(multiSelected.includes(b.id)||selected===b.id?' active':'')} key={b.id} draggable onDragStart={event=>startDrag(event,{type:"move",id:b.id})} onDragEnd={endDrag} onDragOver={layerDragOver} onDrop={event=>dropOnLayer(event,b.id,'before')} style={{paddingLeft:8+depth*16}}><span className="builder-layer-drop-before" onDragOver={layerDragOver} onDrop={event=>dropOnLayer(event,b.id,'before')} title="Drop before"/><button type="button" className="builder-layer-expand" aria-label={hasChildren?(collapsedLayers.includes(b.id)?'Expand children':'Collapse children'):'No children'} disabled={!hasChildren} onClick={()=>toggleLayerCollapsed(b.id)}>{hasChildren?<ChevronDown size={13} style={{transform:collapsedLayers.includes(b.id)?'rotate(-90deg)':undefined}}/>:<span className="builder-layer-spacer"/>}</button><button title={b.classNames||b.type} onClick={event=>toggleSelection(b.id,event.metaKey||event.ctrlKey||event.shiftKey)}><GripVertical size={12} className="builder-layer-grip"/><Icon size={15}/><span className="builder-layer-label">{layerLabel(b)}</span></button><button type="button" className="builder-layer-after" title="Drop after this layer" onDragOver={layerDragOver} onDrop={event=>dropOnLayer(event,b.id,'after')}><ArrowDown size={12}/></button>{b.type==='container'&&<button type="button" className="builder-layer-nest" title="Drop inside container" onDragOver={layerDragOver} onDrop={event=>dropOnLayer(event,b.id,'inside')}><Plus size={12}/></button>}<div className="builder-layer-actions"><button aria-label="Move up" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button aria-label="Move down" disabled={index===site.blocks.length-1} onClick={()=>move(index,1)}><ArrowDown size={13}/></button></div></div>})}</div> : null}
        </aside>}
        <div className="builder-stage"><div className="builder-stage-heading"><span>{device==='desktop'?'Desktop canvas':'Mobile canvas'}</span><span>{device==='desktop'?'Responsive':'390px wide'}</span></div><div className={'builder-canvas'+(device==='mobile'?' mobile':'')}>
          <div className="builder-site-header" style={{backgroundColor:globalDesign.headerBackground||undefined,color:globalDesign.headerTextColor||undefined}}><strong>{globalDesign.logoText||site.name}</strong><nav className="builder-site-links">{pages.map(page=><button key={page.id} className={page.id===pageId?'active':''} onClick={()=>{if(!preview)openPage(page);}}>{page.title}</button>)}</nav></div>
          <div className={'builder-site-body'+(dragging?' is-dragging':'')} style={{backgroundColor:globalDesign.pageBackground||undefined,color:globalDesign.bodyTextColor||undefined,fontFamily:globalDesign.fontFamily||undefined}} onDragOver={event=>{if(event.dataTransfer.types.includes(dragMime))event.preventDefault();}}>
            {site.blocks.filter(b=>!b.parentId || !site.blocks.some(parent=>parent.id===b.parentId && parent.type==='container')).map((b,index)=><div key={b.id}>
              {!preview && dropZone(site.blocks.indexOf(b))}
              <div className={'builder-block'+(selected===b.id&&!preview?' selected':'')} style={{width:b.style?.width==='full'?'100%':b.style?.width==='half'?'50%':undefined,maxWidth:'100%'}} draggable={!preview}
                onDragStart={event=>{event.stopPropagation();startDrag(event,{type:'move',id:b.id});}} onDragEnd={endDrag}
                onDragOver={event=>{if(preview)return;event.stopPropagation();if(b.type==='container'&&event.dataTransfer.types.includes(dragMime)){event.preventDefault();setDropIndex(-1);return;}const rect=event.currentTarget.getBoundingClientRect();acceptDrag(event,site.blocks.indexOf(b)+(event.clientY>rect.top+rect.height/2?1:0));}}
                onDrop={event=>{if(preview)return;event.stopPropagation();if(b.type==='container'){dropIntoContainer(event,b.id);return;}const rect=event.currentTarget.getBoundingClientRect();dropBlock(event,site.blocks.indexOf(b)+(event.clientY>rect.top+rect.height/2?1:0));}}
                onClick={event=>{event.stopPropagation();if(!preview){setSelected(b.id);setRightTab('content');}}}>
                {b.type==='container'?<div className="builder-layout-container" style={{display:b.layout==='grid'?'grid':'flex',flexDirection:b.layout==='row'?'row':'column',gridTemplateColumns:b.layout==='grid'?`repeat(${b.columns||2}, minmax(0,1fr))`:undefined,gap:(b.gap??16)+'px',padding:(b.style?.padding??20)+'px',background:b.style?.background||'#f5f7fb',borderRadius:(b.style?.radius??12)+'px'}}>
                  {site.blocks.filter(child=>child.parentId===b.id).map(child=><div key={child.id} className={'builder-block builder-nested-block'+(selected===child.id?' selected':'')} draggable={!preview} onDragStart={event=>{event.stopPropagation();startDrag(event,{type:'move',id:child.id});}} onDragEnd={endDrag} onDragOver={event=>{if(!preview&&event.dataTransfer.types.includes(dragMime)){event.preventDefault();event.stopPropagation();}}} onDrop={event=>{if(!preview){event.stopPropagation();dropIntoContainer(event,b.id,site.blocks.indexOf(child));}}} onClick={event=>{event.stopPropagation();if(!preview){setSelected(child.id);setRightTab('content');}}}>{renderBlock(child)}</div>)}
                  {!site.blocks.some(child=>child.parentId===b.id)&&<div className="builder-container-placeholder">Drop an element here or assign it from Layers</div>}
                </div>:renderBlock(b)}
              </div>
            </div>)}
            {!preview && dropZone(site.blocks.length)}
            {site.blocks.length===0&&<div className="builder-empty-canvas">Drag elements here to start designing your page.</div>}
          </div>
          <div className="builder-site-footer" style={{backgroundColor:globalDesign.footerBackground||undefined,color:globalDesign.footerTextColor||undefined}}>{globalDesign.footerText||`© ${new Date().getFullYear()} ${site.name}`}</div>
        </div></div>
        {!preview && <aside className="builder-right"><div className="builder-tabs"><button className={rightTab==='content'?'active':''} onClick={()=>setRightTab('content')}><Type size={16}/> Content</button><button className={rightTab==='style'?'active':''} onClick={()=>setRightTab('style')}><Code2 size={16}/> Style</button></div>
          {current ? <div className="builder-side-content"><div className="builder-panel-heading"><strong>{current.type.charAt(0).toUpperCase()+current.type.slice(1)}</strong><button onClick={remove} className="builder-icon-danger" title="Delete element" aria-label="Delete element"><Trash2 size={17}/></button></div>
            {current.componentId&&<div className="builder-component-link"><strong>Linked component</strong><span>{components.find(c=>c.id===current.componentId)?.name||'Saved component'}</span><button onClick={detachComponentInstance}>Detach this instance</button><p className="builder-hint">Use Components → Sync to refresh instances on this page from the saved definition.</p></div>}<div className="builder-class-manager"><div className="builder-layout-heading">Reusable classes</div><div className="builder-class-add"><input aria-label="New class name" placeholder="e.g. card-title" value={classNameDraft} onChange={e=>setClassNameDraft(e.target.value)}/><button disabled={classSaving||!siteId} onClick={addClass}>Create</button></div>{Object.entries(classRules).map(([name,rule])=><div className="builder-class-rule" key={name}><div><strong>.{name}</strong><button disabled={classSaving} onClick={()=>renameClass(name)}>Rename</button><button disabled={classSaving} onClick={()=>removeClass(name)}>Delete</button><button disabled={classSaving} onClick={()=>{if(!current)return;const names=new Set((current.classNames||'').split(/\s+/).filter(Boolean));if(names.has(name))names.delete(name);else names.add(name);updateBlock({classNames:[...names].join(' ')});}}>{(current.classNames||'').split(/\s+/).includes(name)?'Remove':'Apply'}</button></div><label>Text color</label><input type="color" value={rule.color||'#131827'} onChange={e=>updateClass(name,{color:e.target.value})}/><label>Background</label><input type="color" value={rule.background||'#ffffff'} onChange={e=>updateClass(name,{background:e.target.value})}/><label>Font size (px)</label><input type="number" min="8" max="200" value={rule.fontSize??16} onChange={e=>updateClass(name,{fontSize:Number(e.target.value)})}/><label>Padding (px)</label><input type="number" min="0" max="300" value={rule.padding??0} onChange={e=>updateClass(name,{padding:Number(e.target.value)})}/><label>Radius (px)</label><input type="number" min="0" max="200" value={rule.radius??0} onChange={e=>updateClass(name,{radius:Number(e.target.value)})}/></div>)}</div><div className="builder-technical-panel"><div className="builder-layout-heading">Element attributes</div><label htmlFor="builder-html-id">HTML ID</label><input id="builder-html-id" value={current.htmlId||''} placeholder="hero-title" onChange={e=>updateBlock({htmlId:e.target.value})}/><label htmlFor="builder-css-class">CSS class names</label><input id="builder-css-class" value={current.classNames||''} placeholder="hero-heading text-large" onChange={e=>updateBlock({classNames:e.target.value})}/>{current.type==='image'&&<><label htmlFor="builder-alt">Image alt text</label><input id="builder-alt" value={current.alt||''} onChange={e=>updateBlock({alt:e.target.value})}/><button onClick={()=>setLeftTab('assets')}>Open asset library →</button></>}{current.type==='button'&&<><label htmlFor="builder-href">Button link</label><input id="builder-href" value={current.href||''} placeholder="/contact or https://example.com" onChange={e=>updateBlock({href:e.target.value})}/></>}<p className="builder-hint">IDs must start with a letter and be unique on each page. Classes use letters, numbers, underscores and hyphens.</p></div>
            {rightTab==='content' ? current.type==='cms-list' ? <><label htmlFor="builder-collection">CMS collection</label><select id="builder-collection" value={current.collectionId||''} onChange={e=>updateBlock({collectionId:e.target.value,displayField:''})}><option value="">Choose collection</option>{collections.map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><label htmlFor="builder-display-field">Card heading field</label><select id="builder-display-field" value={current.displayField||''} onChange={e=>updateBlock({displayField:e.target.value})}><option value="">First field</option>{collections.find(collection=>collection.id===current.collectionId)?.fields?.map(field=><option key={field.name} value={field.name}>{field.name}</option>)}</select><p className="builder-hint">Only published entries are displayed. Manage collection content in CMS.</p><Link href={'/cms?siteId='+encodeURIComponent(siteId)}>Manage CMS →</Link></> : current.type==='video'?<div className="builder-image-source"><strong>Video source</strong><label>Video URL (MP4/WebM)</label><input type="url" placeholder="https://example.com/video.mp4" value={current.text} onChange={e=>updateBlock({text:e.target.value})}/><label className="builder-upload-zone">Upload MP4 or WebM<input type="file" accept="video/mp4,video/webm" disabled={videoBusy} onChange={e=>{void uploadVideo(e.target.files);e.target.value='';}}/></label>{videoBusy&&<p>Uploading video…</p>}<p className="builder-hint">Local uploads support videos up to 50 MB. Large videos need production object storage.</p></div>:current.type==='embed'?<div className="builder-image-source"><strong>Custom HTML code</strong><textarea rows={12} spellCheck={false} value={current.text} onChange={e=>updateBlock({text:e.target.value})} placeholder="<div>Custom HTML</div>"/><p className="builder-hint">Live preview runs inside an isolated iframe. HTML, CSS and JavaScript are supported; parent-page access, form submissions and top-level navigation are blocked.</p></div>:current.type==='image'?<div className="builder-image-source"><strong>Image source</strong>{current.text&&<img className="builder-image-source-preview" src={current.text} alt={current.alt||''}/>}<button className="primary" onClick={()=>{void refreshAssets();setImagePickerOpen(true);}}>Choose from Assets</button><label className="builder-upload-zone">Upload new image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={assetBusy} onChange={e=>{void uploadAssets(e.target.files,true);e.target.value='';}}/></label>{assetBusy&&<p>Uploading…</p>}<p className="builder-hint">Upload or select an image. The element updates automatically.</p></div>:<><label htmlFor="builder-content">Text content</label><textarea id="builder-content" rows={current.type==='paragraph'?8:4} value={current.text} onChange={e=>updateBlock({text:e.target.value})}/><p className="builder-hint">Changes appear immediately on the canvas.</p></> :
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
{pageSettingsOpen&&<div className="builder-asset-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPageSettingsOpen(false);}}><div className="builder-asset-modal" role="dialog" aria-modal="true" aria-label="Page settings"><div className="builder-panel-heading"><strong>Page settings · {pageTitle}</strong><button onClick={()=>setPageSettingsOpen(false)}><X size={18}/></button></div><div className="builder-side-content"><div className="builder-panel-heading"><strong>Page SEO</strong></div><label htmlFor="seo-title">Search title</label><input id="seo-title" maxLength={70} value={site.seo?.title||''} onChange={e=>updateSeo({title:e.target.value})}/><label htmlFor="seo-description">Meta description</label><textarea id="seo-description" rows={5} maxLength={320} value={site.seo?.description||''} onChange={e=>updateSeo({description:e.target.value})}/><label htmlFor="seo-image">Social image URL</label><input id="seo-image" type="url" value={site.seo?.ogImage||''} onChange={e=>updateSeo({ogImage:e.target.value})}/><label className="builder-seo-toggle"><input type="checkbox" checked={site.seo?.noindex||false} onChange={e=>updateSeo({noindex:e.target.checked})}/> Noindex</label><p className="builder-hint">SEO values are saved with the page. Public metadata rendering is not implemented yet.</p></div><button className="primary" onClick={()=>{setPageSettingsOpen(false);void save();}}>Save settings</button></div></div>}
    </div>
  </div>;
}
export default function DesignerPage(){return <Suspense fallback={<div className="builder">Loading designer…</div>}><Workspace/></Suspense>}
