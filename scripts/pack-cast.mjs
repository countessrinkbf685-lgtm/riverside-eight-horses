import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {textureCompress,prune} from '@gltf-transform/functions';
import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const id of process.argv.length>2?process.argv.slice(2):['H01','H02','H03','H04','H05','H08','P01']){
 const dir=id.toLowerCase(),doc=await io.read(`artifacts/${dir}/rigged.glb`);
 await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',quality:90}),prune());
 await mkdir(`public/models/${dir}`,{recursive:true});
 await io.write(`public/models/${dir}/horse.glb`,doc);
 await copyFile(`artifacts/${dir}/rig-report.json`,`public/models/${dir}/rig-report.json`);
 console.log(id,doc.getRoot().listAnimations().map(a=>a.getName()));
}
