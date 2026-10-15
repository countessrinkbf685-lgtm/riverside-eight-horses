import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {castSequences} from '../src/pasture/cast-motion.js';
const refs={H01:['00047139'],H02:['aaab9a9b'],H03:['76de8d3b','950383ab'],H04:['c8ebd62b','3e726afb'],H05:['fc893e1d','3b56819c'],H08:['983f5252','df7c0ebc'],P01:['8f3f59dd']};
const path='design/pasture/motion-intake.json',intake=JSON.parse(await readFile(path,'utf8'));
intake.batch='2026-10-14-painting-walk-sleeves';intake.next_authoring=[];
intake.authored=intake.authored.filter(a=>!refs[a.asset]);
intake.runtime_clips=intake.runtime_clips.filter(a=>!refs[a.split(':')[0]]);
intake.review_stage_clips=intake.review_stage_clips.filter(a=>!refs[a.split(':')[0]]);
for(const [id,keys]of Object.entries(refs)){
 const dir=id.toLowerCase(),reportPath=`artifacts/${dir}/rig-report.json`,report=JSON.parse(await readFile(reportPath,'utf8'));
 report.references=keys.map(key=>'gemini_generated_video_'+key);
 report.referenceCaveat='H03/H04 brown-horse identities and H05 assignments remain candidates; references guide timing only, actor anatomy comes from its own model.';
 if(id==='P01'){report.sleeveRefinement={controls:['SleeveL','SleeveR','CuffL','CuffR'],elbowFlexDegrees:9,method:'separate sleeve/cuff regional weights and articulated elbow'};report.limitations=['fingers remain fused source geometry','skeletal cloth motion, not cloth simulation; derived triangle topology'];}
 if(!['H01','H02','P01'].includes(id))report.limitations=report.limitations.filter(s=>!s.includes('painting crouch'));
 await writeFile(reportPath,JSON.stringify(report,null,2));await copyFile(reportPath,`public/models/${dir}/rig-report.json`);
 intake.authored.push({asset:id,clips:Object.keys(report.clips),references:report.references,referenceCaveat:report.referenceCaveat,status:'independent skeletal study exported and integrated; art approval pending',report:`artifacts/${dir}/motion-check.json`,editable:`artifacts/${dir}/${id}-rig-study.blend`});
 intake.runtime_clips.push(...[...new Set(castSequences[id].map(([clip])=>id+':'+clip))]);
 intake.review_stage_clips.push(...Object.keys(report.clips).map(clip=>id+':'+clip));
}
intake.riverWalk={actors:['H04','H06'],mode:'user-triggered bounded shoreline paths with preparation, gait, foot locking and arrival',distancesMeters:{H04:1.05,H06:1.2},report:'artifacts/continuation-v10/check-report.json'};
intake.pending=['final art approval and manual deformation retopology','unrestricted navigation and obstacle avoidance beyond the authored routes','P01 individual fingers and physical cloth simulation'];
await writeFile(path,JSON.stringify(intake,null,2));
