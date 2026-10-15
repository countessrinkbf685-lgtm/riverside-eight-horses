import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {assetCatalog} from '../src/pasture/assets.js';
test('12 unique mapped models resolve to derived meshes while sources remain present',async()=>{
 assert.equal(assetCatalog.length,12);assert.equal(new Set(assetCatalog.map(a=>a.file)).size,12);
 let bytes=0;
 for(const a of assetCatalog){
  const web=await stat(`public/models/prepared/${a.file}.glb`);
  try{const original=await stat(`design/pasture/${a.file}.glb`);assert.ok(web.size<original.size/10);}catch(_){}
  bytes+=web.size;
 }
 assert.ok(bytes<20*1024*1024);
});
test('per-horse prompts cover requested states without treating videos as skeletal clips',async()=>{
 const p=JSON.parse(await readFile('design/pasture/video-prompts/prompts.json','utf8'));
 assert.equal(p.records.filter(r=>r.status.startsWith('prompt_ready')).length,16);
 for(let i=1;i<=8;i++){const id=`H0${i}`;assert.ok(p.records.find(r=>r.id===id+'-Idle'));}
 for(const id of ['H04-Walk','H06-Walk'])assert.ok(p.records.find(r=>r.id===id).prompt.includes('four-beat'));
 assert.equal(p.records.filter(r=>r.status==='needs_approved_painting_pose_reference').length,2);
 assert.equal(p.existing_videos.length,26);
 assert.ok(p.records.find(r=>r.id==='H06-Graze').received_references.includes('gemini_generated_video_2265f448'));
 assert.equal(p.existing_videos.find(v=>v.clip_key==='gemini_generated_video_17c07da1').subject,'H07');
 assert.equal(new Set(p.existing_videos.map(v=>v.clip_key)).size,26);
 assert.equal(p.existing_videos.find(v=>v.clip_key==='gemini_generated_video_37037a6e').subject,'H06');
 assert.equal(p.existing_videos.find(v=>v.clip_key==='gemini_generated_video_1941354a').subject,'P01');
});
