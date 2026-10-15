import {seasonalFoliage,prepareLeafSeasons} from './seasons.js';
import * as THREE from 'three/webgpu';
import {positionLocal,sin,vec3,attribute} from 'three/tsl';
import {MeshBuilder,tube,leaf} from './vendor/fabotanic/geometry.js';
import {rng,bezier,V} from './vendor/fabotanic/math.js';
import {convert} from './plants.js';

// Attach structural branches to actual T01 bark, in normalized tree coordinates.
export function willowAnchors(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),candidates=[];
 root.traverse(o=>{if(o.isMesh){const matrix=inverse.clone().multiply(o.matrixWorld),a=o.geometry.attributes.position;
  for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(matrix);if(p.y>4.5&&p.y<7.25)candidates.push(p);}
 }});
 const selected=[];
 for(let i=0;i<32;i++){
  const angle=i*2.39996,targetHeight=5.65+(i%4)*.40,dx=Math.cos(angle),dz=Math.sin(angle),radius=i<24?1.3+(i%5)*.62:4.6+(i%3)*.7;
  let best=null,score=-Infinity;
  for(const p of candidates){if(selected.some(a=>a.point.distanceToSquared(p)<.44**2))continue;
   const s=-((p.x-dx*radius)**2+(p.z-dz*radius*.65)**2)*.5-(p.y-targetHeight)**2*2;
   if(s>score){best=p;score=s;}
  }
  if(best)selected.push({point:best,angle});
 }
 // Actual high twig tips receive short leafy leaders, not another long bough.
 const tips=[...candidates].sort((a,b)=>b.y-a.y);let crowns=0;
 for(const p of tips){
  if(p.y<6.05||crowns>=14)break;
  if(selected.filter(a=>a.crown).some(a=>a.point.distanceToSquared(p)<.75**2))continue;
  selected.push({point:p,angle:Math.atan2(p.z,p.x),crown:true});crowns++;
 }
 return selected;
}

