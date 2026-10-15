import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.PASTURE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
await mkdir('artifacts/culture-v12',{recursive:true});const report={errors:[],checks:[]};
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 await page.goto(base);await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:60000});await page.locator('#motion').click();
 await page.locator('#culture-toggle').click();await page.waitForTimeout(1000);assert.ok(await page.locator('#culture-panel').isVisible());assert.equal(await page.evaluate(()=>pasture.state.view),'left');assert.equal(await page.locator('#culture-prev').isDisabled(),true);await page.screenshot({path:'artifacts/culture-v12/reading-horses.png'});
 for(const [id,view] of [['herder','right'],['river','river'],['leaves','redleaves'],['painting','home']]){
  await page.locator(`[data-chapter=${id}]`).click();assert.equal(await page.evaluate(()=>pasture.state.view),view);await page.waitForTimeout(950);
  await page.screenshot({path:`artifacts/culture-v12/reading-${id}.png`});
 }
 assert.ok(await page.locator('#culture-next').isDisabled());await page.locator('#culture-action').click();assert.ok(await page.locator('#original').isVisible());assert.ok(await page.locator('#culture-panel').isHidden());await page.locator('#compare').click();
 await page.locator('#culture-toggle').click();await page.locator('#culture-action').click();assert.equal(await page.locator('#detail-id').textContent(),'H06');assert.match(await page.locator('#detail-cultural-name').textContent(),/菊花青/);assert.ok(await page.locator('#culture-panel').isHidden());await page.waitForTimeout(900);await page.screenshot({path:'artifacts/culture-v12/horse-coat.png'});
 await page.locator('#detail-culture-open').click();assert.ok(await page.locator('#detail').isHidden());await page.keyboard.press('Escape');assert.ok(await page.locator('#culture-panel').isHidden());assert.equal(await page.locator('#culture-toggle').getAttribute('aria-expanded'),'false');
 await page.locator('#culture-toggle').click();await page.locator('[data-chapter=herder]').click();await page.locator('#culture-action').click();assert.equal(await page.locator('#detail-id').textContent(),'P01');assert.match(await page.locator('#detail-cultural-name').textContent(),/圉人/);
 await page.locator('#culture-toggle').click();await page.locator('[data-chapter=leaves]').click();await page.evaluate(()=>pasture.setSeason('summer'));await page.locator('#culture-action').click();assert.equal(await page.evaluate(()=>pasture.seasons.key),'autumn');
 const source=await page.request.get(base+'/references/cultural-research.txt');assert.equal(source.status(),200);assert.match(await source.text(),/学术考据研究/);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.locator('#culture-panel').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'artifacts/culture-v12/mobile-reading.png'});await page.locator('#culture-next').click();assert.match(await page.locator('#culture-title').textContent(),/海西/);
 await page.locator('#culture-close').click();assert.ok(await page.locator('#culture-panel').isHidden());await page.screenshot({path:'artifacts/culture-v12/mobile-scene.png'});
 const fallback=await browser.newPage();await fallback.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));await fallback.goto(base);await fallback.waitForSelector('#fallback:not([hidden])');await fallback.locator('#culture-toggle').click();assert.ok(await fallback.locator('#culture-panel').isVisible());assert.ok(await fallback.locator('#culture-action').isDisabled());await fallback.locator('[data-chapter=river]').click();assert.match(await fallback.locator('#culture-title').textContent(),/水草/);
 assert.deepEqual(report.errors,[]);report.passed=true;report.checks=['five camera-linked cultural chapters','grey horse and anonymous herder details','study source available','autumn return action','original comparison','close and Escape','mobile scrolling / no overflow','reading without WebGPU'];await writeFile('artifacts/culture-v12/check-report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close()}
