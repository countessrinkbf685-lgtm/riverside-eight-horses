import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
await mkdir('artifacts/landscape-v13',{recursive:true});const errors=[];
try{
 const p=await browser.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>window.pasture?.state.ready,null,{timeout:90000});await p.waitForTimeout(1500);console.log(await p.evaluate(()=>pasture.state.environment.vegetation.extendedMeadow));
 await p.locator('#motion').click();await p.screenshot({path:'artifacts/landscape-v13/home.png'});
 for(const [label,key]of [['pan-left','ArrowLeft'],['pan-right','ArrowRight']]){await p.evaluate(()=>pasture.chooseView('home',true));await p.locator('#viewport').focus();for(let i=0;i<20;i++)await p.keyboard.press(key);await p.waitForTimeout(1000);await p.screenshot({path:`artifacts/landscape-v13/${label}.png`});}
 for(const view of ['left','right','river']){await p.evaluate(v=>pasture.chooseView(v,true),view);await p.waitForTimeout(300);await p.screenshot({path:`artifacts/landscape-v13/${view}.png`});}
 await p.locator('#motion').click();await p.waitForTimeout(800);await p.screenshot({path:'artifacts/landscape-v13/river-moving.png'});
 assert.deepEqual(errors,[]);await writeFile('artifacts/landscape-v13/initial-check.json',JSON.stringify({errors,environment:await p.evaluate(()=>pasture.state.environment)},null,2));console.log({errors});
}finally{await browser.close()}
