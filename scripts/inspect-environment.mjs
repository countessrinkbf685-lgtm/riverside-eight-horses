import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const errors=[];await mkdir('artifacts/environment-v11',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});page.on('console',msg=>{if(msg.type()==='error'){errors.push(msg.text());console.log('CONSOLE',msg.text())}});
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:90000});await page.waitForTimeout(1800);
 console.log(await page.evaluate(()=>pasture.environmentInspection));
 await page.evaluate(()=>pasture.state.motion=false);
 for(const season of ['autumn','spring','summer','winter']){
  await page.evaluate(s=>{pasture.setSeason(s);pasture.chooseView('home',true);},season);await page.waitForTimeout(450);await page.screenshot({path:`artifacts/environment-v11/${season}-home.png`});
 }
 await page.evaluate(()=>{pasture.setSeason('summer');pasture.chooseView('river',true)});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/environment-v11/summer-river.png'});
 await writeFile('artifacts/environment-v11/initial-errors.json',JSON.stringify(errors,null,2));console.log({errors});
}finally{await browser.close()}
