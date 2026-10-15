import test from 'node:test';
import assert from 'node:assert/strict';
import {bankZ,nearBank,groundHeight,isDry,yawForHeading,anchors} from '../src/pasture/spatial.js';
test('river follows the approved controls continuously, including extensions',()=>{
 for(const [x,z]of nearBank)assert.ok(Math.abs(bankZ(x)-z)<1e-9);
 for(let x=-20;x<20;x+=.05){assert.ok(Number.isFinite(bankZ(x)));assert.ok(Math.abs(bankZ(x+.05)-bankZ(x))<.04);}
 assert.ok(Math.abs(bankZ(-40)-nearBank[0][1])<1e-9);assert.ok(Math.abs(bankZ(40)-nearBank.at(-1)[1])<1e-9);
});
test('all 8 horse torso anchors and the herder are on the near-bank plateau',()=>{
 assert.equal(anchors.filter(a=>a.id.startsWith('H')).length,8);
 for(const {x,z} of anchors){assert.ok(isDry(x,z,.8));assert.ok(groundHeight(x,z)>.25);}
 for(let x=-12;x<=12;x++){assert.ok(groundHeight(x,bankZ(x)-2)<0);assert.ok(groundHeight(x,bankZ(x)+1)>.25);}
});
test('heading conversion preserves per-asset native axes without double axis conversion',()=>{
 assert.equal(yawForHeading(180,180),0);assert.equal(yawForHeading(90,0),-Math.PI/2);assert.equal(yawForHeading(180,90),-Math.PI/2);
});
