import {chromium} from 'playwright-core';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
await mkdir('artifacts/continuation-v10',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const report={painting:{},sleeves:{},walks:{},errors:[]};
try{
 const page=await browser.newPage({viewport:{width:1500,height:950}});page.on('pageerror',e=>report.errors.push(e.message));
 for(const id of ['H01','H02']){
  await page.goto(base+'/motion-review.html?asset='+id);await page.waitForFunction(()=>window.motionReview?.state.ready);
  report.painting[id]=await page.evaluate(()=>{
   const a=motionReview;a.state.playing=false;const out={clips:{},seams:[]};
   const delta=(a,b)=>Math.max(...a.map((p,i)=>Math.hypot(...p.map((v,k)=>v-b[i][k]))));
   const sample=(name,t)=>{a.setClip(name);a.evaluate(t);return a.surface();};
   const neutral=sample('Neutral',0);let painting;
   for(const name of ['Painting','PaintingIdle','PaintingDown','PaintingUp']){
    a.setClip(name);let min=Infinity,step=0,drift=0,first=a.contacts(),last=a.surface();
    const duration=a.report.clips[name];
    for(let f=0;f<=Math.ceil(duration*30);f++){
     a.evaluate(Math.min(f/30,duration));const q=a.surface();
     if(!q.every(p=>p.every(Number.isFinite)))throw Error('Nonfinite painting mesh');
     min=Math.min(min,...q.map(p=>p[1]));step=Math.max(step,delta(q,last));last=q;
     for(const [tag,c]of Object.entries(a.contacts()))if(c.support)c.points.forEach((p,i)=>{drift=Math.max(drift,Math.hypot(...p.map((v,k)=>v-first[tag].points[i][k])));});
    }
    out.clips[name]={min,step,drift};if(name==='Painting')painting=last;
   }
   out.poseTravel=delta(painting,neutral);
   for(const [from,to]of [['Neutral','PaintingDown'],['PaintingDown','PaintingIdle'],['PaintingIdle','PaintingUp'],['PaintingUp','Neutral']])out.seams.push({from,to,error:delta(sample(from,a.report.clips[from]),sample(to,0))});
   return out;
  });
  for(const [name,c]of Object.entries(report.painting[id].clips)){assert.ok(c.min>-.002,id+' '+name+' penetration '+c.min);assert.ok(c.drift<.002,id+' hind support');assert.ok(c.step<.12,id+' pose jump '+c.step);}
  for(const seam of report.painting[id].seams)assert.ok(seam.error<.001,JSON.stringify(seam));
  assert.ok(report.painting[id].poseTravel>.8,'visible bow');
  for(const view of ['side','front']){await page.evaluate(view=>{motionReview.setClip('Painting');motionReview.evaluate(0);if(view==='front')motionReview.frontView();else motionReview.sideView=true;},view);await page.waitForTimeout(100);await page.screenshot({path:`artifacts/continuation-v10/${id}-painting-${view}.png`});}
 }
 await page.goto(base+'/motion-review.html?asset=P01');await page.waitForFunction(()=>window.motionReview?.state.ready);
 report.sleeves=await page.evaluate(()=>{const a=motionReview;a.state.playing=false;return {bones:a.bones,controls:['SleeveL','SleeveR','CuffL','CuffR'].map(name=>({name,position:a.bonePoint(name)}))};});assert.equal(report.sleeves.bones,26);
 for(const [clip,t]of [['APose',0],['Neutral',0],['Idle',3],['Look',4]]){await page.evaluate(([clip,t])=>{motionReview.setClip(clip);motionReview.evaluate(t);motionReview.sleeveView();},[clip,t]);await page.waitForTimeout(100);await page.screenshot({path:`artifacts/continuation-v10/sleeves-${clip}.png`});}
 await page.goto(base+'/');await page.waitForFunction(()=>window.pasture?.state.ready);
 report.scenePainting=await page.evaluate(()=>{
  pasture.state.motion=false;const out={};
  for(const id of ['H01','H02']){let min=Infinity;for(let t=0;t<=9;t+=.2){pasture.evaluateActor(id,t);for(const p of pasture.actorSurface(id))min=Math.min(min,p[1]-pasture.groundHeight(p[0],p[2]));}out[id]={minimumSurfaceClearance:min,contact:pasture.diagnostics.actorSoles[id]};}return out;
 });
 for(const [id,p]of Object.entries(report.scenePainting)){assert.ok(p.minimumSurfaceClearance>-.005,id+' scene penetration '+p.minimumSurfaceClearance);assert.ok(p.contact.maxGroundErrorMeters<.01,id+' scene support');}
 await page.evaluate(()=>{pasture.chooseView('left',true);});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/continuation-v10/painting-pair-scene.png'});
 // Begin during actual grazing to verify the entry blend, not just an idle start.
 report.walks=await page.evaluate(()=>{
  pasture.evaluateActor('H04',12);pasture.evaluateH06(11);const entry=Object.fromEntries(['H04','H06'].map(id=>[id,pasture.actorSurface(id)]));pasture.startWalk();
  const stats={},origins={},previous={};
  for(let f=0;f<=23*30;f++){
   const t=f/30;pasture.evaluateWalk(t);
   for(const [id,r]of Object.entries(pasture.walks)){
    const s=stats[id]??={min:Infinity,max:0,supportError:0,supportDrift:0,maxReachError:0,bankClearance:Infinity,start:r.root,end:null,rootStep:0,soleStep:0};
    s.maxReachError=Math.max(s.maxReachError,r.maxReachError);s.bankClearance=Math.min(s.bankClearance,r.bankClearance);s.end=r.root;s.phase=r.phase;
    if(previous[id])s.rootStep=Math.max(s.rootStep,Math.hypot(...r.root.map((v,k)=>v-previous[id].root[k])));
    for(const [tag,c]of Object.entries(r.feet)){
     s.min=Math.min(s.min,...c.clearances);s.max=Math.max(s.max,...c.clearances);
     const key=id+tag;
     if(previous[id])c.points.forEach((p,j)=>{s.soleStep=Math.max(s.soleStep,Math.hypot(...p.map((v,k)=>v-previous[id].feet[tag].points[j][k])));});
     if(c.support){s.supportError=Math.max(s.supportError,...c.clearances.map(Math.abs));origins[key]??=c.points;c.points.forEach((p,j)=>{s.supportDrift=Math.max(s.supportDrift,Math.hypot(...p.map((v,k)=>v-origins[key][j][k])));});}
     else delete origins[key];
    }
    if(f===0){const p=pasture.actorSurface(id);s.entryJump=Math.max(...p.map((v,i)=>Math.hypot(...v.map((v,k)=>v-entry[id][i][k]))));}
    previous[id]=r;
   }
  }
  return stats;
 });
 await writeFile('artifacts/continuation-v10/walk-check.json',JSON.stringify(report.walks,null,2));
 for(const [id,w]of Object.entries(report.walks)){
  assert.ok(w.min>-.001,id+' foot penetrates');assert.ok(w.supportError<.012,id+' terrain support '+w.supportError);assert.ok(w.supportDrift<.002,id+' sliding '+w.supportDrift);
  assert.ok(w.max>.06,id+' foot lift');assert.ok(w.maxReachError<.002,id+' unreachable IK');assert.ok(w.entryJump<.015,id+' entry pop '+w.entryJump);
  assert.ok(w.rootStep<.008&&w.soleStep<.04,id+' locomotion discontinuity');assert.ok(w.bankClearance>2,id+' bank safety');assert.equal(w.phase,'Arrived');assert.ok(Math.abs(w.end[0]-w.start[0])>1,id+' real root travel');
 }
 for(const [view,t]of [['left',9],['willow',11],['home',23]]){await page.evaluate(([view,t])=>{pasture.evaluateWalk(t);pasture.chooseView(view,true);},[view,t]);await page.waitForTimeout(150);await page.screenshot({path:`artifacts/continuation-v10/walk-${view}.png`});}
 await page.evaluate(()=>{pasture.resetWalk();});await page.locator('#walk').click();await page.locator('#motion').click();
 const before=await page.evaluate(()=>pasture.walks);await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>pasture.walks),before,'walking pause');
 await page.locator('#reset-walk').click();assert.equal(await page.locator('#walk').isEnabled(),true);
 assert.deepEqual(report.errors,[]);report.passed=true;await writeFile('artifacts/continuation-v10/check-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
