#!/usr/bin/env node
/**
 * Local comparison of published page versus script-free snapshot.
 * Executes published scripts only in a separate Playwright page, never in editor.
 * Usage: npm run audit:animations -- https://www.coditation.com/
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const source=new URL(process.argv[2]??'https://www.coditation.com/');
if(source.protocol!=='https:'||source.hostname!=='www.coditation.com'||source.username||source.password||source.port)throw new Error('Only public www.coditation.com URLs are supported');
let chromium,sharp;
try{({chromium}=await import('playwright'));({default:sharp}=await import('sharp'));}catch{console.error('Install local tools: npm install --no-save playwright sharp && npx playwright install chromium');process.exit(1);}
const dir=resolve('migration-comparison');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={baseline:source.href,candidate:'script-free HTML snapshot',comparisons:[],animationSignals:[],warnings:[]};
try{
 const context=await browser.newContext({deviceScaleFactor:1,reducedMotion:'no-preference'});
 const live=await context.newPage(),snapshot=await context.newPage();
 for(const page of [live,snapshot])await page.route('**/*',route=>{
  const req=route.request();if(!['GET','HEAD'].includes(req.method()))return route.abort();
  if(req.isNavigationRequest()&&req.frame()===page.mainFrame()&&req.url()!==source.href)return route.abort();
  return route.continue();
 });
 snapshot.on('pageerror',e=>report.warnings.push('Snapshot error: '+e.message.slice(0,200)));
 await live.goto(source.href,{waitUntil:'domcontentloaded',timeout:45000});await live.waitForTimeout(2500);
 const html=await live.content();
 await snapshot.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue());
 await snapshot.goto(source.href,{waitUntil:'domcontentloaded',timeout:45000});
 // Snapshot navigation loads source HTML but blocks all JavaScript requests; inline scripts are disabled by CSP.
 await snapshot.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'"><base href="'+source.href+'">'+html,{waitUntil:'domcontentloaded'});
 const captures=[['desktop',1440,900],['tablet',768,1024],['mobile',390,844]];
 for(const [label,width,height] of captures){
  await Promise.all([live,snapshot].map(p=>p.setViewportSize({width,height})));
  await Promise.all([live,snapshot].map(p=>p.evaluate(()=>window.scrollTo(0,0))));
  await live.waitForTimeout(800);
  for(const fraction of [0,0.5,1]){
   for(const p of [live,snapshot])await p.evaluate(f=>window.scrollTo(0,Math.max(0,document.documentElement.scrollHeight-innerHeight)*f),fraction);
   await live.waitForTimeout(900);
   const name=label+'-'+Math.round(fraction*100);
   const a=await live.screenshot(),b=await snapshot.screenshot();
   await writeFile(resolve(dir,name+'-published.png'),a);await writeFile(resolve(dir,name+'-snapshot.png'),b);
   const [left,right]=await Promise.all([a,b].map(x=>sharp(x).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
   if(left.info.width!==right.info.width||left.info.height!==right.info.height){report.comparisons.push({name,error:'Dimensions differ'});continue;}
   const n=left.info.width*left.info.height;let sum=0,changed=0;const diff=Buffer.alloc(n*4);
   for(let i=0;i<n;i++){const j=i*4,d=Math.abs(left.data[j]-right.data[j])+Math.abs(left.data[j+1]-right.data[j+1])+Math.abs(left.data[j+2]-right.data[j+2]);sum+=d;if(d>45)changed++;diff[j]=Math.min(255,d);diff[j+1]=0;diff[j+2]=0;diff[j+3]=255;}
   await sharp(diff,{raw:{width:left.info.width,height:left.info.height,channels:4}}).png().toFile(resolve(dir,name+'-diff.png'));
   report.comparisons.push({name,changedPixelPercent:Number((100*changed/n).toFixed(2)),meanAbsoluteDifference:Number((sum/(n*3)).toFixed(2)),diffImage:name+'-diff.png'});
  }
 }
 report.animationSignals=await live.evaluate(()=>({webflowMarkers:document.querySelectorAll('[data-w-id]').length,canvasCount:document.querySelectorAll('canvas').length,scriptCount:document.scripts.length}));
 await writeFile(resolve(dir,'report.json'),JSON.stringify(report,null,2));
 console.log('Audit saved to '+dir+'/report.json');
}finally{await browser.close();}
