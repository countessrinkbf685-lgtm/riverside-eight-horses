import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
try{
 const p=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/motion-review.html');await p.waitForFunction(()=>window.motionReview?.state.ready);
 const report=await p.evaluate(()=>{
  const api=motionReview;api.state.playing=false;
  const delta=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
  const maxDelta=(a,b)=>Math.max(...a.map((v,i)=>delta(v,b[i])));
  const center=ps=>ps.reduce((a,p)=>a.map((v,i)=>v+p[i]/ps.length),[0,0,0]);
  function sample(clip,t){api.setClip(clip);api.evaluate(t);const f=api.headForward();return {surface:api.surface(),yaw:Math.atan2(-f[2],f[0])*180/Math.PI,muzzle:center(api.muzzle()),ear:api.bonePoint('EarL02'),tail:api.bonePoint('Tail06')};}
  const neutral=sample('Neutral',0),idle0=sample('Idle',0),idle2=sample('Idle',2),idle6=sample('Idle',6),idle8=sample('Idle',8),source=sample('HeadReturn',0),returned=sample('HeadReturn',1.2),up=sample('GrazeUp',.8),fullEnd=sample('Graze',7.5);
  const walkYaws=[],idleYaws=[];for(let i=0;i<=48;i++){walkYaws.push(sample('Walk',i/20).yaw);idleYaws.push(sample('Idle',i/6).yaw);}
  const endLoop=sample('Graze',8);
  return {sourceHeadYaw:source.yaw,neutralHeadYaw:neutral.yaw,walkMaxAbsYaw:Math.max(...walkYaws.map(Math.abs)),idleYawRange:Math.max(...idleYaws)-Math.min(...idleYaws),idleMuzzleTravel:delta(idle2.muzzle,idle6.muzzle),idleEarTravel:delta(idle2.ear,idle6.ear),idleTailTravel:delta(idle2.tail,idle6.tail),idleMeshDisplacement:maxDelta(idle2.surface,idle6.surface),idleLoopError:maxDelta(idle0.surface,idle8.surface),idleNeutralError:maxDelta(idle0.surface,neutral.surface),returnNeutralError:maxDelta(returned.surface,neutral.surface),grazeUpNeutralError:maxDelta(up.surface,neutral.surface),grazeFullNeutralError:maxDelta(fullEnd.surface,neutral.surface),grazeLoopError:maxDelta(endLoop.surface,neutral.surface)};
 });
 assert.ok(Math.abs(report.sourceHeadYaw)>40);assert.ok(Math.abs(report.neutralHeadYaw)<.1);
 assert.ok(report.walkMaxAbsYaw<2);assert.ok(report.idleYawRange>15);assert.ok(report.idleMuzzleTravel>.08);assert.ok(report.idleTailTravel>.1);assert.ok(report.idleMeshDisplacement>.1);
 for(const [key,value]of Object.entries(report))if(key.endsWith('Error'))assert.ok(value<.001,key+': '+value);
 await p.evaluate(()=>{motionReview.setClip('Idle');motionReview.state.playing=true;});const before=await p.evaluate(()=>motionReview.surface());await p.waitForTimeout(900);const after=await p.evaluate(()=>motionReview.surface());report.liveMeshDisplacement=Math.max(...before.map((a,i)=>Math.hypot(...a.map((v,k)=>v-after[i][k]))));assert.ok(report.liveMeshDisplacement>.015,'live Idle must deform mesh');
 await p.evaluate(()=>{motionReview.state.playing=false;motionReview.setClip('Neutral');motionReview.frontView();});await p.waitForTimeout(200);await p.screenshot({path:'artifacts/h06/neutral-front.png'});
 await p.goto(base+'/');await p.waitForFunction(()=>window.pasture?.state.ready);report.sceneIdle=await p.evaluate(()=>{pasture.state.motion=false;pasture.evaluateH06(2);const a=pasture.diagnostics.h06Muzzle.center;pasture.evaluateH06(6);const b=pasture.diagnostics.h06Muzzle.center;return {muzzleTravel:Math.hypot(...a.map((v,i)=>v-b[i])),clip:pasture.diagnostics.animationTimes[0].clip};});assert.ok(report.sceneIdle.muzzleTravel>.08);
 assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;await writeFile('artifacts/h06/neutral-motion-report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
