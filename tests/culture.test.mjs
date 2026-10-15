import test from 'node:test';
import assert from 'node:assert/strict';
import {horseCulture,culturalChapters} from '../src/pasture/culture-data.js';
import {makeWoodyPrototype,createPlantLayout} from '../src/pasture/plants.js';
import {prepareLeafSeasons} from '../src/pasture/seasons.js';

test('study numbering maps by painting position without replacing production horse identities',()=>{
 assert.equal(Object.keys(horseCulture).length,8);
 for(let i=1;i<=8;i++)assert.equal(horseCulture[`H0${i}`].studyId,`H0${9-i}`);
 assert.match(horseCulture.H06.coat,/菊花青/);assert.match(horseCulture.H08.coat,/花斑/);
 assert.equal(new Set(culturalChapters.map(c=>c.id)).size,5);
});
test('palmate foliage keeps connected leaf surfaces and the original woody structure',()=>{
 const layout=createPlantLayout('russet');assert.equal(layout.filter(p=>p.x<0).length,11);assert.equal(layout.filter(p=>p.x>0).length,11);
 const full=makeWoodyPrototype(739,{height:1.22,red:true}),bare=makeWoodyPrototype(739,{height:1.22,red:true,leaves:false});
 assert.deepEqual(full.wood.attributes.position.array,bare.wood.attributes.position.array);
 prepareLeafSeasons(full.leaf);const g=full.leaf,seeds=g.attributes.aLeafSeason.array;
 assert.ok(g.attributes.position.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));
 for(let i=0;i<g.index.count;i+=3){const [a,b,c]=g.index.array.slice(i,i+3);assert.equal(seeds[a],seeds[b]);assert.equal(seeds[a],seeds[c]);}
 full.wood.dispose();full.leaf.dispose();bare.wood.dispose();
});
