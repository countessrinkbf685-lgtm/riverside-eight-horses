import * as THREE from 'three/webgpu';
import {uniform,attribute,vec3,mix,positionWorld,normalWorld,mx_noise_float} from 'three/tsl';

export const seasonKeys=['spring','summer','autumn','winter'];
export const seasonPresets={
 spring:{name:'春 · 柳色新',leaf:'#849b4d',ground:'#889367',water:'#93cbb8',sky:'#d5dfd7',sun:'#fff0d4',bounce:'#969575',ridge:'#9daea5',density:.78,frost:0,autumn:0,sunPower:2.15,skyPower:1.25,exposure:1.02,sunPosition:[-9,15,9],fogNear:36,fogFar:100},
 summer:{name:'夏 · 水光长',leaf:'#53783e',ground:'#727b4d',water:'#73bcac',sky:'#d0e0df',sun:'#fff6e4',bounce:'#7a846b',ridge:'#8fa7a1',density:1,frost:0,autumn:0,sunPower:2.55,skyPower:1.15,exposure:.98,sunPosition:[-6,19,5],fogNear:40,fogFar:112},
 autumn:{name:'秋 · 岸草黄',leaf:'#a6974c',ground:'#918264',water:'#9cc7bd',sky:'#dcded3',sun:'#ffe3ba',bounce:'#9b896d',ridge:'#a4aea3',density:.86,frost:0,autumn:1,sunPower:2.15,skyPower:1.15,exposure:1.02,sunPosition:[-12,12,8],fogNear:34,fogFar:98},
 winter:{name:'冬 · 霜岸静',leaf:'#a29578',ground:'#b0aca0',water:'#aeced0',sky:'#d8e0e1',sun:'#f4f0e8',bounce:'#a2a9ad',ridge:'#a8b5bc',density:0,frost:.88,autumn:.3,sunPower:1.75,skyPower:1.35,exposure:1.04,sunPosition:[-15,9,7],fogNear:30,fogFar:90}
};
export const seasonUniforms={leaf:uniform(new THREE.Color()),ground:uniform(new THREE.Color()),water:uniform(new THREE.Color()),sky:uniform(new THREE.Color()),ridge:uniform(new THREE.Color()),density:uniform(.86),frost:uniform(0),autumn:uniform(1)};

// A seed is constant over an entire connected leaf, including its tip triangles.
// Dropping foliage therefore never leaves cut triangles or moving screen-door noise.
export function prepareLeafSeasons(geometry){
 const n=geometry.attributes.position.count,parent=new Uint32Array(n);
 for(let i=0;i<n;i++)parent[i]=i;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const index=geometry.index.array;
 for(let i=0;i<index.length;i+=3){const a=find(index[i]);parent[find(index[i+1])]=a;parent[find(index[i+2])]=a;}
 const seeds=new Float32Array(n);
 for(let i=0;i<n;i++){const h=Math.sin(find(i)*127.1+311.7)*43758.5453;seeds[i]=.015+(h-Math.floor(h))*.97;}
 geometry.setAttribute('aLeafSeason',new THREE.BufferAttribute(seeds,1));return geometry;
}
export function seasonalFoliage(material,{deciduous=false}={}){
 material.vertexColors=false;
 const luminance=attribute('color','vec3').dot(vec3(.2126,.7152,.0722)).mul(4.2).add(.25);
 const patch=mx_noise_float(positionWorld.mul(.7)).smoothstep(.05,.55).mul(seasonUniforms.autumn).mul(.55);
 const tone=mix(seasonUniforms.leaf,vec3(.48,.16,.038),patch).mul(luminance);
 const frost=seasonUniforms.frost.mul(normalWorld.y.smoothstep(.2,.9)).mul(deciduous?0:.75);
 material.colorNode=mix(tone,vec3(.73,.77,.76),frost);
 if(deciduous){material.alphaTest=.5;material.opacityNode=seasonUniforms.density.sub(attribute('aLeafSeason')).mul(40).add(.5).clamp();}
 material.userData.seasonalFoliage=true;material.userData.deciduous=deciduous;return material;
}
export function createSeasonController(applyAtmosphere,onChange=()=>{}){
 let phase=2,auto=false,transition=null;
 const colorKeys=['leaf','ground','water','sky','ridge'];
 function apply(){
  const index=Math.floor(phase),a=seasonPresets[seasonKeys[index]],b=seasonPresets[seasonKeys[(index+1)%4]],t=phase-index,s=t*t*(3-2*t),values={};
  for(const key of colorKeys)seasonUniforms[key].value.set(a[key]).lerp(new THREE.Color(b[key]),s);
  for(const key of ['density','frost','autumn'])seasonUniforms[key].value=THREE.MathUtils.lerp(a[key],b[key],s);
  for(const key of ['sunPower','skyPower','exposure','fogNear','fogFar'])values[key]=THREE.MathUtils.lerp(a[key],b[key],s);
  for(const key of ['sun','bounce'])values[key]=new THREE.Color(a[key]).lerp(new THREE.Color(b[key]),s);
  values.sunPosition=new THREE.Vector3(...a.sunPosition).lerp(new THREE.Vector3(...b.sunPosition),s);
  applyAtmosphere(values);onChange({phase,auto,key:seasonKeys[Math.floor(phase+.5)%4]});
 }
 return {
  setPhase(value){if(!Number.isFinite(value))throw new Error('Season phase must be finite');phase=((value%4)+4)%4;auto=false;transition=null;apply();},
  select(key,{instant=false}={}){const target=seasonKeys.indexOf(key);if(target<0)throw new Error('Unknown season: '+key);auto=false;if(instant){phase=target;transition=null;apply();}else{let delta=target-phase;if(delta>2)delta-=4;if(delta<-2)delta+=4;transition={from:phase,delta,elapsed:0};}},
  setAuto(value){auto=Boolean(value);transition=null;apply();},
  update(dt,running){if(!running)return;if(transition){transition.elapsed+=dt;const t=Math.min(1,transition.elapsed/3);phase=((transition.from+transition.delta*t)+4)%4;if(t===1)transition=null;apply();}else if(auto){phase=(phase+dt/45)%4;apply();}},
  get status(){return {phase,auto,transitioning:!!transition,key:seasonKeys[Math.floor(phase+.5)%4],cycleSeconds:180,density:seasonUniforms.density.value,frost:seasonUniforms.frost.value};},
  initialize:apply
 };
}
