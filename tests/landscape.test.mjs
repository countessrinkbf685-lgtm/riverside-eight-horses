import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeadowExtensionLayout,plantAllowed} from '../src/pasture/plants.js';
import {groundHeight,peripheralRelief,shoreZ} from '../src/pasture/spatial.js';
import {mountainGeometry} from '../src/pasture/atmosphere.js';

test('extended meadow covers both flanks and deep foreground with no detached roots',()=>{
 const a=createMeadowExtensionLayout(),b=createMeadowExtensionLayout();assert.deepEqual(a,b);assert.ok(a.length>30000);
 for(const p of a){assert.ok(plantAllowed('meadow',p.x,p.z));assert.ok(Math.abs(p.y+.009-groundHeight(p.x,p.z))<1e-8);assert.ok(p.z-shoreZ(p.x)<63);}
 for(const [x,z]of [[-26,8],[26,8],[-22,23],[0,22],[22,23],[-18,36],[0,42],[18,42]])assert.ok(a.some(p=>Math.hypot(p.x-x,p.z-z)<.4),`bare field around ${x},${z}`);
 for(const [x,z]of [[0,3],[-7,3],[-5.35,.2],[1.6,3.4],[10.2,2.2]])assert.equal(peripheralRelief(x,z),0);
 assert.ok(peripheralRelief(-18,8)>.4);assert.ok(peripheralRelief(18,11)>.5);assert.ok(peripheralRelief(0,20)>.25);
});

test('rocky ridges have distinct cliff faces and finite face normals',()=>{
 for(let layer=0;layer<3;layer++){
  const g=mountainGeometry(layer),p=g.attributes.position,n=g.attributes.normal;let cliffs=0,ledges=0;
  assert.ok(p.array.every(Number.isFinite));assert.ok(n.array.every(Number.isFinite));
  for(let i=0;i<n.count;i++){assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.001);if(Math.abs(n.getY(i))<.5)cliffs++;if(n.getY(i)>.85)ledges++;}
  assert.ok(cliffs>n.count*.1);assert.ok(ledges>n.count*.1);g.dispose();
 }
});
