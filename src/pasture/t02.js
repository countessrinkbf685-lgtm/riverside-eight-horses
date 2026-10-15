import {prepareLeafSeasons} from './seasons.js';
import * as THREE from 'three/webgpu';
import {positionLocal,positionWorld,sin,vec3,attribute} from 'three/tsl';
import {MeshBuilder,tube} from './vendor/fabotanic/geometry.js';
import {rng,bezier} from './vendor/fabotanic/math.js';
import {convert,curvedLeaf,leafMaterial} from './plants.js';
import {groundHeight} from './spatial.js';

export const t02Placements=[
 {x:-11.6,z:-.65,scale:1,yaw:-.12},
 {x:-10.1,z:-2.65,scale:.66,yaw:-1.1}
];

// All shoot origins are real bark vertices in the normalized asset's local frame.
// Sampling a fixed mesh, rather than guessed crown volumes, prevents detached foliage.
export function branchSamples(root){
 root.updateMatrixWorld(true);const points=[],inverse=root.matrixWorld.clone().invert();
 root.traverse(mesh=>{if(mesh.isMesh&&!mesh.isInstancedMesh){const matrix=inverse.clone().multiply(mesh.matrixWorld),normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);if(point.y<2.4)continue;const normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();points.push({point,normal});}
 }});
 const random=rng(2042),shuffled=points.map(p=>({...p,order:random()})).sort((a,b)=>a.order-b.order),selected=[];
 for(const p of shuffled){
  if(p.point.y<3.8&&Math.hypot(p.point.x,p.point.z)<.85)continue;
  if(selected.some(q=>q.point.distanceToSquared(p.point)<.22**2))continue;
  selected.push(p);if(selected.length===180)break;
 }
 return selected;
}

export function createT02Foliage(root,clock){
 const anchors=branchSamples(root),random=rng(2071),wood=new MeshBuilder('T02-attached-shoots'),leaves=new MeshBuilder('T02-autumn-foliage');let leafCount=0;
 for(const {point,normal} of anchors){
  const base=point.toArray(),angle=Math.atan2(normal.z,normal.x),red=random()<.12;
  for(let k=0;k<3;k++){
   const a=angle+(k-1)*.8+(random()-.5)*.5,L=.3+random()*.32;
   const tip=[base[0]+Math.cos(a)*L,base[1]+.12+random()*.23,base[2]+Math.sin(a)*L];
   const path=t=>bezier(base,[base[0]+normal.x*.08,base[1]+.1,base[2]+normal.z*.08],[tip[0],tip[1]+.07,tip[2]],tip,t);
   tube(wood,path,.006,.0015,4,3,[.32,.27,.18]);
   for(let j=0;j<10;j++){
    const t=.14+j*.082,shade=.8+random()*.35,tint=(red?[.46,.25,.11]:[.47,.46,.24]).map(v=>v*shade);
    curvedLeaf(leaves,path(t),a+(j%2?1:-1)*1.15,.13+random()*.13,.08+random()*.035,.35+random()*.45,tint,4);leafCount++;
   }
  }
 }
 const group=new THREE.Group();group.name='T02-surface-attached-foliage';
 const woodMesh=new THREE.Mesh(convert(wood),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
 const leafGeometry=prepareLeafSeasons(convert(leaves)),uv=leafGeometry.attributes.uv,weight=new Float32Array(uv.count);
 for(let i=0;i<weight.length;i++)weight[i]=uv.getY(i)**2;
 leafGeometry.setAttribute('aWindWeight',new THREE.BufferAttribute(weight,1));
 const material=leafMaterial(clock,true),bend=attribute('aWindWeight').mul(.022);
 material.positionNode=positionLocal.add(vec3(sin(clock.mul(.8).add(positionWorld.x)).mul(bend),0,sin(clock.mul(.65).add(positionWorld.z)).mul(bend.mul(.6))));
 const foliage=new THREE.Mesh(leafGeometry,material);woodMesh.receiveShadow=true;foliage.castShadow=true;foliage.receiveShadow=true;group.add(woodMesh,foliage);root.add(group);
 return {anchors:anchors.length,leaves:leafCount,attachment:'shoot origins sampled directly from normalized bark vertices',foliageTriangles:foliage.geometry.index.count/3,shootTriangles:woodMesh.geometry.index.count/3};
}

export function installT02(scene,root,clock){
 const report=createT02Foliage(root,clock);const trees=[];
 for(const [i,p]of t02Placements.entries()){
  const tree=i===0?root:root.clone(true);tree.name='T02-'+(i+1);tree.scale.setScalar(p.scale);tree.rotation.y=p.yaw;tree.position.set(p.x,groundHeight(p.x,p.z)-.09,p.z);scene.add(tree);trees.push(tree);
 }
 return {...report,instances:trees.length,source:'83c204b4c4421c915f097c40b3dd0934.glb',proceduralTrunkReplaced:true};
}
