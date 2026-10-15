import {readFile,writeFile,stat} from 'node:fs/promises';
import {assetCatalog} from '../src/pasture/assets.js';
const prepared=JSON.parse(await readFile('artifacts/audit/prepared-models.json','utf8'));
const assets=assetCatalog.map(spec=>({...spec,source:`design/pasture/${spec.file}.glb`,url:`/models/prepared/${spec.file}.glb`,
 sourceUnmodified:true,identityReview:'Compared front/three-quarter model renders against approved single-item images; visual mapping, not embedded source metadata.',
 assetStage:'static_prepared_not_retopologized_or_rigged',
 normalization:'Preserve GLB root rotation; uniform height scaling and XZ centering; native heading calibrated per asset.',
 ...prepared.find(p=>p.url.includes(spec.file))}));
const rig=JSON.parse(await readFile('artifacts/h06/rig-report.json','utf8')),h06=assets.find(a=>a.id==='H06');
h06.staticPreparedUrl=h06.url;h06.url='/models/h06/horse.glb';h06.assetStage='46_bone_deformation_study_Idle_and_Graze_in_scene_Walk_on_flat_review_stage';h06.bytes=(await stat('public/models/h06/horse.glb')).size;h06.skins=1;h06.animations=Object.keys(rig.clips);h06.animationReport='artifacts/h06/rig-report.json';h06.editable='artifacts/h06/H06-rig-study.blend';h06.topology='derived triangles, not manual deformation retopology';h06.tailGroom=rig.tailGroom;h06.groomReport='artifacts/realism-v3/check-report.json';
const t01=assets.find(a=>a.id==='T01');t01.editable='artifacts/realism-v3/T01-willow-refinement.blend';t01.foliageReport='artifacts/realism-v3/willow-report.json';
const t02=assets.find(a=>a.id==='T02');t02.assetStage='imported_bare_branch_model_with_separate_surface_attached_foliage';t02.normalization='Preserve source root transform; uniform height scaling; XZ pivot centered on the lower stem, not asymmetric crown.';t02.sceneInstances=2;t02.attachmentReport='artifacts/t02/runtime-report.json';
const rig07=JSON.parse(await readFile('artifacts/h07/rig-report.json','utf8')),h07=assets.find(a=>a.id==='H07');
h07.staticPreparedUrl=h07.url;h07.url='/models/h07/horse.glb';h07.assetStage='36_bone_deformation_study_Idle_and_Look_in_scene';h07.bytes=(await stat('public/models/h07/horse.glb')).size;h07.skins=1;h07.animations=Object.keys(rig07.clips);h07.animationReport='artifacts/h07/motion-check.json';h07.editable='artifacts/h07/H07-rig-study.blend';h07.topology='derived triangles, not manual deformation retopology';h07.runtimeHeading=0;h07.normalization='Rig authoring rotates source +90 degrees around Blender Z to canonical +X; runtime heading 0 replaces static native heading 90, uniform height and XZ centering retained.';
for(const id of ['H01','H02','H03','H04','H05','H08','P01']){
 const dir=id.toLowerCase(),report=JSON.parse(await readFile(`artifacts/${dir}/rig-report.json`,'utf8')),asset=assets.find(a=>a.id===id);
 Object.assign(asset,{staticPreparedUrl:asset.url,url:`/models/${dir}/horse.glb`,bytes:(await stat(`public/models/${dir}/horse.glb`)).size,skins:1,bones:report.bones,animations:Object.keys(report.clips),assetStage:'independent_rig_video_referenced_authored_clips',runtimeHeading:0,animationReport:`artifacts/${dir}/motion-check.json`,editable:`artifacts/${dir}/${id}-rig-study.blend`,topology:report.stage,normalization:`Source rotated ${report.sourceRotationDegrees} degrees to canonical +X; uniform height and floor alignment retained.`});
}
for(const id of ['H01','H02','P01'])assets.find(a=>a.id===id).refinementReport='artifacts/continuation-v10/check-report.json';
for(const id of ['H04','H06'])assets.find(a=>a.id===id).riverWalk={mode:'bounded route with terrain foot locking and start/stop',report:'artifacts/continuation-v10/walk-check.json'};
await writeFile('design/pasture/asset-registry.json',JSON.stringify({version:6,assets,missing:['deformation art approval and retopology','unrestricted herd navigation beyond authored short paths','P01 fingers and physical cloth'],totals:{runtimeModelBytes:assets.reduce((n,p)=>n+p.bytes,0),staticPreparedBytes:prepared.reduce((n,p)=>n+p.bytes,0),uniqueTriangles:prepared.reduce((n,p)=>n+p.meshes.reduce((s,m)=>s+m.triangles,0),0)},h06FlatPlaneContacts:rig.contacts},null,2));
console.log(`Saved identity mapping for ${assets.length} assets.`);
