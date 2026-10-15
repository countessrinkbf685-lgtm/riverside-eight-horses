import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import sharp from 'sharp';
const preview=process.argv.includes('--preview'),out='artifacts/promo-v1',fps=24,width=1920,height=1080;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const errors=[],report={width,height,fps,frames:0,shots:[],errors};let encoder;
try{
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.PASTURE_URL||'http://127.0.0.1:5173')+'/?film=1');
 await page.waitForFunction(()=>window.pasture?.film,null,{timeout:120000});
 report.backend=await page.evaluate(()=>pasture.state.backend);
 report.assets=await page.evaluate(()=>({loaded:pasture.state.loaded,failed:pasture.state.failed}));
 if(report.backend!=='WebGPU'||report.assets.failed.length)throw new Error('Scene is not ready for filming');
 await page.evaluate(()=>document.fonts.ready);
 if(preview){
  for(let i=0;i<8;i++){
   const state=await page.evaluate(t=>pasture.film.renderFrame(t),i*6+3);
   await page.screenshot({path:`${out}/shot-${i+1}.jpg`,type:'jpeg',quality:94});report.shots.push(state);
  }
  const tiles=await Promise.all(Array.from({length:8},(_,i)=>sharp(`${out}/shot-${i+1}.jpg`).resize(640,360).toBuffer()));
  await sharp({create:{width:1280,height:1440,channels:3,background:'#141d19'}}).composite(tiles.map((input,i)=>({input,left:i%2*640,top:Math.floor(i/2)*360}))).jpeg({quality:93}).toFile(`${out}/storyboard.jpg`);
 }else{
  const duration=await page.evaluate(()=>pasture.film.duration),count=duration*fps;
  encoder=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/riverside-pasture-picture.mp4`],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let encoderError='';encoder.stderr.on('data',d=>encoderError+=d);const exited=once(encoder,'exit');
  encoder.stdin.on('error',e=>errors.push(e.message));
  for(let i=0;i<count;i++){
   const state=await page.evaluate(t=>pasture.film.renderFrame(t),i/fps);
   const frame=await page.screenshot({type:'jpeg',quality:96});
   if(!encoder.stdin.write(frame))await once(encoder.stdin,'drain');
   report.frames++;
   if(i%(fps*3)===0)console.log(`Frame ${i}/${count} · shot ${state.shot} · ${state.caption}`);
   if(i%(fps*6)===fps*3){await writeFile(`${out}/shot-${state.shot}.jpg`,frame);report.shots.push(state);}
   if(errors.length)throw new Error(errors.join('\n'));
  }
  encoder.stdin.end();const [code]=await exited;if(code!==0)throw new Error('FFmpeg failed: '+encoderError);
  report.duration=duration;report.encoderWarnings=encoderError;
 }
 if(errors.length)throw new Error(errors.join('\n'));
 report.passed=true;await writeFile(`${out}/${preview?'preview':'recording'}-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{encoder?.stdin.destroy();await browser.close();}
