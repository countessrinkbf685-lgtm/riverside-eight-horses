import * as THREE from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createGrazingAnimation,lookSequence} from './motion.js';
import {castSequences,castOffsets,isMuzzleVertex} from './cast-motion.js';
import {groundHeight,yawForHeading} from './spatial.js';
export const assetCatalog=[
 {id:'H01',name:'左前白马',file:'f762da34b4eda8b4634b365bdb7789e9',height:2.02,nativeHeading:180,note:'深俯身、前肢折起与侧转头部的原画定姿已接入；含下俯、起身与定姿微动。'},
 {id:'H02',name:'左前黑马',file:'c8300826a850f79c70568d28071611ac',height:1.99,nativeHeading:180,note:'后肢支撑、前肢折起的原画定姿已接入；含下俯、起身与定姿微动。'},
 {id:'H03',name:'后排深栗马',file:'3bc8e5070909a4ea21e1499a1b0fa23a',height:2.04,nativeHeading:225,note:'独立骨骼、待机与回望回正已接入。'},
 {id:'H04',name:'中左黄褐马',file:'790713a9a1d25ea89c328cd778ca25c4',height:2.03,nativeHeading:180,note:'独立骨骼、待机、采食及抬头回正已接入。'},
 {id:'H05',name:'中左白马',file:'18e4c958a344809f7ebf4b40f3c724b8',height:2.01,nativeHeading:0,note:'独立骨骼、偏头校正、待机与采食回正已接入。'},
 {id:'H06',name:'柳左灰白马',file:'48825d13227c2967f8302b18fe1ea6b5',height:2.02,nativeHeading:0,note:'46 骨骼绑定样片；正向中立姿态、可见待机与低头采食回正序列已接入。慢走在独立平地检查页验证，沿岸慢行可启动短路径与逐蹄地形接触。'},
 {id:'H07',name:'柳旁浅褐马',file:'eb5ef92187918f4a7fde0f5673ad8e64',height:1.96,nativeHeading:90,note:'36 骨骼独立绑定；待机、耳动、尾动与回望回正已接入。保持四蹄站定。'},
 {id:'H08',name:'牧者旁棕白花马',file:'c64197c464cf6152b30f59e5c517f345',height:1.98,nativeHeading:180,note:'独立骨骼、待机与采食回正已接入，保留棕白花斑。'},
 {id:'P01',name:'蓝衣牧者',file:'e214feb3da6e59bf44a6fd83a77916a7',height:1.72,nativeHeading:90,note:'人形骨骼、A Pose、自然垂手、待机与左右观察已接入；袖口独立控制及肘部变形已精修；手指仍为源模型整体结构。'},
 {id:'T01',name:'主柳树干',file:'0d2e3526350332ae1efe54590e2a4bbd',height:7.3,nativeHeading:0,note:'原始树干与新增程序柳枝分开，枝叶为首轮搭建。'},
 {id:'T02',name:'左侧杂木枝干',file:'83c204b4c4421c915f097c40b3dd0934',height:6.6,nativeHeading:0,note:'已接入新枝干模型；秋色叶簇单独生成并附着于树枝表面，原始无叶模型保持独立。'},
 {id:'R01',name:'低矮坡石',file:'6c59e2c0e6864b03bf7b1e5fe611b266',height:.55,nativeHeading:0,note:'单块重复装配，后续需补充轮廓变体。'}
];
export async function loadAsset(id){
 const spec=assetCatalog.find(a=>a.id===id),gltf=await new GLTFLoader().loadAsync(/^(H0[1-8]|P01)$/.test(id)?`/models/${id.toLowerCase()}/horse.glb`:`/models/prepared/${spec.file}.glb`);
 const root=new THREE.Group();root.name=id;root.userData={assetId:id,spec,runtimeHeading:/^(H0[1-8]|P01)$/.test(id)?0:spec.nativeHeading};root.add(gltf.scene);
 const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const scale=spec.height/size.y;
 gltf.scene.scale.multiplyScalar(scale);gltf.scene.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 if(id==='T02'){
  // An asymmetric crown is not the planting pivot. Center the lower stem instead.
  root.updateMatrixWorld(true);const xs=[],zs=[],p=new THREE.Vector3();
  gltf.scene.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(p.y>.35&&p.y<.75){xs.push(p.x);zs.push(p.z);}}}});
  if(xs.length){xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);gltf.scene.position.x-=xs[Math.floor(xs.length/2)];gltf.scene.position.z-=zs[Math.floor(zs.length/2)];}
 }
 gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.assetId=id;
  o.material.roughness=o.name.includes('tail_groom')?.63:.92;o.material.metalness=0;o.material.normalScale?.set(.55,.55);o.material.envMapIntensity=.2;
 }});
 if(gltf.animations.length){
  const report=await fetch(`/models/${id.toLowerCase()}/rig-report.json`).then(r=>r.json());root.userData.rigReport=report;
  root.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const point=new THREE.Vector3(),ids=[];for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);if(point.y<.004)ids.push(i);}o.userData.soleIndices=ids;o.userData.soleTags={};for(const i of ids){point.fromBufferAttribute(o.geometry.attributes.position,i);const axle=point.x>0?'F':'H',split=report.soleSplitY?.[axle]??(id==='H06'?.04:0),tag=(id==='P01'?'':axle)+(-point.z>split?'L':'R');(o.userData.soleTags[tag]??=[]).push(i);}const muzzle=[];for(let i=0;i<o.geometry.attributes.position.count;i++){point.fromBufferAttribute(o.geometry.attributes.position,i);if(report.muzzleBindSelection?isMuzzleVertex(point,report.muzzleBindSelection):id==='H06'&&point.x>.94&&point.y>1.25&&point.y<1.57&&point.z>.38)muzzle.push(i);}o.userData.muzzleIndices=muzzle;}});
  root.userData.animation=createGrazingAnimation(gltf.scene,gltf.animations,castSequences[id]||(id==='H07'?lookSequence:undefined));
  if(castOffsets[id])root.userData.animation.evaluate(castOffsets[id]);
 }
 return root;
}
export function measureActorSoles(root,region='soleIndices'){
 if(!root?.userData.animation)return null;
 root.updateMatrixWorld(true);let maxError=0,minClearance=Infinity,maxClearance=-Infinity,count=0;const point=new THREE.Vector3(),center=new THREE.Vector3();
 root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();const support=root.userData.supportFeet||(root.userData.animation.active.startsWith('Painting')?['HL','HR']:null),indices=region==='soleIndices'&&support?support.flatMap(tag=>o.userData.soleTags?.[tag]||[]):o.userData[region]||[];for(const i of indices){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);const d=point.y-groundHeight(point.x,point.z);maxError=Math.max(maxError,Math.abs(d));minClearance=Math.min(minClearance,d);maxClearance=Math.max(maxClearance,d);center.add(point);count++;}}});
 return {center:count?center.multiplyScalar(1/count).toArray():null,sampledSoleVertices:count,maxGroundErrorMeters:maxError,minClearanceMeters:minClearance,maxClearanceMeters:maxClearance};
}
export function placeActor(root,anchor){
 root.rotation.y=yawForHeading(anchor.heading,root.userData.runtimeHeading);
 root.position.set(anchor.x,groundHeight(anchor.x,anchor.z),anchor.z);
 root.userData.anchor=anchor;
 // Whole-model minimum is a preliminary floor alignment, not validated per-hoof IK.
 return root;
}
