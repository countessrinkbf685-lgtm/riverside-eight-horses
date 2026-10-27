import './style.css';
import {installCulture} from './culture.js';
import {createTimeController,timePeriods} from './time-of-day.js';
import {createAtmosphere} from './atmosphere.js';
import {createSeasonController,seasonPresets} from './seasons.js';
import {createRiverWalk} from './river-walk.js';
import * as THREE from 'three/webgpu';
import {assetCatalog,loadAsset,placeActor,measureActorSoles} from './assets.js';
import {anchors,groundHeight,rockPlacements} from './spatial.js';
import {createEnvironment,createWillowFoliage,motionTime} from './environment.js';
import {CameraDirector,views} from './camera.js';
import {installT02} from './t02.js';
const $=s=>document.querySelector(s),viewport=$('#viewport');
const state={ready:false,backend:null,loaded:[],failed:[],motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,low:false,view:'home',selected:null,frames:0};
const actors=new Map(),resources=[],frameTimes=[];let culture,renderer,scene,camera,director,seasons,timeOfDay,atmosphere,last=performance.now(),simTime=0,comparison=false,disposed=false,returnView='home';
function motionUI(){$('#motion').setAttribute('aria-pressed',String(state.motion));$('#motion').textContent=`动态 · ${state.motion?'开':'停'}`;}
function chooseView(key,instant=false){if(!director)return;state.view=key;state.selected=null;$('#detail').hidden=true;director.go(key,instant);$('#view-name').textContent=views[key].name;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===key)));}
function showDetail(id){const object=actors.get(id);if(!object)return;returnView=state.view in views?state.view:'home';state.selected=id;state.view='detail';culture?.describeActor(id);director.focus(object.position.x,object.position.z);const s=object.userData.spec;$('#detail-id').textContent=id;$('#detail-name').textContent=s.name;$('#detail').hidden=false;$('#view-name').textContent=s.name;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function compare(){culture?.close(false);comparison=!comparison;$('#original').hidden=!comparison;$('#compare').setAttribute('aria-pressed',String(comparison));$('#detail').hidden=true;}
function fallback(message){$('#loading').hidden=true;$('#fallback').hidden=false;$('#fallback-message').textContent=message;$('#original').hidden=false;$('#state').textContent='原画静观';document.querySelectorAll('[data-view],#motion,#quality,#compare,#walk,#reset-walk,[data-season],#season-cycle,#time-select,#time-cycle').forEach(b=>b.disabled=true);}
$('#walk').onclick=()=>{for(const o of actors.values())o.userData.riverWalk?.start();$('#walk').disabled=true;$('#walk').textContent='慢行中';$('#reset-walk').hidden=false;state.motion=true;motionUI();};$('#reset-walk').onclick=()=>{for(const o of actors.values())o.userData.riverWalk?.reset();$('#walk').disabled=false;$('#walk').textContent='沿岸慢行';$('#reset-walk').hidden=true;};
$('#retry').onclick=()=>location.reload();$('#compare').onclick=compare;$('#motion').onclick=()=>{state.motion=!state.motion;motionUI();};motionUI();
$('#close-detail').onclick=()=>chooseView(returnView);
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>chooseView(b.dataset.view));
document.querySelectorAll('[data-season]').forEach(button=>button.onclick=()=>seasons?.select(button.dataset.season,{instant:!state.motion||comparison}));
for(const period of timePeriods){const option=document.createElement('option');option.value=period.key;option.textContent=`${period.name} · ${period.mood} ${period.range}`;$('#time-select').append(option);}
$('#time-select').value='chen';
$('#time-select').onchange=()=>timeOfDay?.select($('#time-select').value,{instant:!state.motion||comparison});
$('#time-cycle').onclick=()=>timeOfDay?.setAuto(!timeOfDay.status.auto);
$('#season-cycle').onclick=()=>{if(!seasons)return;seasons.setAuto(!seasons.status.auto);};
$('#quality').onclick=()=>{state.low=!state.low;renderer.setPixelRatio(state.low?.75:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!state.low;$('#quality').setAttribute('aria-pressed',String(state.low));};
async function boot(){
 try{
  if(!navigator.gpu)return fallback('当前浏览器未提供 WebGPU。请使用支持 WebGPU 的新版浏览器，并开启硬件加速。');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)return fallback('未获得 WebGPU 适配器，已切换为原画浏览。');
  state.adapter=adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:{};
  renderer=new THREE.WebGPURenderer({antialias:true,forceWebGL:false});await renderer.init();
  if(!renderer.backend.isWebGPUBackend){renderer.dispose();return fallback('渲染器未启用实际 WebGPU 后端，已切换为原画浏览。');}
  state.backend='WebGPU';renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;viewport.append(renderer.domElement);
  renderer.backend.device.lost.then(info=>{if(!disposed)fallback('GPU 设备连接中断：'+info.reason+'。可重新加载后继续。');});
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-15,15,7,-7,.1,220);director=new CameraDirector(camera);
  atmosphere=createAtmosphere(scene,renderer);
  seasons=createSeasonController(atmosphere.apply,({key,auto})=>{
   state.season=key;
   const label=seasonPresets[key].name;
   if($('#season-name').textContent!==label)$('#season-name').textContent=label;
   document.querySelectorAll('[data-season]').forEach(b=>{const pressed=String(b.dataset.season===key);if(b.getAttribute('aria-pressed')!==pressed)b.setAttribute('aria-pressed',pressed);});
   $('#season-cycle').setAttribute('aria-pressed',String(auto));
  });seasons.initialize();
  const requestedSeason=new URL(location.href).searchParams.get('season');if(Object.hasOwn(seasonPresets,requestedSeason))seasons.select(requestedSeason,{instant:true});
  timeOfDay=createTimeController(atmosphere.applyTime,({key,auto,hour})=>{
   state.time=key;$('#time-select').value=key;$('#time-cycle').setAttribute('aria-pressed',String(auto));
   const clock=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(hour%1*60)).padStart(2,'0')}`;
   if($('#time-clock').textContent!==clock)$('#time-clock').textContent=clock;
  });timeOfDay.initialize();
  const requestedTime=new URL(location.href).searchParams.get('time');if(timePeriods.some(p=>p.key===requestedTime))timeOfDay.select(requestedTime,{instant:true});
  const environment=createEnvironment(scene);state.environment={...environment.report,...atmosphere.report};
  // H06 planted grazing sequence; Walk stays in the flat-ground inspection stage.
  const order=['H06','T01','R01',...assetCatalog.filter(a=>!['H06','T01','R01'].includes(a.id)).map(a=>a.id)];
  $('#progress').max=assetCatalog.length;
  const loading=Promise.resolve().then(async()=>{
   for(const id of order){
    $('#loading-text').textContent=`展卷铺陈 · ${assetCatalog.find(a=>a.id===id).name}`;
    try{
     const object=await loadAsset(id);resources.push(object);
     if(id.startsWith('H')||id==='P01'){placeActor(object,anchors.find(a=>a.id===id));scene.add(object);actors.set(id,object);object.userData.riverWalk=createRiverWalk(object);}
     else if(id==='T02'){state.environment.t02=installT02(scene,object,motionTime);state.environment.vegetation.treeCount=state.environment.t02.instances;}
     else if(id==='T01'){object.position.set(3.4,groundHeight(3.4,.8)-.07,.8);scene.add(object);state.environment.willow=createWillowFoliage(scene,object,motionTime).userData.report;}
     else {rockPlacements.forEach(({x,z,scale,yaw,tilt,sink})=>{const clone=object.clone(true);clone.scale.set(scale*(.92+.10*Math.sin(x)),scale*(x<-10?1.65:1.2),scale);clone.rotation.set(tilt,yaw,tilt*.45);clone.position.set(x,groundHeight(x,z)-sink,z);scene.add(clone);});}
     state.loaded.push(id);
    }catch(error){state.failed.push({id,message:error.message});console.error('Asset load failed',id,error);}
    $('#progress').value=state.loaded.length+state.failed.length;
   }
   const requestedView=new URL(location.href).searchParams.get('view');if(requestedView&&views[requestedView])chooseView(requestedView,true);state.ready=true;culture.refresh();$('#walk').disabled=false;$('#loading').hidden=true;$('#state').textContent='清宫旧藏 · 绢本设色手卷';
   if(state.failed.length){$('#state').textContent='部分画卷素材加载未完成，请刷新重试';$('#loading').hidden=false;$('#loading-text').textContent='部分素材加载失败，请检查网络后重新加载。';}
  });
  renderer.setAnimationLoop(()=>{
   if(disposed||document.hidden){last=performance.now();return;}
   const now=performance.now(),elapsed=now-last,dt=Math.min(elapsed/1000,.05);last=now;
   if(state.motion&&!comparison){simTime+=dt;for(const actor of actors.values())actor.userData.animation?.update(dt);}motionTime.value=simTime;seasons.update(dt,state.motion&&!comparison);timeOfDay.update(dt,state.motion&&!comparison);
   if(state.ready&&$('#walk').disabled&&[...actors.values()].filter(o=>o.userData.riverWalk).every(o=>o.userData.riverWalk.phase==='Arrived'))$('#walk').textContent='已到达';director.tick(dt);renderer.render(scene,camera);state.frames++;if(state.ready){frameTimes.push(elapsed);if(frameTimes.length>3600)frameTimes.shift();}
  });
  installInteraction();await loading;
  if(innerWidth<700)chooseView('willow',true);
  if(new URL(location.href).searchParams.get('film')==='1'){
   const {installFilm}=await import('./film.js');window.pasture.film=installFilm({renderer,scene,camera,director,actors,seasons,timeOfDay,motionTime,state});
   await window.pasture.film.renderFrame(0);
  }
 }catch(e){console.error(e);fallback('WebGPU 场景启动失败：'+e.message);}
}
function installInteraction(){
 let down=null,dragged=false;const raycaster=new THREE.Raycaster();
 viewport.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,last:e.clientX};dragged=false;viewport.setPointerCapture(e.pointerId);});
 viewport.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)dragged=true;if(dragged){director.pan(-(e.clientX-down.last)/innerWidth*director.span*director.aspect);down.last=e.clientX;}});
 viewport.addEventListener('pointerup',e=>{if(!down)return;down=null;if(dragged||comparison)return;const v=new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(v,camera);const hits=raycaster.intersectObjects(scene.children,true);const first=hits.find(h=>h.object.isMesh&&!h.object.isInstancedMesh);if(first?.object.userData.assetId&&actors.has(first.object.userData.assetId))showDetail(first.object.userData.assetId);});
 viewport.addEventListener('pointercancel',()=>{down=null;});
 viewport.addEventListener('wheel',e=>{e.preventDefault();director.pan((e.deltaX||e.deltaY)*.003);},{passive:false});
 addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='Escape'){if(comparison)compare();chooseView(returnView);}if(e.key==='Home')chooseView('home');if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();director.pan(e.key==='ArrowLeft'?-.5:.5);}});
 addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);director.resize();if(state.view in views)director.go(state.view,true);});
 addEventListener('pagehide',()=>{disposed=true;renderer.setAnimationLoop(null);const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());atmosphere?.dispose();renderer.dispose();});
}
window.pasture={state,setTime(key,instant=true){timeOfDay.select(key,{instant});},setTimeCycle(value){timeOfDay.setAuto(value);},get timeOfDay(){return timeOfDay?.status;},setSeason(key,instant=true){seasons.select(key,{instant});},setSeasonCycle(value){seasons.setAuto(value);},get seasons(){return seasons?.status;},get environmentInspection(){const river=scene.getObjectByName('open-river-ribbon');return {water:{transmission:river.material.transmission,ior:river.material.ior,vertices:river.geometry.attributes.position.count},mountains:scene.getObjectByName('faint-western-mountain-ridges').children.length,lightExposure:renderer.toneMappingExposure,season:seasons.status,time:timeOfDay.status,lighting:atmosphere.inspection};},actorSurface(id){const root=actors.get(id),points=[];root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i++)points.push(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).toArray());}});return points;},groundHeight,startWalk(){for(const o of actors.values())o.userData.riverWalk?.start();},resetWalk(){for(const o of actors.values())o.userData.riverWalk?.reset();},evaluateWalk(time){for(const o of actors.values())o.userData.riverWalk?.evaluate(time);},get walks(){return Object.fromEntries([...actors].filter(([,o])=>o.userData.riverWalk).map(([id,o])=>[id,o.userData.riverWalk.measure()]));},chooseView,showDetail,get willow(){return scene?.getObjectByName('willow-connected-branches');},evaluateActor(id,time){actors.get(id)?.userData.animation?.evaluate(time);},evaluateH06(time){actors.get('H06')?.userData.animation.evaluate(time);},screenAnchor(id){const o=actors.get(id);if(!o)return null;const p=o.position.clone().add(new THREE.Vector3(0,1.2,0)).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},get diagnostics(){return {backend:state.backend,adapter:state.adapter,loaded:state.loaded,failed:state.failed,actorCount:actors.size,animatedActors:[...actors.values()].filter(o=>o.userData.animation?.active).length,animationTimes:[...actors.values()].filter(o=>o.userData.animation).map(o=>({id:o.name,time:o.userData.animation.mixer.time,clip:o.userData.animation.active})),actorMuzzles:Object.fromEntries([...actors].map(([id,o])=>[id,measureActorSoles(o,'muzzleIndices')])),actorSoles:Object.fromEntries([...actors].map(([id,o])=>[id,measureActorSoles(o)])),h06Muzzle:measureActorSoles(actors.get('H06'),'muzzleIndices'),h06Soles:measureActorSoles(actors.get('H06')),h07Soles:measureActorSoles(actors.get('H07')),environmentTime:simTime,view:state.view,render:renderer?.info.render,geometryCount:renderer?.info.memory.geometries,frameTimes:[...frameTimes],anchors:[...actors].map(([id,o])=>({id,position:o.position.toArray(),bounds:new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).toArray()}))};}};
culture=installCulture({chooseView,showDetail,setSeason:key=>seasons?.select(key,{instant:!state.motion||comparison}),compare,isReady:()=>state.ready&&!state.failed.length});
window.pasture.culture=culture;
await boot();
