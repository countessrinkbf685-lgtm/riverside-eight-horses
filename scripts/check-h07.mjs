import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/motion-review.html?asset=H07');await page.waitForFunction(()=>window.motionReview?.state.ready);
 const report=await page.evaluate(()=>{
  const a=motionReview;a.state.playing=false;
  const delta=(p,q)=>Math.hypot(...p.map((v,i)=>v-q[i]));
  const meshDelta=(p,q)=>Math.max(...p.map((v,i)=>delta(v,q[i])));
  const center=ps=>ps.reduce((acc,p)=>acc.map((v,i)=>v+p[i]/ps.length),[0,0,0]);
  function sample(clip,t){a.setClip(clip);a.evaluate(t);const f=a.headForward();return {surface:a.surface(),muzzle:center(a.muzzle()),yaw:Math.atan2(-f[2],f[0])*180/Math.PI,contacts:a.contacts()};}
  const neutral=sample('Neutral',0),look=sample('Look',2.5),returned=sample('Look',5),idle2=sample('Idle',2),idle6=sample('Idle',6);
  const result={bones:a.bones,lookYawDelta:look.yaw-neutral.yaw,lookMuzzleTravel:delta(look.muzzle,neutral.muzzle),returnNeutralError:meshDelta(returned.surface,neutral.surface),idleMuzzleTravel:delta(idle2.muzzle,idle6.muzzle),clips:{}};
  for(const clip of ['Idle','Look']){
   const start=sample(clip,0);let maxSoleDrift=0,minSoleY=Infinity,maxSoleY=-Infinity,maxMeshStep=0,last=start.surface;
   for(let i=0;i<=160;i++){
    const s=sample(clip,i/20);if(!s.surface.flat().every(Number.isFinite))throw Error('Nonfinite skin');
    maxMeshStep=Math.max(maxMeshStep,meshDelta(s.surface,last));last=s.surface;
    for(const [tag,c]of Object.entries(s.contacts)){
     if(c.points.length<3)throw Error('Missing hoof samples '+tag);
     c.points.forEach((p,j)=>{maxSoleDrift=Math.max(maxSoleDrift,delta(p,start.contacts[tag].points[j]));minSoleY=Math.min(minSoleY,p[1]);maxSoleY=Math.max(maxSoleY,p[1]);});
    }
   }
   result.clips[clip]={maxSoleDrift,minSoleY,maxSoleY,maxMeshStep,loopError:meshDelta(last,start.surface),neutralStartError:meshDelta(start.surface,neutral.surface)};
  }
  return result;
 });
 assert.equal(report.bones,36);assert.ok(Math.abs(report.lookYawDelta)>30&&Math.abs(report.lookYawDelta)<40);
 assert.ok(report.lookMuzzleTravel>.15);assert.ok(report.idleMuzzleTravel>.04);assert.ok(report.returnNeutralError<.001);
 for(const [clip,r]of Object.entries(report.clips)){assert.ok(r.maxSoleDrift<.001,clip+' stationary soles');assert.ok(r.minSoleY>-.001&&r.maxSoleY<.004,clip+' flat ground');assert.ok(r.loopError<.001&&r.neutralStartError<.001,clip+' neutral seam');assert.ok(r.maxMeshStep<.05,clip+' no pose jump');}
 for(const [clip,t]of [['Neutral',0],['Look',2.5],['Idle',3]]){
  await page.evaluate(([clip,t])=>{motionReview.setClip(clip);motionReview.evaluate(t);motionReview.sideView=true;},[clip,t]);await page.waitForTimeout(150);await page.screenshot({path:`artifacts/h07/${clip}-side.png`});
 }
 await page.evaluate(()=>{motionReview.frontView();motionReview.setClip('Look');motionReview.evaluate(2.5);});await page.waitForTimeout(150);await page.screenshot({path:'artifacts/h07/Look-front.png'});
 await page.goto(base+'/');await page.waitForFunction(()=>window.pasture?.state.ready);
 report.scene=await page.evaluate(()=>{pasture.state.motion=false;let maxError=0;const clips=new Set();for(let t=0;t<=24;t+=.2){pasture.evaluateActor('H07',t);const d=pasture.diagnostics;maxError=Math.max(maxError,d.h07Soles.maxGroundErrorMeters);clips.add(d.animationTimes.find(a=>a.id==='H07').clip);}return {maxGroundErrorMeters:maxError,clips:[...clips],animatedActors:pasture.diagnostics.animatedActors};});
 assert.equal(report.scene.animatedActors,9);assert.ok(report.scene.maxGroundErrorMeters<.01);assert.deepEqual(report.scene.clips,['Idle','Look']);
 await page.evaluate(()=>{pasture.chooseView('willow',true);pasture.evaluateActor('H07',10.5);});await page.waitForTimeout(200);await page.screenshot({path:'artifacts/h07/scene-willow.png'});
 assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;
 await writeFile('artifacts/h07/motion-check.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
