import * as THREE from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {isMuzzleVertex} from './pasture/cast-motion.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const requested=new URL(location.href).searchParams.get('asset'),asset=/^(H0[1-8]|P01)$/.test(requested)?requested:'H06',model=asset.toLowerCase();
const $=id=>document.getElementById(id),state={ready:false,clip:'Idle',playing:true,time:0};
const renderer=new THREE.WebGPURenderer({antialias:true});await renderer.init();
if(!renderer.backend.isWebGPUBackend)throw Error('WebGPU required');
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#ddd9c9');scene.fog=new THREE.Fog('#ddd9c9',12,35);
scene.add(new THREE.HemisphereLight(0xfff4df,0x8e876e,2.5));const light=new THREE.DirectionalLight(0xffecd1,2.3);light.position.set(-3,7,5);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-8;light.shadow.camera.right=8;light.shadow.camera.top=8;light.shadow.camera.bottom=-8;light.shadow.normalBias=.015;scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#a9aa91',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.004;ground.receiveShadow=true;scene.add(ground);const grid=new THREE.GridHelper(160,320,0x737c6d,0x939984);grid.position.y=-.002;scene.add(grid);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.05,200);camera.position.set(3,2.1,5.7);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;
const [gltf,report]=await Promise.all([new GLTFLoader().loadAsync(`/models/${model}/horse.glb`),fetch(`/models/${model}/rig-report.json`).then(r=>r.json())]);
const horse=gltf.scene;scene.add(horse);let skin;
horse.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}if(o.isSkinnedMesh&&!o.name.includes('tail_groom')&&(!skin||o.geometry.attributes.position.count>skin.geometry.attributes.position.count))skin=o;});
const helper=new THREE.SkeletonHelper(horse);helper.visible=false;scene.add(helper);
const mixer=new THREE.AnimationMixer(horse),clips=Object.fromEntries(gltf.animations.map(c=>[c.name,c]));let action;
$('clip').replaceChildren(...gltf.animations.map(c=>new Option(c.name,c.name)));
document.title=asset+' · 动作检查';document.querySelector('h1').textContent=document.title;
$('asset').replaceChildren(...['H01','H02','H03','H04','H05','H06','H07','H08','P01'].map(id=>new Option(id,id)));$('asset').value=asset;$('asset').onchange=()=>{location.href='/motion-review.html?asset='+$('asset').value;};
$('report-link').href=`/models/${model}/rig-report.json`;
if(asset==='H07'){$('intro-label').textContent='浅褐马 / 待机与回望检查';$('intro').textContent='Idle：四蹄落稳后的头颈、耳朵和尾部微动。Look：转头、短暂停留、回正。以视频节奏手工编排，骨架与权重为 H07 单独制作。';}
if(!['H06','H07'].includes(asset)){$('intro-label').textContent=asset==='P01'?'牧马人 / 垂手、待机与左右观察':'马匹 / 独立骨骼与回正检查';$('intro').textContent=asset==='P01'?'APose 保留绑定姿势；Neutral 自然垂手；Idle 呼吸、手臂与衣摆微动；Look 左右观察并回正。':'Neutral 为头颈回正姿态；Idle 包含头颈、耳朵与马尾微动。按角色提供回望或采食，脚部保持站定。';}
if(['H01','H02'].includes(asset))$('intro').textContent='Painting 为原画屈肢定姿；PaintingIdle 保留定姿并微动；PaintingDown / Up 为下俯与起身。前肢折起，后肢支撑。原画遮挡的肢体按关节结构补全。';
// Collect independent post-export sole samples in world axes before animation.
horse.updateMatrixWorld(true);skin.skeleton.update();const soles=asset==='P01'?{L:[],R:[]}:{HL:[],FL:[],HR:[],FR:[]},v=new THREE.Vector3();
for(let i=0;i<skin.geometry.attributes.position.count;i++){
 skin.getVertexPosition(i,v).applyMatrix4(skin.matrixWorld);
 if(v.y<.0035){const tag=(asset==='P01'?'':v.x>0?'F':'H')+(v.z<(report.soleSplitY?-report.soleSplitY[v.x>0?'F':'H']:asset==='H06'?-.04:0)?'L':'R');soles[tag].push(i);}
}
const muzzle=[];for(let i=0;i<skin.geometry.attributes.position.count;i++){v.fromBufferAttribute(skin.geometry.attributes.position,i);if(report.muzzleBindSelection?isMuzzleVertex(v,report.muzzleBindSelection):asset==='H07'?(v.x>1.2&&v.y<1.48&&v.y>1.30):asset==='H06'&&(v.x>.94&&v.y<1.57&&v.y>1.25&&v.z>.38))muzzle.push(i);}
const markers={};for(const tag of Object.keys(soles)){const m=new THREE.Mesh(new THREE.RingGeometry(.075,.086,32),new THREE.MeshBasicMaterial({color:'#417d54',side:THREE.DoubleSide,depthTest:false}));m.rotation.x=-Math.PI/2;m.position.y=.008;m.renderOrder=10;scene.add(m);markers[tag]=m;}
function setClip(name){mixer.stopAllAction();state.clip=name;state.time=0;action=mixer.clipAction(clips[name]).reset();action.setLoop(['GrazeDown','GrazeUp','HeadReturn','Neutral','Painting','PaintingDown','PaintingUp'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);action.clampWhenFinished=true;action.play();$('clip').value=name;$('scrub').max=clips[name].duration;evaluate(0);}
let previousX=0;
function evaluate(time){state.time=time;action.paused=false;mixer.setTime(time);horse.position.x=state.clip==='Walk'?time*report.walkSpeedMetersPerSecond:0;const dx=horse.position.x-previousX;camera.position.x+=dx;controls.target.x+=dx;previousX=horse.position.x;horse.updateMatrixWorld(true);skin.skeleton.update();}
function contacts(){const result={};for(const [tag,indices]of Object.entries(soles)){const points=indices.map(i=>skin.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(skin.matrixWorld));const center=points.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/points.length);const phase=state.clip==='Walk'?((state.time/clips.Walk.duration-report.contactOnsets[tag])%1+1)%1:0,support=state.clip.startsWith('Painting')?tag.startsWith('H'):state.clip!=='Walk'||phase<report.stanceFraction;result[tag]={support,points:points.map(p=>p.toArray()),height:Math.min(...points.map(p=>p.y)),center:center.toArray()};markers[tag].position.set(center.x,.008,center.z);markers[tag].material.color.set(support?'#417d54':'#b59037');}return result;}
$('clip').onchange=()=>setClip($('clip').value);$('play').onclick=()=>{state.playing=!state.playing;$('play').textContent=state.playing?'暂停':'播放';$('play').setAttribute('aria-pressed',String(state.playing));};$('bones').onclick=()=>{helper.visible=!helper.visible;$('bones').setAttribute('aria-pressed',String(helper.visible));};$('scrub').oninput=()=>{state.playing=false;$('play').textContent='播放';$('play').setAttribute('aria-pressed','false');evaluate(Number($('scrub').value));};
const requestedClip=new URL(location.href).searchParams.get('clip');setClip(clips[requestedClip]?requestedClip:report.paintingPose?'PaintingIdle':'Idle');state.ready=true;$('status').textContent=`WebGPU · ${skin.skeleton.bones.length} 根骨骼 · ${Object.keys(clips).join(' / ')} · 平地检查`;
let last=performance.now();renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;if(state.playing)evaluate(state.time+dt);const c=contacts();$('time').textContent=((['GrazeDown','GrazeUp','HeadReturn','Neutral','Painting','PaintingDown','PaintingUp'].includes(state.clip)?Math.min(state.time,clips[state.clip].duration):state.time%clips[state.clip].duration)).toFixed(2)+' s';$('scrub').value=(['GrazeDown','GrazeUp','HeadReturn','Neutral','Painting','PaintingDown','PaintingUp'].includes(state.clip)?Math.min(state.time,clips[state.clip].duration):state.time%clips[state.clip].duration);$('contact').textContent=Object.entries(c).map(([tag,p])=>`${tag}  ${p.support?'支撑':'摆动'}  蹄底 ${(p.height*1000).toFixed(1)} mm`).join('\n');controls.update();renderer.render(scene,camera);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.motionReview={state,sleeveView(){camera.position.set(2.0,1.45,1.6);controls.target.set(0,1.13,0);controls.update();},report,setClip,evaluate,contacts,muzzle(){return muzzle.map(i=>skin.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(skin.matrixWorld).toArray());},surface(){return Array.from({length:skin.geometry.attributes.position.count},(_,i)=>skin.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(skin.matrixWorld).toArray());},bonePoint(name){return skin.skeleton.bones.find(b=>b.name===name).getWorldPosition(new THREE.Vector3()).toArray();},headForward(){const head=skin.skeleton.bones.find(b=>b.name==='Head');return new THREE.Vector3(0,1,0).transformDirection(head.matrixWorld).toArray();},frontView(){camera.position.set(horse.position.x+6,1.7,0);controls.target.set(horse.position.x,1,0);controls.update();},groomSurface(){const groom=horse.getObjectByName('H06_tail_groom');if(!groom)return [];groom.skeleton.update();return Array.from({length:Math.ceil(groom.geometry.attributes.position.count/17)},(_,j)=>groom.getVertexPosition(j*17,new THREE.Vector3()).applyMatrix4(groom.matrixWorld).toArray());},tailView(angle=0){camera.position.set(horse.position.x-(angle===2?3.9:2.4),1.1,angle===1?-2.1:angle===2?0:2.1);controls.target.set(horse.position.x-.85,.85,0);controls.update();},get bones(){return skin.skeleton.bones.length;},set sideView(value){camera.position.set(horse.position.x+(value?0:3),1.8,value?6:5.7);controls.target.set(horse.position.x,1,0);controls.update();}};

$('front').onclick=()=>window.motionReview.frontView();$('side').onclick=()=>{window.motionReview.sideView=true;};

$('tail').onclick=()=>asset==='P01'?window.motionReview.sleeveView():window.motionReview.tailView();if(asset==='P01')$('tail').textContent='衣袖近景';

if(new URL(location.href).searchParams.get('view')==='tail')window.motionReview.tailView();

if(asset==='P01'&&new URL(location.href).searchParams.get('view')==='sleeves')window.motionReview.sleeveView();
