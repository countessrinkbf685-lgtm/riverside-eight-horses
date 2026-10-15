import * as THREE from 'three/webgpu';
import {positionWorld,positionLocal,attribute,uv,sin,cos,vec3,mix,color,mx_noise_float} from 'three/tsl';
import {shoreZ,farShoreZ,seededRandom} from './spatial.js';
import {seasonUniforms} from './seasons.js';
import {lightUniforms} from './light-uniforms.js';

export function riverDepth(x,t){return .025+Math.pow(Math.sin(Math.PI*t),.85)*(.72+.12*Math.sin(x*.28))+.035*Math.sin(x*2.2+t*19)*Math.sin(Math.PI*t);}
export function riverGeometry(bed=false){
 const p=[],uvs=[],depth=[],indices=[],cols=480,rows=48;
 for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++){
  const x=-30+i*.125,t=j/rows,z=THREE.MathUtils.lerp(shoreZ(x),farShoreZ(x),t),d=riverDepth(x,t);
  p.push(x,bed?.006-d:.006,z);uvs.push((x+30)/60,t);depth.push(d);
  if(i<cols&&j<rows){const a=i*(rows+1)+j,b=a+rows+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('aWaterDepth',new THREE.Float32BufferAttribute(depth,1));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function createRiver(scene,clock){
 const group=new THREE.Group();group.name='yongding-clear-river';scene.add(group);
 const bedMat=new THREE.MeshStandardNodeMaterial({roughness:.92});
 const grit=mx_noise_float(positionWorld.mul(32)).mul(.13).add(.93);
 const sand=mx_noise_float(positionWorld.mul(2.8)).mul(.5).add(.5);
 const caustic=sin(positionWorld.x.mul(6.2).add(sin(positionWorld.z.mul(4.1).add(clock.mul(1.2))).mul(2)).add(clock.mul(1.6))).add(cos(positionWorld.z.mul(8.3).add(sin(positionWorld.x.mul(3.7).sub(clock.mul(1.1)))))).abs().oneMinus().max(0).pow(10);
 bedMat.colorNode=mix(color('#b2ad91'),color('#397a76'),attribute('aWaterDepth').smoothstep(.03,.85)).mul(grit).mul(sand.mul(.12).add(.94));
 bedMat.emissiveNode=color('#b8e5c6').mul(caustic).mul(.042).mul(lightUniforms.surface);
 const bed=new THREE.Mesh(riverGeometry(true),bedMat);bed.name='visible-sculpted-riverbed';bed.receiveShadow=true;group.add(bed);
 const random=seededRandom(3401),pebbles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({roughness:.8}),1250),dummy=new THREE.Object3D();
 for(let i=0;i<pebbles.count;i++){
  const x=-29+random()*58,t=.018+random()*.964,z=THREE.MathUtils.lerp(shoreZ(x),farShoreZ(x),t),r=.025+random()**2*.12;
  dummy.position.set(x,.006-riverDepth(x,t)+r*.20,z);dummy.scale.set(r*1.4,r*.44,r);dummy.rotation.set(random()*.3,random()*6.28,random()*.3);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);pebbles.setColorAt(i,new THREE.Color().setHSL(.11+random()*.08,.10+random()*.13,.22+random()*.22));
 }
 pebbles.name='submerged-rounded-pebbles';pebbles.receiveShadow=true;group.add(pebbles);
 const waterMat=new THREE.MeshPhysicalNodeMaterial({transmission:1,ior:1.333,thickness:.5,roughness:.055,metalness:0,attenuationColor:'#81c9b0',attenuationDistance:2.2,envMapIntensity:1.0,side:THREE.DoubleSide});
 const x=positionWorld.x,z=positionWorld.z,t=clock,across=uv().y;
 const phase=x.mul(5.4).add(across.mul(3.6)).sub(t.mul(7.56));
 const crossPhase=x.mul(9).sub(across.mul(16)).sub(t.mul(11.8));
 const edge=sin(across.mul(Math.PI)).max(0);
 const turbulence=mx_noise_float(vec3(x.sub(t.mul(1.4)).mul(2.1),across.mul(18),0));
 const height=sin(phase).mul(.045).add(sin(crossPhase).mul(.018)).add(turbulence.mul(.006)).mul(edge);
 waterMat.positionNode=positionLocal.add(vec3(0,height,0));
 waterMat.normalNode=vec3(cos(phase).mul(.15).add(cos(crossPhase).mul(.07)).mul(edge),sin(crossPhase).mul(.085).mul(edge),1).normalize();
 waterMat.colorNode=mix(color('#f1fff5'),seasonUniforms.water,attribute('aWaterDepth').mul(.38));
 waterMat.thicknessNode=attribute('aWaterDepth').mul(.65);
 const river=new THREE.Mesh(riverGeometry(),waterMat);river.name='open-river-ribbon';river.receiveShadow=true;group.add(river);
 // Breaking ripple crests and downstream wakes share the same advecting coordinate.
 // This is an art-directed flow field rather than a shallow-water fluid solver.
 const breakup=mx_noise_float(vec3(x.sub(t.mul(1.4)).mul(1.5),across.mul(22),0)).smoothstep(-.05,.42);
 const foamGrain=mx_noise_float(vec3(x.sub(t.mul(1.4)).mul(12),across.mul(95),0)).smoothstep(-.35,.4);
 const crest=sin(phase).smoothstep(.93,.999).mul(breakup).mul(foamGrain).mul(.27);
 let wake=crest;
 const shoals=[[-17,.23,.29],[-9,.78,.32],[-.8,.22,.27],[7,.76,.33],[16,.27,.30]];
 const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:'#78847b',roughness:.72}),shoals.length);
 for(const [i,[bx,bt,r]]of shoals.entries()){
  const bz=THREE.MathUtils.lerp(shoreZ(bx),farShoreZ(bx),bt),d=riverDepth(bx,bt);
  dummy.position.set(bx,.006-d*.45,bz);dummy.scale.set(r*1.25,d*.55+.12,r);dummy.rotation.set(0,bx,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  const dx=x.sub(bx),dz=across.sub(bt).abs(),width=dx.max(0).mul(.014).add(.024);
  const tail=dx.smoothstep(0,.18).mul(dx.smoothstep(.5,3.4).oneMinus());
  const vShape=dz.sub(width).abs().smoothstep(.001,.012).oneMinus();
  const churn=sin(dx.mul(12).sub(t.mul(13)).add(across.mul(25))).mul(.5).add(.5).mul(.55).add(.45);
  wake=wake.add(tail.mul(vShape).mul(churn).mul(foamGrain).mul(.55));
 }
 rocks.name='current-breaking-river-stones';rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
 const foamMat=new THREE.MeshBasicNodeMaterial({color:'#d9ede5',transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.025});foamMat.forceSinglePass=true;
 foamMat.colorNode=color('#d9ede5').mul(lightUniforms.surface);
 foamMat.positionNode=positionLocal.add(vec3(0,height.add(.006),0));foamMat.opacityNode=wake.mul(edge).clamp(0,.8);
 const foam=new THREE.Mesh(river.geometry,foamMat);foam.name='advected-whitewater-and-shoal-wakes';foam.renderOrder=3;group.add(foam);
 return {river,bed,group,report:{surface:'physical transmission / IOR 1.333 / depth-dependent absorption',bedDepthMeters:[.025,.9],submergedStones:pebbles.count,flow:'1.4 m/s downstream phase advection, 4.5 / 1.8 cm waves, shore pinned',whitewater:'broken crests and five rock wakes',shoalStones:shoals.length,caustics:'animated procedural approximation'}};
}
