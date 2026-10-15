import test from 'node:test';
import assert from 'node:assert/strict';
import {plantProfiles,createPlantLayout,plantAllowed,makeGroundPrototype,makeWoodyPrototype} from '../src/pasture/plants.js';
import {groundHeight,shoreZ,farShoreZ,anchors} from '../src/pasture/spatial.js';
import {terrainGeometry} from '../src/pasture/environment.js';
function validGeometry(g){
 const p=g.attributes.position.array,n=g.attributes.normal.array;
 assert.ok(p.length>0&&g.index.count>0);assert.ok(p.every(Number.isFinite));assert.ok(n.every(Number.isFinite));
 for(const index of g.index.array)assert.ok(index>=0&&index<p.length/3);
 for(let i=0;i<n.length;i+=3)assert.ok(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)<.002);
}
test('six deterministic plant layers fit dry terrain, figure clearings and rock exclusions',()=>{
 for(const [type,profile]of Object.entries(plantProfiles)){
  const a=createPlantLayout(type),b=createPlantLayout(type);assert.deepEqual(a,b);assert.equal(a.length,profile.count);
  for(const p of a){assert.ok(plantAllowed(type,p.x,p.z));assert.ok(p.z>shoreZ(p.x)||p.z<farShoreZ(p.x));assert.ok(Math.abs(p.y+.009-groundHeight(p.x,p.z))<1e-8);}
 }
});
test('curved ground foliage and woody prototypes have finite, valid geometry; leaves do not alter branch structure',()=>{
 for(const type of ['meadow','sedge','rosette','fern']){const g=makeGroundPrototype(type,19);validGeometry(g);g.dispose();}
 const bare=makeWoodyPrototype(211,{tree:true,height:4,leaves:false}),full=makeWoodyPrototype(211,{tree:true,height:4,leaves:true});
 validGeometry(bare.wood);validGeometry(full.leaf);assert.deepEqual(bare.wood.attributes.position.array,full.wood.attributes.position.array);
 bare.wood.dispose();full.wood.dispose();full.leaf.dispose();
});
test('contoured banks match CPU terrain and keep stable local standing areas',()=>{
 const g=terrainGeometry();validGeometry(g);const p=g.attributes.position;
 for(let i=0;i<p.count;i+=29)assert.ok(Math.abs(p.getY(i)-groundHeight(p.getX(i),p.getZ(i)))<.001);
 assert.ok(groundHeight(-11,-.8)>groundHeight(0,1)+.45);
 for(const a of anchors){const h=groundHeight(a.x,a.z);assert.ok(h>.25);assert.ok(Math.abs(groundHeight(a.x+.2,a.z+.2)-h)<.08);}
 g.dispose();
});
