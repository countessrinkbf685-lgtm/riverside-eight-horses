import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const errors=[],report={url:base,seasons:{}};await mkdir('artifacts/environment-v11',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 await page.goto(base);await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:90000});await page.waitForTimeout(1200);
 const inspect=await page.evaluate(()=>pasture.environmentInspection);assert.equal(inspect.water.transmission,1);assert.equal(inspect.water.ior,1.333);assert.equal(inspect.mountains,3);
 await page.locator('#motion').click();assert.equal(await page.evaluate(()=>pasture.state.motion),false);
 for(const season of ['autumn','spring','summer','winter']){
  await page.locator(`[data-season=${season}]`).click();await page.waitForTimeout(180);assert.equal(await page.locator(`[data-season=${season}]`).getAttribute('aria-pressed'),'true');
  report.seasons[season]=await page.evaluate(()=>{const leaf=pasture.willow.children.find(o=>o.material.userData.deciduous);return {...pasture.environmentInspection,remainingLeafVertices:Array.from(leaf.geometry.attributes.aLeafSeason.array).filter(n=>n<pasture.seasons.density).length}});
  await page.screenshot({path:`artifacts/environment-v11/${season}-home.png`});
 }
 assert.equal(report.seasons.winter.remainingLeafVertices,0);assert.ok(report.seasons.summer.remainingLeafVertices>report.seasons.spring.remainingLeafVertices);assert.ok(report.seasons.winter.season.frost>.8);
 await page.locator('[data-season=summer]').click();await page.locator('[data-view=river]').click();await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/environment-v11/summer-river.png'});
 await page.locator('#motion').click();await page.waitForTimeout(200);const waveA=await page.screenshot();await page.waitForTimeout(900);const waveB=await page.screenshot();
 const crop={left:175,top:305,width:260,height:125};const a=await sharp(waveA).extract(crop).raw().toBuffer(),b=await sharp(waveB).extract(crop).raw().toBuffer();report.waterMotionPixelDelta=a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;assert.ok(report.waterMotionPixelDelta>.01);
 await page.locator('#season-cycle').click();const start=await page.evaluate(()=>pasture.seasons.phase);await page.waitForTimeout(300);assert.ok(await page.evaluate(s=>pasture.seasons.phase>s,start));
 await page.locator('#motion').click();const frozen=await page.evaluate(()=>[pasture.seasons.phase,pasture.diagnostics.environmentTime]);await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>[pasture.seasons.phase,pasture.diagnostics.environmentTime]),frozen);
 await page.locator('[data-season=spring]').click();assert.equal(await page.evaluate(()=>pasture.seasons.auto),false);assert.equal(await page.evaluate(()=>pasture.seasons.key),'spring');
 await page.locator('#motion').click();await page.locator('[data-season=summer]').click();assert.equal(await page.evaluate(()=>pasture.seasons.transitioning),true);await page.waitForFunction(()=>!pasture.seasons.transitioning,null,{timeout:20000});assert.equal(await page.evaluate(()=>pasture.seasons.key),'summer');
 await page.locator('#season-cycle').click();await page.locator('#compare').click();const comparison=await page.evaluate(()=>[pasture.seasons.phase,pasture.diagnostics.environmentTime]);await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>[pasture.seasons.phase,pasture.diagnostics.environmentTime]),comparison);await page.locator('#compare').click();
 await page.locator('#quality').click();await page.waitForTimeout(200);assert.equal(await page.locator('#quality').getAttribute('aria-pressed'),'true');await page.locator('#quality').click();
 await page.setViewportSize({width:390,height:844});await page.locator('[data-view=willow]').click();await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);assert.ok(await page.locator('[data-season=winter]').isVisible());await page.locator('#motion').click();await page.locator('[data-season=winter]').click();await page.waitForTimeout(200);await page.screenshot({path:'artifacts/environment-v11/winter-mobile.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:90000});assert.equal(await page.evaluate(()=>pasture.state.motion),false);assert.equal(await page.evaluate(()=>pasture.seasons.auto),false);
 const fallback=await browser.newPage();await fallback.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));await fallback.goto(base);await fallback.waitForSelector('#fallback:not([hidden])');assert.ok(await fallback.locator('#season-cycle').isDisabled());assert.ok(await fallback.locator('[data-season=summer]').isDisabled());
 assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;report.checks=['physical clear water with underwater geometry','three mountain ridges','four season appearance and whole-leaf winter shedding','animated water image difference','manual blend and automatic cycle','motion / comparison pause','reduced motion','quality switch','mobile layout','no-GPU disabled season controls'];
 await writeFile('artifacts/environment-v11/check-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
