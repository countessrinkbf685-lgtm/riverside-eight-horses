import * as THREE from 'three/webgpu';
import {attribute,mix,vec3,positionWorld,sin,mx_noise_float,color} from 'three/tsl';
import {seasonUniforms} from './seasons.js';
import {lightUniforms} from './light-uniforms.js';
import {sampleTime} from './time-of-day.js';

// A soft, neutral sky environment supplies broad reflections and shaded-side light.
// Direct sunlight is separate, so the seasonal sun never leaves a second baked sun.
function skyEnvironment(){
 const width=256,height=128,data=new Float32Array(width*height*4),c=new THREE.Color(),top=new THREE.Color('#abc4d6'),horizon=new THREE.Color('#e7e9dd'),earth=new THREE.Color('#797b68');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const elevation=Math.cos(y/(height-1)*Math.PI),az=x/width*Math.PI*2;
  if(elevation>=0)c.copy(horizon).lerp(top,Math.pow(elevation,.55));else c.copy(horizon).lerp(earth,Math.min(1,-elevation*4));
  const cloud=Math.max(0,Math.sin(az*3+elevation*9)*Math.sin(az*7-elevation*5))*.12*Math.max(0,elevation);
  c.multiplyScalar(1+cloud);const i=(y*width+x)*4;data[i]=c.r;data[i+1]=c.g;data[i+2]=c.b;data[i+3]=1;
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;return texture;
}
function ridgeHash(i,layer){const h=Math.sin(i*127.1+layer*83.7)*43758.5453;return h-Math.floor(h);}
export function mountainGeometry(layer){
 const p=[],shade=[],idx=[],cols=440;
 // Closely spaced height jumps form escarpments; broad ledges form sedimentary benches.
 const sections=[[0,0],[.12,.07],[.26,.39],[.40,.77],[.53,1],[.66,.97],[.685,.65],[.77,.63],[.795,.31],[.89,.29],[1,0]],rows=sections.length-1;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const x=-110+i*.5,[v,profile]=sections[j],u=x/3.3+layer*.71,k=Math.floor(u),f=u-k;
  const tooth=ridgeHash(k,layer)*(1-f)+ridgeHash(k+1,layer)*f;
  const peak=1.6+layer*.20+tooth*1.45+.18*Math.abs(Math.sin(x*1.13+layer));
  const spine=-29-layer*8+Math.sin(x*.09+layer)*1.6;
  const fracture=Math.sin(x*1.9+layer)*.11*profile;
  const buttress=(Math.sin(x*.91+layer)*.62+Math.sin(x*2.13+layer)*.16)*Math.sin(v*Math.PI);
  p.push(x,-.1+profile*peak+fracture,spine+(v-.5)*(13+layer*2)+buttress);
  shade.push(.91+.05*Math.sin(x*.63+layer)+.025*v);
  if(j<rows&&i<cols){const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
 }
 const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(p,3));indexed.setAttribute('aRidgeShade',new THREE.Float32BufferAttribute(shade,1));indexed.setIndex(idx);
 const g=indexed.toNonIndexed();indexed.dispose();g.computeVertexNormals();return g;
}
export function createAtmosphere(scene,renderer){
 const sky=skyEnvironment();scene.environment=sky;scene.environmentIntensity=.42;
 scene.background=new THREE.Color();scene.fog=new THREE.Fog('#dcded3',34,98);
 const hemi=new THREE.HemisphereLight('#e8f0e8','#9b896d',1.15);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffe3ba',2.15);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:15,bottom:-14,near:1,far:65});
 sun.shadow.bias=-.00022;sun.shadow.normalBias=.025;sun.shadow.radius=2.5;sun.shadow.intensity=.82;
 sun.target.position.set(0,0,0);scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight('#d9e9ef',.28);fill.position.set(8,7,-14);scene.add(fill);
 const moon=new THREE.DirectionalLight('#a8c8ef',.2);moon.position.set(10,14,6);scene.add(moon);
 moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);
 Object.assign(moon.shadow.camera,{left:-20,right:20,top:15,bottom:-14,near:1,far:65});
 moon.shadow.bias=-.00022;moon.shadow.normalBias=.025;moon.shadow.radius=3;moon.shadow.intensity=.65;
 scene.add(moon.target);
 let base=null,time={...sampleTime(8),hour:8};
 const nightSky=new THREE.Color('#263c58'),warmSky=new THREE.Color('#d5a68c'),sunTint=new THREE.Color('#ffb56c'),nightFill=new THREE.Color('#bfd4ef');
 function compose(){
  if(!base)return;
  const skyColor=lightUniforms.sky.value.copy(nightSky).lerp(base.sky,time.daylight).lerp(warmSky,time.warmth*.48);
  scene.background.copy(skyColor);scene.fog.color.copy(skyColor);
  scene.fog.near=base.fogNear;scene.fog.far=base.fogFar;
  const angle=(time.hour-6)/12*Math.PI;
  sun.position.set(-Math.cos(angle)*21,Math.max(.8,Math.sin(angle)*base.sunPosition.y*1.35),base.sunPosition.z);
  sun.color.copy(base.sun).lerp(sunTint,time.warmth*.8);sun.intensity=base.sunPower*time.sun;
  moon.position.set(Math.cos(angle)*18,Math.max(5,-Math.sin(angle)*19),8);
  moon.intensity=time.moon*2.2;
  hemi.color.copy(skyColor).lerp(nightFill,(1-time.daylight)*.55);
  hemi.groundColor.copy(base.bounce).lerp(nightFill,(1-time.daylight)*.6);hemi.intensity=base.skyPower*time.ambient*(1+(1-time.daylight)*.8);
  fill.color.copy(skyColor);fill.intensity=.28*time.ambient;
  scene.environmentIntensity=.42*time.reflection;
  lightUniforms.surface.value=.065+time.daylight*.935;
  renderer.toneMappingExposure=base.exposure*(.86+.14*time.daylight);
 }
 const mountains=new THREE.Group();mountains.name='faint-western-mountain-ridges';scene.add(mountains);
 for(let layer=2;layer>=0;layer--){
  const material=new THREE.MeshStandardNodeMaterial({roughness:1,flatShading:true,side:THREE.DoubleSide});
  const mist=positionWorld.y.smoothstep(.2,3.8).oneMinus().mul(.12).add(.03+layer*.12).clamp();
  const strata=sin(positionWorld.y.mul(24).add(mx_noise_float(positionWorld.mul(1.7)).mul(1.6))).smoothstep(-.92,-.35).mul(.15).add(.76);
  const joints=mx_noise_float(vec3(positionWorld.x.mul(3.7),positionWorld.y.mul(.35),positionWorld.z.mul(2.1))).smoothstep(-.32,.25).mul(.36).add(.64);
  const ink=mix(color('#667075'),seasonUniforms.ridge,.12).mul(attribute('aRidgeShade')).mul(strata).mul(joints);
  const frost=positionWorld.y.smoothstep(2.5,5).mul(seasonUniforms.frost).mul(.3);
  material.colorNode=mix(mix(ink,vec3(.76,.81,.82),frost),lightUniforms.sky,mist);
  const mesh=new THREE.Mesh(mountainGeometry(layer),material);mesh.name='mist-ridge-'+layer;mountains.add(mesh);
 }
 return {
  apply(values){base={...values,sky:seasonUniforms.sky.value.clone()};compose();},
  applyTime(values){time=values;compose();},
  get inspection(){return {hour:time.hour,sunIntensity:sun.intensity,moonIntensity:moon.intensity,sunPosition:sun.position.toArray(),sky:scene.background.getHexString(),environmentIntensity:scene.environmentIntensity,surfaceLight:lightUniforms.surface.value};},
  dispose(){sky.dispose();},
  report:{mountainRidges:3,lighting:'twelve traditional time periods, seasonal moving sun and PCF shadows, moonlight, sky / earth hemisphere and dimmable reflection environment',mountains:'Taihang-inspired stratified rocky escarpments, angular ridges and mist; art-directed geography'}
 };
}
