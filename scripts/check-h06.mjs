import {chromium} from 'playwright-core';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
await mkdir('artifacts/h06',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const p=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/motion-review.html');await p.waitForFunction(()=>window.motionReview?.state.ready);
 await p.locator('#play').click();assert.equal(await p.evaluate(()=>motionReview.state.playing),false);
 const report=await p.evaluate(()=>{
  const api=motionReview,out={};
  for(const clip of ['Idle','Walk']){
   api.setClip(clip);const duration=api.report.clips[clip],origins={},previous={},first={},stats={maxContactHeight:0,maxSupportDrift:0,maxLoopPoseError:0,minSoleHeight:Infinity,maxSoleHeight:-Infinity,samples:0};
   for(let i=0;i<=Math.round(duration*120);i++){
    const t=i/60;api.evaluate(t);const contacts=api.contacts();
    for(const [tag,c]of Object.entries(contacts)){
     for(const point of c.points){stats.minSoleHeight=Math.min(stats.minSoleHeight,point[1]);stats.maxSoleHeight=Math.max(stats.maxSoleHeight,point[1]);}
     if(c.support){
      for(const point of c.points)stats.maxContactHeight=Math.max(stats.maxContactHeight,Math.abs(point[1]));
      if(!previous[tag])origins[tag]=c.points;
      c.points.forEach((v,j)=>{stats.maxSupportDrift=Math.max(stats.maxSupportDrift,Math.hypot(v[0]-origins[tag][j][0],v[2]-origins[tag][j][2]));});
      previous[tag]=true;
     }else previous[tag]=false;
     if(i===0)first[tag]=c.points;
     if(i===Math.round(duration*60))c.points.forEach((v,j)=>{const root=clip==='Walk'?t*api.report.walkSpeedMetersPerSecond:0;stats.maxLoopPoseError=Math.max(stats.maxLoopPoseError,Math.hypot(v[0]-root-first[tag][j][0],v[1]-first[tag][j][1],v[2]-first[tag][j][2]));});
    }stats.samples++;
   }out[clip]=stats;
  }
  api.setClip('Idle');api.evaluate(0);api.sideView=true;return {bones:api.bones,clips:out,method:'post-export Three SkinnedMesh.getVertexPosition, 60 Hz, two cycles, sole vertices below 3.5 mm in bind pose; flat plane only'};
 });
 assert.equal(report.bones,46);
 for(const [name,c]of Object.entries(report.clips)){assert.ok(c.maxContactHeight<=.01,`${name} height ${c.maxContactHeight}`);assert.ok(c.maxSupportDrift<=.02,`${name} drift ${c.maxSupportDrift}`);assert.ok(c.minSoleHeight>=-.001,`${name} penetration`);assert.ok(c.maxLoopPoseError<.001,`${name} loop`);}
 assert.ok(report.clips.Walk.maxSoleHeight>.05,'walk must lift the actual mesh');
 await p.waitForTimeout(200);await p.screenshot({path:'artifacts/h06/idle-webgpu.png'});
 await p.locator('#clip').selectOption('Walk');await p.evaluate(()=>motionReview.evaluate(1.9));await p.waitForTimeout(200);await p.screenshot({path:'artifacts/h06/walk-webgpu.png'});
 await p.locator('#bones').click();assert.equal(await p.locator('#bones').getAttribute('aria-pressed'),'true');await p.screenshot({path:'artifacts/h06/skeleton-webgpu.png'});
 assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;report.terrainLocomotionAccepted=false;report.deformationArtAccepted=false;
 await writeFile('artifacts/h06/browser-contact-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
