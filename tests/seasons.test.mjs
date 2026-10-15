import test from 'node:test';
import assert from 'node:assert/strict';
import {riverGeometry,riverDepth} from '../src/pasture/river.js';
import {mountainGeometry} from '../src/pasture/atmosphere.js';
import {createSeasonController,seasonUniforms,prepareLeafSeasons} from '../src/pasture/seasons.js';
import {makeWoodyPrototype} from '../src/pasture/plants.js';
import {shoreZ,farShoreZ} from '../src/pasture/spatial.js';

test('water and bed share curved shorelines, remain separated, and point upwards',()=>{
 const surface=riverGeometry(),bed=riverGeometry(true),p=surface.attributes.position,q=bed.attributes.position;
 for(let i=0;i<p.count;i++){
  assert.equal(p.getX(i),q.getX(i));assert.equal(p.getZ(i),q.getZ(i));
  assert.ok(p.getY(i)-q.getY(i)>.02);assert.ok(p.getY(i)-q.getY(i)<.91);
  assert.ok(surface.attributes.normal.getY(i)>.999);
  const t=surface.attributes.uv.getY(i),x=p.getX(i);
  assert.ok(Math.abs(p.getZ(i)-(shoreZ(x)*(1-t)+farShoreZ(x)*t))<.00001);
  assert.ok(Math.abs(p.getY(i)-q.getY(i)-riverDepth(x,t))<.00001);
 }
 surface.dispose();bed.dispose();
 for(let i=0;i<3;i++){const g=mountainGeometry(i);assert.ok(g.attributes.position.array.every(Number.isFinite));g.dispose();}
});

test('all triangles of a leaf disappear together, without changing branch geometry',()=>{
 const {leaf,wood}=makeWoodyPrototype(327,{tree:true}),original=wood.attributes.position.array.slice();prepareLeafSeasons(leaf);
 const ids=leaf.attributes.aLeafSeason.array,indices=leaf.index.array;
 for(let i=0;i<indices.length;i+=3){assert.equal(ids[indices[i]],ids[indices[i+1]]);assert.equal(ids[indices[i]],ids[indices[i+2]]);}
 assert.ok(ids.every(v=>v>0&&v<1));assert.ok(new Set(ids).size>100);
 assert.deepEqual(wood.attributes.position.array,original);wood.dispose();leaf.dispose();
});

test('season loop is continuous, pause freezes it, manual choice cancels auto, and winter sheds leaves',()=>{
 let lighting;const controller=createSeasonController(v=>{lighting=v;});controller.initialize();
 controller.select('winter',{instant:true});assert.equal(seasonUniforms.density.value,0);assert.ok(seasonUniforms.frost.value>.8);
 const winter=seasonUniforms.leaf.value.clone();controller.setAuto(true);controller.update(180,true);assert.ok(Math.abs(controller.status.phase-3)<1e-9);assert.deepEqual(seasonUniforms.leaf.value,winter);
 const before=controller.status;controller.update(15,false);assert.deepEqual(controller.status,before);
 controller.update(44.999,true);const end=seasonUniforms.leaf.value.clone();controller.update(.002,true);assert.ok(Math.hypot(end.r-seasonUniforms.leaf.value.r,end.g-seasonUniforms.leaf.value.g,end.b-seasonUniforms.leaf.value.b)<.001);
 controller.select('summer');assert.equal(controller.status.auto,false);controller.update(1.5,true);assert.ok(controller.status.transitioning);controller.update(1.5,true);assert.equal(controller.status.key,'summer');assert.equal(seasonUniforms.density.value,1);assert.equal(seasonUniforms.frost.value,0);assert.ok(lighting.sunPosition.y>18);
 assert.throws(()=>controller.select('invalid'),/Unknown season/);
});
