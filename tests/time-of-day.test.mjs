import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import {createTimeController,timePeriods,periodAt,sampleTime} from '../src/pasture/time-of-day.js';
import {createAtmosphere} from '../src/pasture/atmosphere.js';
import {createSeasonController} from '../src/pasture/seasons.js';

test('traditional periods use two-hour boundaries and wrap Zi across midnight',()=>{
 assert.equal(timePeriods.length,12);assert.equal(new Set(timePeriods.map(p=>p.key)).size,12);
 for(const p of timePeriods){assert.equal(periodAt(p.hour-.999).key,p.key);assert.equal(periodAt(p.hour+.999).key,p.key);}
 assert.equal(periodAt(23).key,'zi');assert.equal(periodAt(1).key,'chou');
 for(const key of Object.keys(sampleTime(0)))assert.ok(Math.abs(sampleTime(23.999)[key]-sampleTime(.001)[key])<.00001);
});
test('time transitions cross midnight by the short route, and pause/manual selection stop cycling',()=>{
 const c=createTimeController(()=>{});c.initialize();c.select('hai',{instant:true});c.select('chou');c.update(1,true);
 assert.equal(c.status.hour,0);c.update(1,true);assert.equal(c.status.hour,2);assert.equal(c.status.transitioning,false);
 c.setAuto(true);c.update(240,true);assert.equal(c.status.hour,2);
 c.update(1,true);const frozen=c.status.hour;c.update(10,false);assert.equal(c.status.hour,frozen);
 c.select('wu',{instant:true});assert.equal(c.status.hour,12);assert.equal(c.status.auto,false);
 assert.throws(()=>c.select('bad'));assert.equal(c.status.hour,12);
});
test('night stays dark through season changes and seasonal light does not accumulate multipliers',()=>{
 const scene=new THREE.Scene(),renderer={},a=createAtmosphere(scene,renderer);
 const seasons=createSeasonController(a.apply),time=createTimeController(a.applyTime);
 seasons.initialize();time.initialize();time.select('zi',{instant:true});const night=a.inspection;
 assert.equal(night.sunIntensity,0);assert.ok(night.moonIntensity>0);
 for(const key of ['spring','summer','winter','autumn']){seasons.select(key,{instant:true});assert.equal(a.inspection.sunIntensity,0);assert.equal(a.inspection.environmentIntensity,night.environmentIntensity);}
 assert.deepEqual(a.inspection,night);
 time.select('wu',{instant:true});assert.ok(a.inspection.sunIntensity>2);assert.ok(a.inspection.environmentIntensity>night.environmentIntensity*10);
 const noon=a.inspection;for(let i=0;i<100;i++)time.select('wu',{instant:true});assert.deepEqual(a.inspection,noon);
 time.select('chen',{instant:true});const morning=a.inspection.sunPosition;time.select('shen',{instant:true});assert.ok(morning[0]<0&&a.inspection.sunPosition[0]>0);
 a.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});
