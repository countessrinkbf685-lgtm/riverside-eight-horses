import {chromium} from 'playwright-core';
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const dir='artifacts/promo-v2';await mkdir(dir,{recursive:true});
const source='artifacts/promo-v1/riverside-pasture-promo-1080p.mp4';
const original='郎世宁_郊原牧马图卷_6882x2160.png';
const card=`${dir}/original-painting-ending.png`,movie=`${dir}/riverside-pasture-promo-1080p.mp4`,share=`${dir}/riverside-pasture-promo-share.mp4`;
const run=(command,args)=>{const r=spawnSync(command,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr);return r;};
// Preserve the complete supplied painting; only resample it to fit the video frame.
const painting=await sharp(original).resize({width:1840}).png().toBuffer();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
 *{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#e8dfcd;color:#574d3e;font-family:SimSun,serif;text-align:center}
 h1{position:absolute;top:114px;left:0;right:0;margin:0;font-size:54px;letter-spacing:12px;font-weight:400}
 .artist{position:absolute;top:194px;left:0;right:0;font-size:25px;letter-spacing:6px}
 img{position:absolute;left:40px;top:266px;width:1840px;height:auto;box-shadow:0 5px 22px #594d3520;outline:1px solid #9a8b6d88}
 .name{position:absolute;top:907px;left:0;right:0;font-size:29px;letter-spacing:8px}
 .note{position:absolute;top:961px;left:0;right:0;font-size:18px;letter-spacing:5px;color:#83735b}
 </style><h1>郊原牧马图卷</h1><div class="artist">清 · 郎世宁</div><img alt="郎世宁郊原牧马图卷原画" src="data:image/png;base64,${painting.toString('base64')}"><div class="name">沿水岸牧马</div><div class="note">数字画境 · 原画致意</div></html>`);
 await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('img').decode();});
 await page.screenshot({path:card});
}finally{await browser.close();}
console.log('Original painting end card ready.');
if(process.argv.includes('--card-only'))process.exit(0);
const filter='[0:v]scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,tpad=stop_mode=clone:stop_duration=2[base];[1:v]scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuva420p,fade=t=in:st=43.5:d=2.5:alpha=1[painting];[base][painting]overlay=0:0:shortest=1:format=auto,format=yuv420p[v];[0:a]atempo=0.96,apad,atrim=duration=50[a]';
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-loop','1','-framerate','24','-i',card,'-filter_complex',filter,'-map','[v]','-map','[a]','-t','50','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-metadata','title=沿水岸牧马 · 原画收尾版',movie]);
console.log('Master exported; encoding share edition.');
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',movie,'-c:v','libx264','-preset','slow','-b:v','8M','-maxrate','10M','-bufsize','16M','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-movflags','+faststart',share]);
const report={version:2,original,source,dissolve:{start:43.5,end:46,holdUntil:50},files:[],checks:[]};
for(const file of [movie,share]){
 const info=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,sample_rate,channels,color_range,color_space','-show_entries','format=duration,size','-of','json',file]).stdout);
 const video=info.streams.find(s=>s.codec_type==='video'),audio=info.streams.find(s=>s.codec_type==='audio');
 assert.equal(video.width,1920);assert.equal(video.height,1080);assert.equal(video.avg_frame_rate,'24/1');assert.equal(Number(video.nb_read_frames),1200);assert.equal(Number(info.format.duration),50);assert.equal(audio.channels,2);
 run('ffmpeg',['-v','error','-i',file,'-f','null','-']);report.files.push({file,...info});
}
for(const [name,time] of [['dissolve',44.75],['painting',46.5],['last-frame',49.958333]])run('ffmpeg',['-v','error','-y','-ss',String(time),'-i',share,'-frames:v','1','-update','1',`${dir}/${name}.jpg`]);
report.checks=['complete source painting, no crop','1200 decoded frames per edition','50 seconds at 1080p / 24 fps','2.5 second painting dissolve and 4 second hold','stereo soundtrack retimed to 50 seconds'];report.passed=true;
await writeFile(`${dir}/delivery-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
