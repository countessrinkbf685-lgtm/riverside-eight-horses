import * as THREE from 'three/webgpu';
import {createEnvironment} from '../src/pasture/environment.js';
import {plantProfiles,createPlantLayout} from '../src/pasture/plants.js';
import {anchors,groundHeight,shoreZ,farShoreZ} from '../src/pasture/spatial.js';
import {writeFile,readFile} from 'node:fs/promises';
const scene=new THREE.Scene(),environment=createEnvironment(scene);
const willow=JSON.parse(await readFile('artifacts/realism-v3/willow-report.json','utf8'));environment.report.willow=willow;
let triangles=0,drawObjects=0;const geometry=new Set();
scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);drawObjects++;geometry.add(o.geometry);}});
triangles+=willow.woodTriangles+willow.leafTriangles;drawObjects+=2;
const t02=JSON.parse(await readFile('artifacts/t02/runtime-report.json','utf8'));
triangles+=t02.instances*(t02.foliageTriangles+t02.shootTriangles);drawObjects+=t02.instances*2;
environment.report.t02=t02;environment.report.vegetation.treeCount=t02.instances;
const result={version:'environment-v8',status:'willow_silhouette_and_surface_fitted_tail_root',reference:'design/pasture/visual-v2/images/00-riverside-atmosphere.png',
 sources:['E:/fabotanic/src/modules/math.js','E:/fabotanic/src/modules/geometry.js','E:/fabotanic/src/modules/tree.js','E:/fabotanic/src/modules/tree-base.js','E:/fabotanic/src/modules/field-composer.js','E:/fabotanic/src/garden/kit.mjs'],
 adaptation:'Math and leaf/tube geometry helpers snapshotted with ES module wrappers; scene-specific species forms, layout, river and terrain authored in this project. See src/pasture/vendor/fabotanic/provenance.json.',
 features:environment.report,profiles:plantProfiles,
 comparison:{before:'artifacts/realism-v3/before-scene.png',after:'artifacts/realism-v3/scene-desktop.png',changes:['Replaced repeated upward arches with unequal descending boughs and clustered curtains; 14 actual crown tips receive short leafy leaders.','Narrow folded lanceolate leaves replace broad repeated fins.','Pinned structural roots and shared wind phase for branches and leaves.','H06 uses 720 surface-fitted tapered locks; continuous dark root to light tip; original published body geometry and skin weights preserved exactly.'],editable:['artifacts/realism-v3/T01-willow-refinement.blend','artifacts/h06/H06-rig-study.blend','artifacts/h07/H07-rig-study.blend']},
 geometry:{environmentTrianglesIncludingInstances:triangles,environmentDrawObjects:drawObjects,uniqueGeometries:geometry.size+4,note:'Includes T02 procedural shoots/leaves and willow branches from captured runtime reports. Excludes imported horse/herder/T01/T02/rock meshes, shadows and visibility culling. Not a frame-rate benchmark.'},
 figureAnchors:anchors.map(a=>({...a,y:groundHeight(a.x,a.z),nearBankZ:shoreZ(a.x),farBankZ:farShoreZ(a.x)})),
 limitations:['T02 leaf placement is procedural art direction on the supplied branch mesh; source bare model is kept independently.','Plant groups represent visual morphology, not verified botanical species or habitat reconstruction.','H06 flat-plane contacts measured separately; terrain locomotion, other animal poses and performance acceptance remain pending.'],
 checks:['deterministic seeds','6 vegetation layout and avoidance masks','valid finite geometry and indices','leaf-count independent wood skeleton','CPU/mesh height agreement','WebGPU browser regression']};
await writeFile('design/pasture/environment-v8.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.geometry));
