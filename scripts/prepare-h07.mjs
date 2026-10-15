import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dequantize,textureCompress,prune} from '@gltf-transform/functions';
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/h07',{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read('public/models/prepared/eb5ef92187918f4a7fde0f5673ad8e64.glb');
await doc.transform(dequantize(),textureCompress({encoder:sharp,targetFormat:'png'}),prune());
for(const ext of doc.getRoot().listExtensionsUsed())if(['KHR_mesh_quantization','EXT_texture_webp'].includes(ext.extensionName))ext.dispose();
await io.write('artifacts/h07/editable.glb',doc);
console.log('H07 editable derived mesh written');

