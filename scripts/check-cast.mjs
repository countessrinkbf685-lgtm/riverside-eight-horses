import {chromium} from 'playwright-core';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const ids=process.argv.length>2?process.argv.slice(2):['H01','H02','H03','H04','H05','H08','P01'];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
await mkdir('artifacts/cast-motion',{recursive:true});const results={},errors=[];
try{
 const page=await browser.newPage({viewport:{width:1500,height:950}});page.on('pageerror',e=>errors.push(e.message));
 for(const id of ids){
  await page.goto(base+'/motion-review.html?asset='+id);await page.waitForFunction(()=>window.motionReview?.state.ready);
  const r=await page.evaluate(()=>{
   const a=motionReview;a.state.playing=false;
   const delta=(p,q)=>Math.hypot(...p.map((v,i)=>v-q[i]));
   const meshDelta=(p,q)=>Math.max(...p.map((v,i)=>delta(v,q[i])));
   const sample=(name,t)=>{a.setClip(name);a.evaluate(t);return a.surface();};
   const neutral=sample('Neutral',0),idleA=sample('Idle',a.report.clips.Idle*.25),idleB=sample('Idle',a.report.clips.Idle*.75);
   const result={bones:a.bones,idleMeshTravel:meshDelta(idleA,idleB),clips:{},seams:[]};
   for(const [clip,duration]of Object.entries(a.report.clips)){
    const start=sample(clip,0),first=a.contacts(),supportOrigins={};let drift=0,sole=0,muzzle=Infinity,step=0,last=start;
    for(let i=0;i<=Math.ceil(duration*15);i++){
     a.evaluate(Math.min(i/15,duration));const mesh=a.surface();
     if(!mesh.every(p=>p.every(Number.isFinite)))throw Error('nonfinite mesh '+clip);
     step=Math.max(step,meshDelta(mesh,last));last=mesh;
     for(const [tag,c]of Object.entries(a.contacts())){
      if(c.points.length<3)throw Error('missing foot '+tag);
      if(!c.support){delete supportOrigins[tag];continue;}
      supportOrigins[tag]??=c.points;
      c.points.forEach((p,j)=>{sole=Math.max(sole,Math.abs(p[1]));drift=Math.max(drift,delta(p,clip==='Walk'?supportOrigins[tag][j]:first[tag].points[j]));});
     }
     for(const p of a.muzzle())muzzle=Math.min(muzzle,p[1]);
    }
    const final=clip==='Walk'?last.map(p=>[p[0]-duration*a.report.walkSpeedMetersPerSecond,p[1],p[2]]):last;
    result.clips[clip]={sole,drift,muzzle:Number.isFinite(muzzle)?muzzle:null,step,loopError:meshDelta(final,start),neutralStart:meshDelta(start,neutral)};
   }
   if(a.report.clips.GrazeDown){
    for(const [from,to]of [['Idle','GrazeDown'],['GrazeDown','GrazeLoop'],['GrazeLoop','GrazeUp'],['GrazeUp','Idle']]){
     const p=sample(from,a.report.clips[from]),q=sample(to,0);result.seams.push({from,to,error:meshDelta(p,q)});
    }
   }
   return result;
  });results[id]=r;
  await writeFile(`artifacts/${id.toLowerCase()}/motion-check.json`,JSON.stringify(r,null,2));
  for(const [clip,t]of [['Neutral',0],['Idle',r.clips.Idle?2:0],...(r.clips.GrazeLoop?[['GrazeLoop',1]]:r.clips.Look?[['Look',2.5]]:[]),...(r.clips.Walk?[['Walk',.9]]:[])]){
   await page.evaluate(([clip,t])=>{motionReview.setClip(clip);motionReview.evaluate(t);motionReview.sideView=true;},[clip,t]);await page.waitForTimeout(100);await page.screenshot({path:`artifacts/${id.toLowerCase()}/${clip}-side.png`});
   await page.evaluate(()=>motionReview.frontView());await page.waitForTimeout(100);await page.screenshot({path:`artifacts/${id.toLowerCase()}/${clip}-front.png`});
  }
  assert.ok(r.idleMeshTravel>.02,id+' visible idle');
  for(const [name,c]of Object.entries(r.clips)){
   assert.ok(c.sole<.01,id+' '+name+' sole');assert.ok(c.drift<.002,id+' '+name+' stationary feet');
   if(['Idle','Look','GrazeLoop','Walk'].includes(name))assert.ok(c.loopError<.001,id+' '+name+' loop');
   if(name.startsWith('Graze'))assert.ok(c.muzzle>.005&&c.muzzle<.08,id+' '+name+' muzzle '+c.muzzle);
  }
  for(const seam of r.seams)assert.ok(seam.error<.001,id+' seam '+JSON.stringify(seam));
  console.log(id,'passed',r.idleMeshTravel);
 }
 await page.goto(base+'/');await page.waitForFunction(()=>window.pasture?.state.ready);
 const scene=await page.evaluate(()=>{
  pasture.state.motion=false;const soles={},muzzles={};
  for(let t=0;t<=35;t+=.25){
   for(const id of ['H01','H02','H03','H04','H05','H08','P01'])pasture.evaluateActor(id,t);
   const d=pasture.diagnostics;
   for(const [id,v]of Object.entries(d.actorSoles))soles[id]=Math.max(soles[id]||0,v.maxGroundErrorMeters);
   for(const id of ['H04','H05','H08'])muzzles[id]=Math.min(muzzles[id]??Infinity,d.actorMuzzles[id].minClearanceMeters);
  }
  return {animatedActors:pasture.diagnostics.animatedActors,soles,muzzles,failed:pasture.state.failed};
 });
 await writeFile('artifacts/cast-motion/scene-check.json',JSON.stringify(scene,null,2));
 assert.equal(scene.animatedActors,9);assert.deepEqual(scene.failed,[]);
 for(const [id,err]of Object.entries(scene.soles))assert.ok(err<.01,id+' scene contact '+err);
 for(const [id,height]of Object.entries(scene.muzzles))assert.ok(height>.005,id+' scene muzzle '+height);
 for(const view of ['home','left','right']){await page.evaluate(view=>pasture.chooseView(view,true),view);await page.waitForTimeout(150);await page.screenshot({path:`artifacts/cast-motion/scene-${view}.png`});}
 assert.deepEqual(errors,[]);await writeFile('artifacts/cast-motion/check-report.json',JSON.stringify({passed:true,actors:results,scene,errors},null,2));
}finally{await browser.close();}
