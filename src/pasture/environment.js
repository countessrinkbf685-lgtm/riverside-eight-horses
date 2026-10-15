import * as THREE from 'three/webgpu';
import {uniform,positionWorld,attribute,normalWorld,sin,vec3,color,mix,mx_noise_float} from 'three/tsl';
import {shoreZ,farShoreZ,groundHeight,seededRandom,smooth,actorClearance,rockPlacements} from './spatial.js';
import {createDiversePlants,patchDensity} from './plants.js';
import {createRiver} from './river.js';
import {seasonUniforms} from './seasons.js';
export const motionTime=uniform(0);

export function terrainGeometry(){
 const geo=new THREE.BufferGeometry(),positions=[],colors=[],indices=[];
 const dry=new THREE.Color('#95836a'),grass=new THREE.Color('#687047'),wet=new THREE.Color('#64664b');
 for(const side of [1,-1]){
  const base=positions.length/3;
  for(let row=0;row<=72;row++)for(let col=0;col<=240;col++){
   const x=-30+col*.25,depth=row<=40?row*.24:9.6+(row-40)*(side===1?1.8:1.05),z=side===1?shoreZ(x)+depth:farShoreZ(x)-depth;
   positions.push(x,groundHeight(x,z),z);
   const cover=(.55+patchDensity(x,z)*.4)*(side===1?smooth(.65,1.4,actorClearance(x,z)):1);
   const c=dry.clone().lerp(grass,cover).lerp(wet,(1-smooth(0,.6,depth))*.75);
   c.multiplyScalar(.94+.08*Math.sin(x*4.7+z*7.1));colors.push(c.r,c.g,c.b);
   if(row<72&&col<240){const a=base+row*241+col,b=a+1,c=a+241,d=c+1;if(side===1)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);}
  }
 }
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function addPebbles(scene){
 const random=seededRandom(991),base=new THREE.IcosahedronGeometry(1,0),material=new THREE.MeshStandardMaterial({color:'#9f9479',roughness:1});
 const stones=new THREE.InstancedMesh(base,material,230),dummy=new THREE.Object3D();let n=0;
 for(let attempt=0;n<230&&attempt<4000;attempt++){
  const x=-14+random()*28,z=-3+random()*11;if(z<shoreZ(x)+.2||actorClearance(x,z)<1.15)continue;
  const size=.035+random()**3*.17;
  dummy.position.set(x,groundHeight(x,z)+size*.18,z);dummy.scale.set(size*1.5,size*.6,size);dummy.rotation.set(random(),random()*6.28,random());dummy.updateMatrix();stones.setMatrixAt(n++,dummy.matrix);
 }stones.count=n;stones.receiveShadow=true;scene.add(stones);return stones;
}
function addErodedRockGroups(scene){
 const random=seededRandom(816),geo=new THREE.IcosahedronGeometry(1,2),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.13*Math.sin(x*9+z*6)+.07*Math.sin(y*14-z*7);p.setXYZ(i,x*r,y*(.57+.045*Math.sin(y*18+x*7)),z*r*.8);}geo.computeVertexNormals();
 const mat=new THREE.MeshStandardNodeMaterial({color:'#93816a',roughness:1});
 mat.colorNode=color('#93816a').mul(mx_noise_float(positionWorld.mul(19)).mul(.18).add(1)).mul(sin(positionWorld.y.mul(47).add(positionWorld.x.mul(.8))).mul(.045).add(1));
 const rocks=new THREE.InstancedMesh(geo,mat,320),dummy=new THREE.Object3D();let count=0;
 for(let i=0;i<320;i++){
  let x,z,scale;
  if(i<140){const r=rockPlacements[i%rockPlacements.length],angle=random()*6.28,distance=.8+random()*2.0;x=r.x+Math.cos(angle)*distance;z=r.z+Math.sin(angle)*distance*.65;scale=.10+random()**2*.36;}
  else{x=-24+random()*48;z=farShoreZ(x)-.05-random()*.65;scale=.12+random()*.28;}
  if(actorClearance(x,z)<1.1||z>farShoreZ(x)&&z<shoreZ(x)+.15)continue;
  dummy.position.set(x,groundHeight(x,z)+scale*.18,z);dummy.scale.set(scale*(1+random()*.7),scale,scale);dummy.rotation.set(random()*.3,random()*6.28,random()*.3);dummy.updateMatrix();rocks.setMatrixAt(count++,dummy.matrix);
 }rocks.count=count;rocks.name='weathered-outcrop-fragments';rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);return rocks;
}
export function createEnvironment(scene){
 const groundMat=new THREE.MeshStandardNodeMaterial({roughness:1});
 const fine=mx_noise_float(positionWorld.mul(35)).mul(.16).add(1),soil=mx_noise_float(positionWorld.mul(4.1)).mul(.14).add(1);
 const base=attribute('color','vec3'),brightness=base.dot(vec3(.2126,.7152,.0722)).mul(3.8).add(.18);
 const frost=seasonUniforms.frost.mul(normalWorld.y.smoothstep(.65,.96)).mul(mx_noise_float(positionWorld.mul(1.4)).mul(.5).add(.7).clamp());
 groundMat.colorNode=mix(seasonUniforms.ground.mul(brightness),color('#e3e8e4'),frost).mul(fine).mul(soil);
 const ground=new THREE.Mesh(terrainGeometry(),groundMat);ground.name='contoured-near-and-far-banks';ground.receiveShadow=true;scene.add(ground);
 const water=createRiver(scene,motionTime),river=water.river;
 const plants=createDiversePlants(scene,motionTime),pebbles=addPebbles(scene),outcrops=addErodedRockGroups(scene);
 return {ground,river,plants,pebbles,outcrops,report:{terrain:'v13: continuous side and foreground meadow, peripheral rolling terrain, rocky distant escarpments and faster clear current',water:water.report,rockFragments:outcrops.count,vegetation:plants.report}};
}
export {createWillowFoliage} from './willow.js';
