import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
await mkdir('artifacts/browser',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const errors=[],failedRequests=[],results={url:base,headless:true,performance_acceptance:false};
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});
 await page.goto(base);await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:60000});
 await page.waitForTimeout(1300);
 const d=await page.evaluate(()=>pasture.diagnostics);assert.equal(d.backend,'WebGPU');assert.equal(d.actorCount,9);assert.equal(d.loaded.length,12);assert.equal(d.failed.length,0);assert.equal(d.animatedActors,9);assert.equal(d.animationTimes[0].clip,'Idle');assert.ok(d.h06Soles.sampledSoleVertices>0);assert.ok(d.h06Soles.maxGroundErrorMeters<.01);
 await page.screenshot({path:'artifacts/browser/scene-desktop.png'});
 for(const view of ['left','willow','canopy','right','home']){
  await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(950);assert.equal(await page.evaluate(()=>pasture.state.view),view);
  await page.screenshot({path:`artifacts/browser/scene-${view}.png`});
 }
 const horsePoint=await page.evaluate(()=>pasture.screenAnchor('H06'));await page.mouse.click(horsePoint.x,horsePoint.y);await page.waitForTimeout(950);assert.equal(await page.locator('#detail').isVisible(),true);assert.equal(await page.locator('#detail-id').textContent(),'H06');
 await page.screenshot({path:'artifacts/browser/scene-h06.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>pasture.state.view),'home');
 await page.locator('#motion').click();const before=await page.evaluate(()=>[pasture.diagnostics.environmentTime,...pasture.diagnostics.animationTimes.map(a=>a.time)]);await page.waitForTimeout(250);const after=await page.evaluate(()=>[pasture.diagnostics.environmentTime,...pasture.diagnostics.animationTimes.map(a=>a.time)]);assert.deepEqual(before,after);
 await page.locator('#compare').click();assert.ok(await page.locator('#original').isVisible());await page.locator('#original img').evaluate(i=>i.decode());await page.locator('#compare').click();
 await page.locator('#quality').click();assert.equal(await page.locator('#quality').getAttribute('aria-pressed'),'true');await page.locator('#quality').click();
 await page.setViewportSize({width:390,height:844});await page.locator('[data-view="willow"]').click();await page.waitForTimeout(950);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.screenshot({path:'artifacts/browser/scene-mobile.png'});
 results.diagnostics=await page.evaluate(()=>pasture.diagnostics);results.environment=await page.evaluate(()=>pasture.state.environment);assert.equal(results.environment.t02.instances,2);assert.equal(results.environment.t02.proceduralTrunkReplaced,true);assert.ok(results.environment.t02.anchors>0);
 await page.goto(base+'/design/pasture/video-prompts/index.html');await page.locator('img').evaluateAll(async imgs=>{for(const i of imgs){i.loading='eager';await i.decode();}});assert.equal(await page.locator('article').count(),18);
 await page.locator('[data-copy="H06-Walk"]').click();await page.waitForFunction(()=>document.querySelector('#H06-Walk .feedback').textContent.length>0);
 const videoLinks=await page.locator('li a').evaluateAll(as=>as.map(a=>a.href));assert.equal(videoLinks.length,26);assert.equal(await page.locator('video[preload=none]').count(),26);for(const url of videoLinks){const r=await page.request.head(url);assert.equal(r.status(),200);}
 const posters=await page.locator('video').evaluateAll(vs=>vs.map(v=>v.poster));for(const url of posters){const r=await page.request.head(url);assert.equal(r.status(),200);assert.ok(r.headers()['content-type'].startsWith('image/'));}
 await page.locator('#gemini_generated_video_2265f448 summary').click();await page.locator('#gemini_generated_video_2265f448 video').evaluate(v=>v.load());await page.waitForFunction(()=>document.querySelector('#gemini_generated_video_2265f448 video').readyState>=1);assert.equal(await page.locator('#gemini_generated_video_2265f448 video').evaluate(v=>v.duration),8);
 await page.goto(base+'/asset-review.html?asset=T02');await page.waitForFunction(()=>window.review?.ready);assert.equal(await page.evaluate(()=>review.files.length),12);assert.ok((await page.locator('#info').textContent()).includes('T02'));await page.screenshot({path:'artifacts/browser/t02-inspector.png'});
 const fallback=await browser.newPage({viewport:{width:1100,height:750}});await fallback.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));await fallback.goto(base);await fallback.waitForSelector('#fallback:not([hidden])');assert.ok(await fallback.locator('#original').isVisible());await fallback.locator('#original img').evaluate(i=>i.decode());await fallback.screenshot({path:'artifacts/browser/fallback.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);results.checks=['actual WebGPU','12 assets / 9 figures / all nine actors animated / imported T02','five camera presets','H06 detail and return','environment and animation pause','original comparison','quality switch','mobile layout','18 prompt cards and copy','26 reference video links','12-model inspector','no-GPU fallback'];
 results.errors=errors;results.failedRequests=failedRequests;
 await writeFile('artifacts/browser/check-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.checks,backend:d.backend,adapter:d.adapter},null,2));
}finally{await browser.close();}
