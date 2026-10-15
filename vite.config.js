import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {cp,mkdir,copyFile,readdir} from 'node:fs/promises';
export default defineConfig({
 build:{rollupOptions:{input:{main:resolve('index.html'),review:resolve('asset-review.html'),motion:resolve('motion-review.html')}}},
 plugins:[{name:'design-reference-handoff',async closeBundle(){
  await mkdir('dist/design/pasture',{recursive:true});
  for(const dir of ['visual-v1','visual-v2','video-prompts','environment-v11-images'])await cp(`design/pasture/${dir}`,`dist/design/pasture/${dir}`,{recursive:true,filter:p=>dir==='video-prompts'||!/(review-|preview-|before-riverside|build_visuals)/.test(p)});
  for(const file of ['index.html','plan.md','scene-plan.json','asset-registry.json','implementation.txt','environment-v2.txt','environment-v2.json','environment-v3.json','iteration-v3.txt','video-reviews.json','environment-v4.json','environment-v5.json','iteration-v5.txt','iteration-v6.txt','environment-v6.json','iteration-v7.txt','environment-v7.json','iteration-v8.txt','iteration-v9.txt','iteration-v10.txt','environment-v10.json','iteration-v11.txt','environment-v11.json','environment-v11.html','iteration-v12.txt','environment-v12.json','culture-v12.json','iteration-v13.txt','environment-v13.json','iteration-v14.txt','environment-v14.json','environment-v9.json','environment-v8.json','asset-intake-02.txt','motion-intake.json'])await copyFile(`design/pasture/${file}`,`dist/design/pasture/${file}`);
  for(const file of ['郎世宁_郊原牧马图卷_6882x2160.jpg','detail_herder.jpg','detail_horse.jpg'])await copyFile(file,`dist/${file}`);
  // Reference videos are lazy, user-triggered playback; originals never enter the scene bundle.
  await cp('design/pasture/heder-veo','dist/design/pasture/heder-veo',{recursive:true});
  for(const file of (await readdir('design/pasture')).filter(f=>f.endsWith('.mp4')))await copyFile(`design/pasture/${file}`,`dist/design/pasture/${file}`);
 }}]
});
