import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dequantize,textureCompress,prune} from '@gltf-transform/functions';
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {assetCatalog} from '../src/pasture/assets.js';
const ids=process.argv.slice(2);if(!ids.length)ids.push('H01','H02','H03','H04','H05','H08','P01');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const id of ids){
 const spec=assetCatalog.find(a=>a.id===id);if(!spec)throw Error('Unknown asset '+id);
 const dir=`artifacts/${id.toLowerCase()}`;await mkdir(dir,{recursive:true});
 const doc=await io.read(`public/models/prepared/${spec.file}.glb`);
 await doc.transform(dequantize(),textureCompress({encoder:sharp,targetFormat:'png'}),prune());
 for(const ext of doc.getRoot().listExtensionsUsed())if(['KHR_mesh_quantization','EXT_texture_webp'].includes(ext.extensionName))ext.dispose();
 await io.write(`${dir}/editable.glb`,doc);console.log(id,'editable source prepared');
}
