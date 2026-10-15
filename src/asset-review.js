import * as THREE from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {assetCatalog} from './pasture/assets.js';
const renderer=new THREE.WebGPURenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);await renderer.init();
document.body.append(renderer.domElement);const scene=new THREE.Scene();scene.background=new THREE.Color('#e4e4dc');
scene.add(new THREE.HemisphereLight(0xfff5db,0x7c8076,2.5));const light=new THREE.DirectionalLight(0xfff6e9,3);light.position.set(4,7,5);scene.add(light);
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.01,200);camera.position.set(4,2.5,5);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.4,0);controls.update();
const loader=new GLTFLoader();let current=null;
const files=Object.keys(import.meta.glob('../public/models/prepared/*.glb')).map(p=>p.split('/').pop()).sort();
const select=document.querySelector('#models');files.forEach((f,i)=>{const spec=assetCatalog.find(a=>f===a.file+'.glb');select.add(new Option(spec?`${spec.id} · ${spec.name}`:f,i));});
async function load(i){
 if(current){scene.remove(current);current.traverse(o=>{o.geometry?.dispose();if(o.material){for(const v of Object.values(o.material))if(v?.isTexture)v.dispose();o.material.dispose();}});}
 const gltf=await loader.loadAsync('/models/prepared/'+files[i]);current=new THREE.Group();current.add(gltf.scene);scene.add(current);
 const box=new THREE.Box3().setFromObject(current),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const scale=3/Math.max(size.x,size.y,size.z);gltf.scene.scale.multiplyScalar(scale);gltf.scene.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
 let triangles=0;gltf.scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 const spec=assetCatalog.find(a=>files[i]===a.file+'.glb');
 document.querySelector('#info').textContent=` ${spec?.id||''} · ${i+1}/${files.length} · ${triangles} 三角面 · ${renderer.backend.isWebGPUBackend?'WebGPU':'WebGL'} · 原尺寸 ${size.toArray().map(v=>v.toFixed(3)).join(' / ')}`;
 select.value=i;await renderer.renderAsync(scene,camera);return {file:files[i],size:size.toArray(),triangles};
}
select.onchange=()=>load(Number(select.value));
window.review={load,files,view:async(x,y,z)=>{camera.position.set(x,y,z);controls.update();await renderer.renderAsync(scene,camera);},backend:renderer.backend.isWebGPUBackend?'WebGPU':'WebGL'};
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const requested=assetCatalog.find(a=>a.id===new URL(location.href).searchParams.get('asset'));
await load(requested?Math.max(0,files.indexOf(requested.file+'.glb')):0);window.review.ready=true;
