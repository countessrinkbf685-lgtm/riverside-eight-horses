import * as THREE from 'three/webgpu';
import {groundHeight,shoreZ} from './spatial.js';

const UP=new THREE.Vector3(0,1,0),PERIOD=2.4,SWING=.672;
const offsets={HL:0,FL:.6,HR:1.2,FR:1.8};
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*v*(10+v*(-15+6*v));};
// Integrate smooth start/stop velocity, so root position and velocity are continuous.
function travel(t,duration=14){
 const ramp=2,integral=u=>u*u*u-.5*u*u*u*u;
 if(t<=0)return 0;if(t>=duration)return 1;
 if(t<ramp)return ramp*integral(t/ramp)/(duration-ramp);
 if(t>duration-ramp)return 1-ramp*integral((duration-t)/ramp)/(duration-ramp);
 return (t-ramp*.5)/(duration-ramp);
}

export function createRiverWalk(root){
 const id=root.name;if(!['H04','H06'].includes(id))return null;
 const animation=root.userData.animation,report=root.userData.rigReport,model=root.children[0];
 const home=root.position.clone(),homeQ=root.quaternion.clone(),modelY=model.position.y,savedTime=animation.time;
 animation.evaluateClip('Neutral',0);root.updateMatrixWorld(true);
 let skin;root.traverse(o=>{if(o.isSkinnedMesh&&!o.name.includes('groom')&&(!skin||o.geometry.attributes.position.count>skin.geometry.attributes.position.count))skin=o;});
 skin.skeleton.update();const bones=Object.fromEntries(skin.skeleton.bones.map(b=>[b.name,b]));
 const invRoot=root.matrixWorld.clone().invert(),rest={};
 for(const [name,bone]of Object.entries(bones)){
  const m=invRoot.clone().multiply(bone.matrixWorld),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(p,q,s);rest[name]={p,q,s};
 }
 const legs={};
 for(const tag of Object.keys(offsets)){
  const top=rest[tag+'Upper'].p,knee=rest[tag+'Lower'].p,ankle=rest[tag+'Pastern'].p,toe=rest[tag+'Hoof'].p;
  const hoofQ=rest[tag+'Hoof'].q,localSoles=[];
  const hoofInverse=bones[tag+'Hoof'].matrixWorld.clone().invert();
  for(const index of skin.userData.soleTags[tag])localSoles.push(skin.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(skin.matrixWorld).applyMatrix4(hoofInverse));
  const axis=ankle.clone().sub(top).normalize(),pole=knee.clone().sub(top);pole.addScaledVector(axis,-pole.dot(axis));
  if(pole.length()<.001)pole.set(tag[0]==='F'?1:-1,0,0);
  legs[tag]={top,knee,ankle,toe,l1:top.distanceTo(knee),l2:knee.distanceTo(ankle),pole,localSoles,ankleInHoof:ankle.clone().sub(toe).applyQuaternion(hoofQ.clone().invert())};
 }
 const direction=id==='H04'?-1:1,length=id==='H04'?1.05:1.2,delay=id==='H06'?1.2:0;
 const duration=14,prepare=2,finish=duration+PERIOD+SWING+delay+prepare;let entryPose=null;
 function route(t){
  const u=travel(t,duration),x=home.x+direction*length*u,z=home.z+.10*Math.sin(Math.PI*u)**2;
  const heading=Math.atan2(.10*Math.PI*Math.sin(2*Math.PI*u),direction*length);
  return {position:new THREE.Vector3(x,groundHeight(x,z),z),quaternion:new THREE.Quaternion().setFromAxisAngle(UP,-heading)};
 }
 const landingCache=new Map();
 function landing(tag,t){
  const key=tag+':'+Math.max(0,Math.min(duration,t)).toFixed(6);if(landingCache.has(key))return landingCache.get(key);
  const leg=legs[tag],r=route(t),toe=leg.toe.clone().applyQuaternion(r.quaternion).add(r.position),e=.015;
  const normal=new THREE.Vector3(-(groundHeight(toe.x+e,toe.z)-groundHeight(toe.x-e,toe.z))/(2*e),1,-(groundHeight(toe.x,toe.z+e)-groundHeight(toe.x,toe.z-e))/(2*e)).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(UP,normal).multiply(r.quaternion).multiply(rest[tag+'Hoof'].q);
  // Fit the actual sole shell against the CPU terrain, rather than a bone pivot.
  let y=-Infinity;
  for(const p of leg.localSoles){const d=p.clone().applyQuaternion(q);y=Math.max(y,groundHeight(toe.x+d.x,toe.z+d.z)-d.y);}
  toe.y=y+.0005;const result={toe,q};landingCache.set(key,result);return result;
 }
 const initial={};for(const tag of Object.keys(legs))initial[tag]=landing(tag,0);
 function footAt(tag,t){
  const offset=offsets[tag],last=Math.ceil((duration-offset)/PERIOD),n=Math.floor((t-offset)/PERIOD);
  if(n<0)return {...initial[tag],support:true};
  const index=Math.min(n,last),start=offset+index*PERIOD,u=clamp((t-start)/SWING);
  const previous=index===0?initial[tag]:landing(tag,offset+(index-1)*PERIOD+SWING+(PERIOD-SWING)*.5);
  const next=landing(tag,start+SWING+(PERIOD-SWING)*.5);
  if(u>=1)return {...next,support:true};
  return {toe:previous.toe.clone().lerp(next.toe,ease(u)).addScaledVector(UP,.075*Math.sin(Math.PI*u)**2),q:previous.q.clone().slerp(next.q,ease(u)),support:false};
 }
 function setWorld(name,p,q){
  const bone=bones[name],m=new THREE.Matrix4().compose(p,q,rest[name].s).premultiply(bone.parent.matrixWorld.clone().invert());
  m.decompose(bone.position,bone.quaternion,bone.scale);bone.updateMatrixWorld(true);
 }
 function segment(name,a,b){
  const child=name.endsWith('Upper')?name.replace('Upper','Lower'):name.endsWith('Lower')?(bones[name.replace('Lower','Cannon')]?name.replace('Lower','Cannon'):name.replace('Lower','Pastern')):name.endsWith('Cannon')?name.replace('Cannon','Pastern'):name.replace('Pastern','Hoof');
  const original=rest[child].p.clone().sub(rest[name].p).applyQuaternion(root.quaternion).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(original,b.clone().sub(a).normalize()).multiply(root.quaternion).multiply(rest[name].q);setWorld(name,a,q);
 }
 const walk={enabled:false,time:0,finish,phase:'Ready',contacts:{},maxReachError:0,
  start(){entryPose=Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,{p:b.position.clone(),q:b.quaternion.clone()}]));walk.enabled=true;walk.evaluate(0);},
  reset(){walk.enabled=false;walk.time=0;walk.phase='Ready';root.position.copy(home);root.quaternion.copy(homeQ);model.position.y=modelY;root.userData.supportFeet=null;animation.evaluate(savedTime);root.updateMatrixWorld(true);},
  evaluate(time){
   walk.time=time;const t=Math.max(0,time-delay-prepare),r=route(t),bodyBlend=ease(t/1.5)*(1-ease((t-duration-1)/2));
   root.position.copy(r.position);root.quaternion.copy(r.quaternion);model.position.y=modelY-.06*bodyBlend;
   animation.evaluateClip('Idle',t);
   if(entryPose&&time<prepare){const f=ease(time/prepare);for(const [name,b]of Object.entries(bones)){b.position.lerpVectors(entryPose[name].p,b.position,f);b.quaternion.slerpQuaternions(entryPose[name].q,b.quaternion,f);}}
   root.updateMatrixWorld(true);walk.maxReachError=0;walk.contacts={};
   for(const [tag,leg]of Object.entries(legs)){
    const foot=footAt(tag,t),ankle=leg.ankleInHoof.clone().applyQuaternion(foot.q).add(foot.toe),top=bones[tag+'Upper'].getWorldPosition(new THREE.Vector3());
    const axis=ankle.clone().sub(top),rawDistance=axis.length();axis.normalize();const dist=Math.min(rawDistance,leg.l1+leg.l2-1e-7);
    walk.maxReachError=Math.max(walk.maxReachError,rawDistance-leg.l1-leg.l2);
    const along=(leg.l1**2-leg.l2**2+dist**2)/(2*dist),pole=leg.pole.clone().applyQuaternion(root.quaternion);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
    const knee=top.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,leg.l1**2-along**2)));
    segment(tag+'Upper',top,knee);
    if(bones[tag+'Cannon']){const ratio=rest[tag+'Lower'].p.distanceTo(rest[tag+'Cannon'].p)/leg.l2,cannon=knee.clone().lerp(ankle,ratio);segment(tag+'Lower',knee,cannon);segment(tag+'Cannon',cannon,ankle);}
    else segment(tag+'Lower',knee,ankle);
    segment(tag+'Pastern',ankle,foot.toe);setWorld(tag+'Hoof',foot.toe,foot.q);
    walk.contacts[tag]={support:foot.support,target:foot.toe.toArray()};
   }
   root.userData.supportFeet=Object.keys(walk.contacts).filter(tag=>walk.contacts[tag].support);
   walk.phase=time<prepare?'Preparing':time<delay+prepare?'Waiting':t<duration?'Walking':time<finish?'Settling':'Arrived';
   animation.active=walk.phase==='Arrived'?'RiverStand':'RiverWalk';animation.time=time;animation.mixer.time=time;skin.skeleton.update();
  },
  measure(){
   root.updateMatrixWorld(true);skin.skeleton.update();const feet={};
   for(const [tag,indices]of Object.entries(skin.userData.soleTags)){
    const points=indices.map(i=>skin.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(skin.matrixWorld));
    feet[tag]={support:walk.contacts[tag]?.support??true,points:points.map(p=>p.toArray()),clearances:points.map(p=>p.y-groundHeight(p.x,p.z))};
   }
   return {phase:walk.phase,time:walk.time,root:root.position.toArray(),maxReachError:walk.maxReachError,bankClearance:root.position.z-shoreZ(root.position.x),feet};
  }
 };
 const update=animation.update.bind(animation);animation.update=dt=>walk.enabled?walk.evaluate(walk.time+dt):update(dt);
 animation.evaluate(savedTime);return walk;
}
