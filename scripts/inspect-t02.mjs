import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts/t02',{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const p=await b.newPage({viewport:{width:1300,height:1000}});await p.goto('http://127.0.0.1:5173/asset-review.html');await p.waitForFunction(()=>window.review?.ready);
const report=await p.evaluate(async()=>await review.load(review.files.indexOf('83c204b4c4421c915f097c40b3dd0934.glb')));
for(const [label,x,y,z] of [['front',0,2,7],['side',7,2,0],['back',0,2,-7]]){await p.evaluate(async([x,y,z])=>await review.view(x,y,z),[x,y,z]);await p.waitForTimeout(300);await p.screenshot({path:`artifacts/t02/${label}.png`});}
await writeFile('artifacts/t02/inspection.json',JSON.stringify(report,null,2));console.log(report);await b.close();
