import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {textureCompress,prune} from '@gltf-transform/functions';
import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read('artifacts/h07/rigged.glb');
await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',quality:90}),prune());
await mkdir('public/models/h07',{recursive:true});
await io.write('public/models/h07/horse.glb',doc);
await copyFile('artifacts/h07/rig-report.json','public/models/h07/rig-report.json');
console.log('Packed H07',doc.getRoot().listAnimations().map(a=>a.getName()));

