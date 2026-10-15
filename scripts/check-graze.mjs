import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
try{const p=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/motion-review.html');await p.waitForFunction(()=>window.motionReview?.state.ready);const result=await p.evaluate(()=>{
 const api=motionReview;api.state.playing=false;const clips={};
 for(const name of ['GrazeDown','GrazeLoop','GrazeUp']){api.setClip(name);let sole=0,drift=0,minMuzzle=Infinity;let first;
 for(let i=0;i<=Math.ceil(api.report.clips[name]*60);i++){api.evaluate(Math.min(i/60,api.report.clips[name]));const c=api.contacts();first??=c;for(const [tag,v]of Object.entries(c))for(let j=0;j<v.points.length;j++){const point=v.points[j];sole=Math.max(sole,Math.abs(point[1]));drift=Math.max(drift,Math.hypot(point[0]-first[tag].points[j][0],point[2]-first[tag].points[j][2]));}minMuzzle=Math.min(minMuzzle,...api.muzzle().map(v=>v[1]));}
 clips[name]={maxSoleHeight:sole,maxSupportDrift:drift,minMuzzle};}
 const endpoints=[['Idle',8,'GrazeDown',0],['GrazeDown',1.7,'GrazeLoop',0],['GrazeLoop',3.4,'GrazeUp',0],['GrazeUp',.8,'Idle',0]],seams=[];
 for(const [a,t,b,u]of endpoints){api.setClip(a);api.evaluate(t);const av=api.surface();api.setClip(b);api.evaluate(u);const bv=api.surface();seams.push({from:a,to:b,maxVertexDelta:Math.max(...av.map((p,i)=>Math.hypot(...p.map((v,k)=>v-bv[i][k]))))});}
 return {clips,seams};});
 for(const [name,c]of Object.entries(result.clips)){assert.ok(c.maxSoleHeight<.01,name+' sole');assert.ok(c.maxSupportDrift<.002,name+' drift');assert.ok(c.minMuzzle>.035,name+' muzzle');}for(const s of result.seams)assert.ok(s.maxVertexDelta<.001,JSON.stringify(s));
 await p.evaluate(()=>{motionReview.setClip('GrazeLoop');motionReview.evaluate(1);motionReview.sideView=true;});await p.waitForTimeout(300);await p.screenshot({path:'artifacts/h06/graze-side.png'});
 await p.evaluate(()=>{motionReview.sideView=false;});await p.waitForTimeout(300);await p.screenshot({path:'artifacts/h06/graze-three-quarter.png'});
 await p.goto(base+'/');await p.waitForFunction(()=>window.pasture?.state.ready);result.scene=await p.evaluate(()=>{pasture.state.motion=false;let sole=0,muzzle=Infinity;const clips=new Set();for(let i=0;i<=1040;i++){pasture.evaluateH06(i/60);const d=pasture.diagnostics;sole=Math.max(sole,d.h06Soles.maxGroundErrorMeters);muzzle=Math.min(muzzle,d.h06Muzzle.minClearanceMeters);clips.add(d.animationTimes[0].clip);}pasture.evaluateH06(11);return {maxSoleError:sole,minMuzzleClearance:muzzle,clips:[...clips]};});
 assert.ok(result.scene.maxSoleError<.01);assert.ok(result.scene.minMuzzleClearance>.025);await p.waitForTimeout(300);await p.screenshot({path:'artifacts/environment-v5/scene-graze.png'});assert.deepEqual(errors,[]);result.errors=errors;result.passed=true;await writeFile('artifacts/h06/graze-contact-report.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
