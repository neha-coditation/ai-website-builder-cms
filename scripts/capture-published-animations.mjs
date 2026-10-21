#!/usr/bin/env node
/**
 * Local-only visual reference capture. Run on a trusted development machine.
 * Executes the published website's scripts in a real Chromium browser, NOT in
 * the migration editor. Never inject captured scripts into the editor preview.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const input=process.argv[2]??'https://www.coditation.com/';
const output=resolve(process.cwd(),'migration-captures');
const parsed=new URL(input);
if(parsed.protocol!=='https:'||parsed.hostname!=='www.coditation.com'||parsed.username||parsed.password||parsed.port){
 throw new Error('Only https://www.coditation.com/ pages are supported.');
}
let chromium;
try{({chromium}=await import('playwright'));}catch{
 console.error('Install local capture dependencies: npm install --no-save playwright && npx playwright install chromium');
 process.exit(1);
}
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const manifest={source:parsed.href,capturedAt:new Date().toISOString(),captures:[],warnings:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'no-preference'});
 const page=await context.newPage();
 // Capture only: no form submissions or navigation to external domains.
 await page.route('**/*',route=>{
  const req=route.request();
  if(req.isNavigationRequest()&&req.frame()===page.mainFrame()){
   try{const u=new URL(req.url());if(u.hostname!=='www.coditation.com')return route.abort();}catch{return route.abort();}
  }
  if(!['GET','HEAD'].includes(req.method()))return route.abort();
  return route.continue();
 });
 page.on('pageerror',e=>manifest.warnings.push('Page error: '+e.message.slice(0,300)));
 await page.goto(parsed.href,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(2500);
 for(const [label,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(1000);
  for(const fraction of [0,0.5,1]){
   await page.evaluate(f=>window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*f),fraction);
   await page.waitForTimeout(1300);
   const name=label+'-'+Math.round(fraction*100)+'.png';
   await page.screenshot({path:resolve(output,name),animations:'allow'});
   const state=await page.evaluate(()=>({scrollY:scrollY,scrollHeight:document.documentElement.scrollHeight,viewportWidth:innerWidth,viewportHeight:innerHeight,canvases:document.querySelectorAll('canvas').length,animatedElements:document.querySelectorAll('[data-w-id]').length}));
   manifest.captures.push({name,viewport:label,scrollFraction:fraction,...state});
  }
 }
 await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2));
 console.log('Saved '+manifest.captures.length+' visual references to '+output);
}finally{await browser.close();}
