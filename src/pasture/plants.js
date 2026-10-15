import * as THREE from 'three/webgpu';
import {palmateLeaf} from './palmate-leaf.js';
import {seasonalFoliage,prepareLeafSeasons,seasonUniforms} from './seasons.js';
import {positionLocal,positionWorld,sin,vec3,mix,color,attribute} from 'three/tsl';
import {MeshBuilder,leaf,tube} from './vendor/fabotanic/geometry.js';
import {V,rng,bezier} from './vendor/fabotanic/math.js';
import {groundHeight,shoreZ,farShoreZ,actorClearance,rockPlacements,smooth} from './spatial.js';

// Morphology groups are art-direction categories, not historical species identifications.
export const plantProfiles={
 meadow:{name:'弯叶草丛',count:19000,seed:701},
 sedge:{name:'岸缘窄叶草',count:440,seed:709},
 rosette:{name:'贴地阔叶',count:1700,seed:719},
 fern:{name:'林下羽状叶',count:140,seed:727},
 shrub:{name:'赭绿小叶灌木',count:225,seed:733},
 russet:{name:'掌裂红叶灌木',count:22,seed:739}
};
export function patchDensity(x,z){
 const waves=.42+.34*Math.sin(x*.9+Math.sin(z*.9))*Math.cos(z*1.1)+.22*Math.sin(x*2.4-z*.6)+.09*Math.sin(x*5.3+z*3.4);
 return Math.max(.04,Math.min(1,waves));
}
export function plantAllowed(type,x,z){
 const shore=shoreZ(x),far=farShoreZ(x),near=z>shore+.12,opposite=z<far-.18;
 if(!near&&!opposite)return false;
 if(near&&actorClearance(x,z)<(type==='shrub'||type==='russet'?1.55:1.08))return false;
 if(near&&Math.hypot((x-3.4)/.9,(z-.8)/.85)<1)return false;
 if(near&&rockPlacements.some(r=>Math.hypot((x-r.x)/(r.scale*.9),(z-r.z)/(r.scale*1.4))<1))return false;
 return true;
}
export function createPlantLayout(type,count=plantProfiles[type].count,seed=plantProfiles[type].seed){
 const random=rng(seed),items=[];
 for(let attempt=0;items.length<count&&attempt<count*120;attempt++){
  let x=-19+random()*38,z=-5+random()*20;
  if(type==='sedge'){z=shoreZ(x)+.16+random()*.9;if(random()<.3)z=farShoreZ(x)-.2-random()*.8;}
  if(type==='fern'){x=1.5+random()*5;z=-.7+random()*4;}
  if(type==='shrub'||type==='russet'){
   const regions=type==='russet'?[[-10.1,-2.5,1.1,1.4],[4.8,.1,1.2,1.0]]:[[-11.7,-1.5,3.5,5],[4.7,-.4,1.2,2],[10.4,-1.7,2,1.8],[-1.5,7.4,9,1.2]];
   const [cx,cz,rx,rz]=regions[type==='russet'?items.length%2:Math.floor(random()*regions.length)];x=cx+(random()-.5)*rx;z=cz+(random()-.5)*rz;
  }
  if(!plantAllowed(type,x,z))continue;
  if(type==='meadow'&&random()>.3+.7*patchDensity(x,z))continue;
  if(type==='rosette'&&random()>.18+patchDensity(x,z)*.55)continue;
  items.push({x,z,y:groundHeight(x,z)-.009,yaw:random()*Math.PI*2,scale:.6+random()*.65,variant:items.length%3});
 }
 return items;
}
export function createMeadowExtensionLayout(){
 const random=rng(13917),items=[];
 // Stratified cells prevent large bald holes. Overlap the old field instead of
 // extending its hard rectangular edge; further cells use a wider spacing.
 for(let x=-29.6;x<29.6;x+=.28)for(let d=.25;d<62;d+=d<37?.28:.42){
  const px=x+(random()-.5)*.23,z=shoreZ(px)+d+(random()-.5)*.23;
  if(Math.abs(px)<17.5&&z<13)continue;
  if(!plantAllowed('meadow',px,z))continue;
  items.push({x:px,z,y:groundHeight(px,z)-.009,yaw:random()*Math.PI*2,scale:.85+random()*.50,variant:items.length%3});
 }
 return items;
}
export function convert(builder){const data=builder.finish(),g=new THREE.BufferGeometry(),c=new THREE.Color();for(let i=0;i<data.colors.length;i+=3){c.setRGB(data.colors[i],data.colors[i+1],data.colors[i+2],THREE.SRGBColorSpace);data.colors[i]=c.r;data.colors[i+1]=c.g;data.colors[i+2]=c.b;}g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));g.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2));g.setAttribute('color',new THREE.BufferAttribute(data.colors,3));g.setIndex(new THREE.BufferAttribute(data.indices,1));return g;}
export function curvedLeaf(builder,base,angle,length,width,lift,color,segments=4){
 const direction=[Math.cos(angle),0,Math.sin(angle)],side=[-direction[2],0,direction[0]];
 const path=t=>V.add(base,[direction[0]*length*t*t,Math.sin(t*Math.PI*.67)*length*lift,direction[2]*length*t*t]);
 leaf(builder,{path,side,width,segments,across:1,fold:.13,curl:.09,profile:.8,color});
}
export function makeGroundPrototype(type,seed){
 const random=rng(seed),b=new MeshBuilder(type),colors={meadow:[.46,.43,.26],sedge:[.36,.42,.25],rosette:[.40,.40,.24],fern:[.32,.39,.22]};
 const base=colors[type]||[.42,.43,.24];
 if(type==='fern'){
  for(let f=0;f<5;f++){
   const angle=f*2.399+random()*.2,length=.3+random()*.28,dir=[Math.cos(angle),0,Math.sin(angle)];
   const path=t=>[dir[0]*length*t,Math.sin(t*Math.PI*.8)*length*.6,dir[2]*length*t];tube(b,path,.004,.001,5,3,base);
   for(let j=1;j<9;j++)for(const side of [-1,1]){const t=j/10,p=path(t);curvedLeaf(b,p,angle+side*1.0,(.09*(1-t)+.02),.026,.25,base,3);}
  }
 }else{
  const count=type==='meadow'?8:type==='sedge'?9:6;
  for(let i=0;i<count;i++){
   const angle=i*2.399+random()*.5,L=type==='meadow'?.20+random()*.27:type==='sedge'?.32+random()*.32:.13+random()*.15;
   const width=type==='meadow'?.034+random()*.024:type==='sedge'?.012:.075;
   curvedLeaf(b,[(random()-.5)*.035,0,(random()-.5)*.035],angle,L,width,type==='rosette'?.3:type==='sedge'?1.1:.55,base.map(v=>v*(.85+random()*.3)),type==='rosette'?5:type==='meadow'?2:4);
  }
 }
 return convert(b);
}
function twigLeaves(builder,path,seed,tint,count=9,size=.14,palmate=false){
 const random=rng(seed);
 for(let j=0;j<count;j++){
  const t=.2+j/count*.75,angle=j*2.399+random()*.3,p=path(t);
  if(palmate){palmateLeaf(builder,p,angle,size*(1.3+random()*.4),tint.map(v=>v*(.8+random()*.35)));continue;}
  curvedLeaf(builder,p,angle,size*(.75+random()*.45),size*.44,.55+random()*.85,tint.map(v=>v*(.8+random()*.35)),4);
 }
}
export function makeWoodyPrototype(seed,{height=1,red=false,tree=false,leaves=true}={}){
 const random=rng(seed),wood=new MeshBuilder('bark'),foliage=new MeshBuilder('leaf'),bark=[.29,.24,.16],tint=red?[.48,.19,.085]:[.43,.43,.22];
 const end=[height*.25,height,height*.05];
 const trunk=t=>bezier([0,0,0],[-height*.14,height*.25,-height*.035],[height*.22,height*.7,height*.08],end,t);
 tube(wood,trunk,height*(tree?.052:.019),.007,tree?10:5,tree?8:5,bark);
 if(tree)for(let r=0;r<5;r++){const a=r*2.399;const root=t=>[Math.cos(a)*height*.19*(1-t),.03+height*.13*t,Math.sin(a)*height*.19*(1-t)];tube(wood,root,.012,height*.04,4,5,bark);}
 const branchCount=tree?10:6;
 for(let k=0;k<branchCount;k++){
  const origin=trunk(.25+k/branchCount*.66),angle=k*2.399+random()*.7,reach=height*.43*(1-k/branchCount*.3)*(.7+random()*.5),up=height*(.11+random()*.17);
  const tip=V.add(origin,[Math.cos(angle)*reach,up,Math.sin(angle)*reach*.8]);
  const branch=t=>bezier(origin,V.add(origin,[0,up*.5,0]),V.add(tip,[0,-up*.1,0]),tip,t);
  tube(wood,branch,height*(tree?.017:.006)*(1-k/branchCount*.4),.003,5,tree?5:3,bark);
  for(let j=0;j<(tree?7:2);j++){
   const a=angle+(j%2?1:-1)*(.6+j*.07),start=branch(.28+j*(tree?.10:.16)),len=reach*(tree?.6:.47);
   const sub=t=>V.add(start,[Math.cos(a)*len*t,up*.65*t+Math.sin(t*Math.PI)*.04,Math.sin(a)*len*t]);
   tube(wood,sub,tree?.015:.004,.0015,3,3,bark);
   if(leaves)twigLeaves(foliage,sub,seed+k*137+j*17,tint,tree?23:red?7:12,tree?.28:red?.105:.15,red);
  }
 }
 return {wood:convert(wood),leaf:leaves?convert(foliage):null};
}
export function leafMaterial(clock,deciduous=false){
 const mat=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:.96,side:THREE.DoubleSide});
 // Root displacement is zero; coherent plant motion, with small individual leaf flutter.
 const weight=positionLocal.y.max(0).mul(.025);
 mat.positionNode=positionLocal.add(vec3(sin(clock.mul(.75).add(positionWorld.x.mul(.7))).mul(weight),0,sin(clock.mul(.9).add(positionWorld.z)).mul(weight.mul(.5))));return seasonalFoliage(mat,{deciduous});
}
function makeDistantCrown(seed,height){
 const random=rng(seed),wood=new MeshBuilder('distant-branches'),foliage=new MeshBuilder('distant-crown');
 const bark=[.40,.39,.31];
 tube(wood,t=>[.08*height*t,height*.8*t,0],height*.03,.007,5,4,bark);
 for(let c=0;c<6;c++){
  const angle=c*2.399,center=[Math.cos(angle)*height*.32,height*(.64+random()*.25),Math.sin(angle)*height*.28];
  tube(wood,t=>[.04*height*(1-t)+center[0]*t,.4*height*(1-t)+center[1]*t,center[2]*t],.014,.002,3,3,bark);
  for(let j=0;j<48;j++){
   const a=random()*6.28,u=random()*2-1,r=Math.cbrt(random()),s=Math.sqrt(1-u*u);
   const p=V.add(center,[Math.cos(a)*s*r*height*.34,u*r*height*.22,Math.sin(a)*s*r*height*.30]);
   const tone=.87+random()*.24;
   curvedLeaf(foliage,p,random()*6.28,height*(.14+random()*.10),height*.075,.4,[.45*tone,.46*tone,.34*tone],2);
  }
 }
 return {wood:convert(wood),leaf:convert(foliage)};
}
function batch(scene,geometry,material,items,label){
 const mesh=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();mesh.name=label;
 for(let i=0;i<items.length;i++){const p=items[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
 mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;mesh.userData.plantLayer=true;scene.add(mesh);return mesh;
}
export function createDiversePlants(scene,clock){
 const foliage=leafMaterial(clock),deciduous=leafMaterial(clock,true),woodMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),group=new THREE.Group();group.name='vegetation-diversity';scene.add(group);const report={profiles:{},treeCount:0,source:'FABOTANIC curved leaf / tube + deterministic patch composition'};
 const redFoliage=leafMaterial(clock,true);redFoliage.colorNode=mix(redFoliage.colorNode,color('#a74736').mul(attribute('color','vec3').dot(vec3(.2126,.7152,.0722)).mul(5).add(.6)),seasonUniforms.autumn);
 for(const [type,p]of Object.entries(plantProfiles)){
  const layout=createPlantLayout(type);report.profiles[type]={instances:layout.length,seed:p.seed};
  for(let variant=0;variant<3;variant++){
   const items=layout.filter(it=>it.variant===variant);if(!items.length)continue;
   if(type==='shrub'||type==='russet'){
    const proto=makeWoodyPrototype(p.seed+variant*19,{height:type==='russet'?1.22:.65,red:type==='russet'});
    batch(group,proto.wood,woodMat,items,type+'-wood');batch(group,prepareLeafSeasons(proto.leaf),type==='russet'?redFoliage:deciduous,items,type+'-leaf');
   }else batch(group,makeGroundPrototype(type,p.seed+variant*19),foliage,items,type);
  }
 }
 const extension=createMeadowExtensionLayout(),tiles=new Map();
 for(const item of extension){const key=Math.floor(item.x/8)+':'+Math.floor(item.z/8);if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(item);}
 const fieldGeometry=makeGroundPrototype('meadow',13931);
 for(const [key,items]of tiles)batch(group,fieldGeometry,foliage,items,'continuous-meadow-'+key);
 report.extendedMeadow={instances:extension.length,tiles:tiles.size,widthMeters:59.2,shoreDepthMeters:62,spacingMeters:[.28,.42]};
 // T02 is loaded separately from the supplied bare-branch GLB, with surface-attached foliage.
 // Overlapping pale crowns build the layered far-bank silhouette in the concept.
 const farRandom=rng(1221);let farCount=0;
 for(let layer=0;layer<3;layer++){
  const farItems=[];
  for(let i=0;i<100;i++){const x=-26+(i%12)*4.6+(farRandom()-.5)*3.5,z=farShoreZ(x)-.8-layer*3.2-farRandom()*1.8;farItems.push({x,z,y:groundHeight(x,z),yaw:farRandom()*6.28,scale:.55+farRandom()*.6});}
  const farProto=makeDistantCrown(1249+layer*29,1.4+layer*.20),farLeaf=leafMaterial(clock,true);farLeaf.colorNode=farLeaf.colorNode.mul(.70-layer*.05).add(seasonUniforms.sky.mul(.18+layer*.05));
  batch(group,farProto.wood,woodMat,farItems,'opposite-bank-twigs-'+layer);batch(group,prepareLeafSeasons(farProto.leaf),farLeaf,farItems,'opposite-bank-leaves-'+layer);farCount+=farItems.length;
 }
 report.oppositeBankGroups=farCount;report.culturalFoliage={instances:22,morphology:'five-lobed maple-like leaves',placement:'left rock slope and willow-root shrubs',autumn:'vermilion accents; spring/summer green; winter shed'};
 return {group,report};
}
