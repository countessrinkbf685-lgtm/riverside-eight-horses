import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {timePeriods} from '../src/pasture/time-of-day.js';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const out='artifacts/time-v14';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const errors=[],report={periods:{}};
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/?time=chen');await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>pasture.state.backend),'WebGPU');assert.deepEqual(await page.evaluate(()=>pasture.state.failed),[]);
 await page.locator('#motion').click();
 for(const p of timePeriods){
  await page.selectOption('#time-select',p.key);await page.waitForTimeout(220);
  const info=await page.evaluate(()=>pasture.environmentInspection);assert.equal(info.time.key,p.key);assert.equal(info.time.hour,p.hour);
  assert.equal(await page.locator('#time-clock').textContent(),String(p.hour).padStart(2,'0')+':00');report.periods[p.key]=info.lighting;
  if(['zi','mao','wu','you'].includes(p.key)){
   const shot=await page.screenshot({path:`${out}/${p.key}-home.png`});
   const stats=await sharp(shot).extract({left:300,top:380,width:1000,height:360}).stats();report.periods[p.key].mean=stats.channels.slice(0,3).reduce((sum,c)=>sum+c.mean,0)/3;
  }
 }
 assert.ok(report.periods.zi.mean<report.periods.wu.mean*.65);assert.ok(report.periods.zi.mean>12);
 await page.selectOption('#time-select','zi');await page.locator('[data-season=winter]').click();assert.equal(await page.evaluate(()=>pasture.environmentInspection.lighting.sunIntensity),0);
 await page.locator('[data-view=river]').click();await page.waitForTimeout(1100);await page.screenshot({path:`${out}/winter-night-river.png`});
 await page.locator('#motion').click();await page.selectOption('#time-select','wu');assert.equal(await page.evaluate(()=>pasture.timeOfDay.transitioning),true);
 await page.waitForFunction(()=>!pasture.timeOfDay.transitioning,null,{timeout:20000});
 await page.locator('#time-cycle').click();const start=await page.evaluate(()=>pasture.timeOfDay.hour);await page.waitForTimeout(300);assert.ok(await page.evaluate(s=>pasture.timeOfDay.hour>s,start));
 await page.locator('#motion').click();const frozen=await page.evaluate(()=>pasture.timeOfDay.hour);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>pasture.timeOfDay.hour),frozen);
 await page.locator('#motion').click();await page.locator('#compare').click();const comparison=await page.evaluate(()=>pasture.timeOfDay.hour);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>pasture.timeOfDay.hour),comparison);
 await page.selectOption('#time-select','you');assert.equal(await page.evaluate(()=>pasture.timeOfDay.auto),false);assert.equal(await page.evaluate(()=>pasture.timeOfDay.hour),18);await page.locator('#compare').click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{pasture.chooseView('willow',true);pasture.setTime('mao');});await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};return {time:rect('.time-panel'),season:rect('.season-panel')};});
 assert.ok(layout.time.top>=layout.season.bottom);assert.ok(layout.time.right<=390);await page.screenshot({path:`${out}/mobile-dawn.png`});
 await page.locator('#culture-toggle').click();const culture=await page.locator('#culture-panel').boundingBox();assert.ok(culture.y>=layout.time.bottom);await page.screenshot({path:`${out}/mobile-reading.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/?time=hai&season=summer');await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>pasture.state.motion),false);assert.equal(await page.evaluate(()=>pasture.timeOfDay.key),'hai');assert.equal(await page.evaluate(()=>pasture.timeOfDay.auto),false);
 await page.selectOption('#time-select','chen');assert.equal(await page.evaluate(()=>pasture.timeOfDay.transitioning),false);
 const fallback=await browser.newPage();await fallback.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));await fallback.goto(base);await fallback.waitForSelector('#fallback:not([hidden])');
 assert.ok(await fallback.locator('#time-select').isDisabled());assert.ok(await fallback.locator('#time-cycle').isDisabled());
 assert.deepEqual(errors,[]);report.passed=true;report.errors=errors;report.checks=['12 manual periods and clock ranges','actual day/night image luminance','winter moonlight and river','manual smooth transition','auto cycle','motion and comparison pause','mobile controls and reading panel','reduced motion','URL selection','no-GPU fallback'];
 await writeFile(`${out}/check-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
