#!/usr/bin/env node
/**
 * Compare two locally captured sets of screenshots.
 * Usage: npm run compare:animations -- migration-captures reference-captures
 * Requires optional local dependency: sharp.
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const baseline=resolve(process.argv[2]??'migration-captures');
const candidate=resolve(process.argv[3]??'migration-captures-candidate');
const destination=resolve(process.argv[4]??'migration-comparison');
let sharp;
try{({default:sharp}=await import('sharp'));}catch{console.error('Install optional dependency: npm install --no-save sharp');process.exit(1);}
const [baseManifest,candidateManifest]=await Promise.all([baseline,candidate].map(async dir=>JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'))));
await mkdir(destination,{recursive:true});
const report={baseline:baseManifest.source,candidate:candidateManifest.source,comparisons:[],notes:['Pixel difference measures screenshots, not animation equivalence.','Viewport dimensions and capture timing must match for meaningful comparison.']};
for(const original of baseManifest.captures){
 const counterpart=candidateManifest.captures.find(x=>x.name===original.name);
 if(!counterpart){report.comparisons.push({name:original.name,error:'Missing candidate screenshot'});continue;}
 const [left,right]=await Promise.all([baseline,candidate].map(async(dir)=>sharp(join(dir,original.name)).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
 if(left.info.width!==right.info.width||left.info.height!==right.info.height){report.comparisons.push({name:original.name,error:'Image dimensions differ'});continue;}
 const length=left.info.width*left.info.height;const diff=Buffer.alloc(length*4);let sum=0,changed=0;
 for(let i=0;i<length;i++){const k=i*4;const d=Math.abs(left.data[k]-right.data[k])+Math.abs(left.data[k+1]-right.data[k+1])+Math.abs(left.data[k+2]-right.data[k+2]);sum+=d;if(d>45)changed++;diff[k]=Math.min(255,d);diff[k+1]=0;diff[k+2]=0;diff[k+3]=255;}
 const name=original.name.replace(/\.png$/,'-diff.png');
 await sharp(diff,{raw:{width:left.info.width,height:left.info.height,channels:4}}).png().toFile(join(destination,name));
 report.comparisons.push({name:original.name,diffImage:name,meanAbsoluteDifference:Number((sum/(length*3)).toFixed(2)),changedPixelPercent:Number((changed/length*100).toFixed(2))});
}
await writeFile(join(destination,'report.json'),JSON.stringify(report,null,2));
console.log('Compared '+report.comparisons.length+' captures. Results: '+destination);