export function createWillowFoliage(scene,root,clock){
 if(!root)throw new Error('Willow branches require the loaded T01 bark mesh');
 const anchors=willowAnchors(root),random=rng(3197),wood=new MeshBuilder('willow-tapered-branches'),foliage=new MeshBuilder('willow-lanceolate-leaves');
 const wind=new Map([[wood,{weight:[],phase:[]}],[foliage,{weight:[],phase:[]}]]);let twigCount=0,leafCount=0;
 function stamp(builder,start,weight,phase){const w=wind.get(builder);for(let i=start;i<builder.p.length/3;i++){w.weight[i]=typeof weight==='function'?weight(builder.uv[i*2+1]):weight;w.phase[i]=phase;}}
 function branch(path,radius,segments,baseWeight,tipWeight,phase){const start=wood.p.length/3;tube(wood,path,radius,radius*.12,segments,radius>.025?6:3,[.34,.30,.21]);stamp(wood,start,t=>baseWeight+(tipWeight-baseWeight)*t*t,phase);}
 function leaves(path,length,baseWeight,tipWeight,phase){
  let t=.06,index=0;
  while(t<.98){
   const p=path(t),a=phase+(index%2?Math.PI:0)+(random()-.5)*1.25,L=.13+random()*.14;
   const reach=L*(.30+random()*.42),drop=L*(.65+random()*.32),dx=Math.cos(a),dz=Math.sin(a),side=[-dz,0,dx];
   const end=V.add(p,[dx*reach,-drop,dz*reach]);
   const curve=u=>bezier(p,V.add(p,[dx*reach*.9,-drop*.12,dz*reach*.9]),V.add(end,[0,drop*.40,0]),end,u);
   const start=foliage.p.length/3,tone=.80+random()*.35;
   leaf(foliage,{path:curve,side,width:L*(.075+random()*.035),segments:4,across:2,fold:.16,curl:.025,profile:.85,color:[.45*tone,.46*tone,.28*tone]});
   const weight=baseWeight+(tipWeight-baseWeight)*t*t;stamp(foliage,start,u=>weight+u*u*.09,phase);
   leafCount++;index++;t+=(.040+random()*.028)/length;
  }
 }
 function pendant(start,angle,length,baseWeight,phase){
  const dx=Math.cos(angle),dz=Math.sin(angle),reach=.12+random()*.55;
  length=Math.min(length,start[1]-(2.45+random()*.65));if(length<.35)return;
  const end=V.add(start,[dx*reach,-length,dz*reach]);
  const path=t=>bezier(start,V.add(start,[dx*reach*.8,-length*.12,dz*reach*.8]),V.add(end,[-dx*.15,length*.36,-dz*.15]),end,t);
  branch(path,.004+random()*.003,9,baseWeight,baseWeight+.8,phase);leaves(path,length,baseWeight,baseWeight+.8,phase);twigCount++;
  if(random()<.55){
   const u=.35+random()*.25,base=path(u),forkAngle=angle+(random()<.5?-1:1)*(.5+random()*.9),L=length*(1-u)*(.55+random()*.3);
   const tip=V.add(base,[Math.cos(forkAngle)*.30,-L,Math.sin(forkAngle)*.30]);
   const fork=t=>bezier(base,V.add(base,[Math.cos(forkAngle)*.18,-L*.18,Math.sin(forkAngle)*.18]),V.add(tip,[0,L*.30,0]),tip,t);
   const w=baseWeight+.8*u*u;branch(fork,.003,6,w,w+.45,phase);leaves(fork,L,w,w+.45,phase);twigCount++;
  }
 }
 for(let i=0;i<anchors.length;i++){
  const {point,angle,crown}=anchors[i],start=point.toArray(),phase=random()*6.28;
  if(crown){
   // Compact, uneven leaf masses at the retained twig tips. Their slightly
   // rising leaders fill the crown ridge while openings remain between masses.
   for(let j=0;j<7;j++){
    const a=angle+(j-3)*.55+(random()-.5)*.4,L=.6+random()*.85,dx=Math.cos(a),dz=Math.sin(a);
    const tip=V.add(start,[dx*L,-.22-random()*.55,dz*L]);
    const leader=t=>bezier(start,V.add(start,[dx*L*.18,.20+L*.12,dz*L*.18]),V.add(tip,[-dx*.15,.32,-dz*.15]),tip,t);
    branch(leader,.010+random()*.007,9,0,.25,phase);leaves(leader,L*1.1,0,.25,phase);
    for(let k=0;k<4;k++){const u=.24+k*.19;pendant(leader(u),a+(random()-.5)*1.3,.50+random()*.80,.25*u*u,phase);}
   }
   continue;
  }
  // Unequal, weight-bearing boughs. Most tips fall below their attachment;
  // only a few short shoots rise through the crown. No repeated umbrella arcs.
  const a0=angle+(random()-.5)*.5,dx=Math.cos(a0),dz=Math.sin(a0);
  const reach=1.35+random()*2.25,drop=.45+random()*1.1,bend=(random()-.5)*1.0;
  const end=V.add(start,[dx*reach-dz*bend,-drop,dz*reach*.82+dx*bend]);
  const primary=t=>bezier(start,V.add(start,[dx*reach*.30,.08+.18*Math.sin(i*1.71),dz*reach*.25]),V.add(end,[-dx*reach*.23,drop*.43,-dz*reach*.2]),end,t);
  branch(primary,.028+random()*.022,14,0,.22,phase);
  const upperCount=6+Math.floor(random()*5);
  for(let k=0;k<upperCount;k++){
   const u=.10+(k+.3+random()*.5)/upperCount*.85;
   pendant(primary(u),a0+(random()-.5)*2.4,.55+random()*1.1,.22*u*u,phase);
  }
  const branches=3+Math.floor(random()*3);
  for(let b=0;b<branches;b++){
   const u=.16+(b+.25+random()*.4)/branches*.75,base=primary(u),a=a0+(b%2?1:-1)*(.5+random()*.7),L=.65+random()*1.35;
   const tip=V.add(base,[Math.cos(a)*L,-.28-random()*.75,Math.sin(a)*L*.85]);
   const secondary=t=>bezier(base,V.add(base,[Math.cos(a)*L*.3,-.02,Math.sin(a)*L*.3]),V.add(tip,[-Math.cos(a)*L*.18,.18,-Math.sin(a)*L*.18]),tip,t);
   const w=.22*u*u;branch(secondary,.016+random()*.009,9,w,w+.24,phase);
   const count=7+Math.floor(random()*5),curtain=.8+random()*1.25;
   for(let k=0;k<count;k++){const v=.08+(k+.15+random()*.55)/count*.88;pendant(secondary(v),a+(random()-.5)*1.6,curtain*(.55+random()*.75),w+.24*v*v,phase);}
  }
 }
 const group=new THREE.Group();group.name='willow-connected-branches';
 for(const builder of [wood,foliage]){
  const geometry=convert(builder),w=wind.get(builder);geometry.setAttribute('aWindWeight',new THREE.Float32BufferAttribute(w.weight,1));geometry.setAttribute('aWindPhase',new THREE.Float32BufferAttribute(w.phase,1));
  const mat=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:builder===wood?.96:.82,side:THREE.DoubleSide});
  if(builder===foliage){prepareLeafSeasons(geometry);seasonalFoliage(mat,{deciduous:true});}
  const phase=attribute('aWindPhase'),weight=attribute('aWindWeight');
  mat.positionNode=positionLocal.add(vec3(sin(clock.mul(.72).add(phase)).mul(weight).mul(.045),0,sin(clock.mul(.57).add(phase)).mul(weight).mul(.027)));
  const mesh=new THREE.Mesh(geometry,mat);mesh.name=builder.name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 root.add(group);
 const report={anchors:anchors.length,structuralAnchors:anchors.filter(a=>!a.crown).length,crownTipAnchors:anchors.filter(a=>a.crown).length,silhouette:'unequal descending boughs, clustered curtains, compact leafy leaders on actual twig tips',pendants:twigCount,leaves:leafCount,woodTriangles:wood.idx.length/3,leafTriangles:foliage.idx.length/3,attachment:'actual normalized T01 bark vertices',wind:'shared branch phase and inherited weights; structural roots pinned',source:'hierarchical tapered branches and narrow curved leaves; editable Blender snapshot'};
 group.userData.report=report;return group;
}
