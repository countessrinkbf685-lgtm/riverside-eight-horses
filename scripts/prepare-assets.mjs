// Derived web meshes only. Keep original GLBs and their existing axis transforms.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, compactPrimitive, quantize, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
await mkdir('public/models/prepared',{recursive:true});
await mkdir('artifacts/audit',{recursive:true});
const only=process.argv[2];
const reports=only?JSON.parse(await readFile('artifacts/audit/prepared-models.json','utf8')):[];
const files=(await readdir('design/pasture')).filter(n=>n.endsWith('.glb')&&(!only||n===only)).sort();
if(!files.length)throw new Error('No matching source GLB: '+only);
for(const filename of files){
 const source=path.join('design/pasture',filename), target=path.join('public/models/prepared',filename);
 const doc=await io.read(source);await doc.transform(dedup(),weld());const meshes=[];
 for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const p=prim.getAttribute('POSITION'),n=prim.getAttribute('NORMAL'),uv=prim.getAttribute('TEXCOORD_0');
  const indices=new Uint32Array(prim.getIndices().getArray()),attrs=new Float32Array(p.getCount()*5),nv=[],tv=[];
  for(let i=0;i<p.getCount();i++){n.getElement(i,nv);uv.getElement(i,tv);attrs.set([...nv,...tv],i*5);}
  const [result,error]=MeshoptSimplifier.simplifyWithAttributes(indices,p.getArray(),3,attrs,5,[.5,.5,.5,2,2],null,60000,.008,[]);
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(result));compactPrimitive(prim);
  meshes.push({originalTriangles:indices.length/3,triangles:result.length/3,error});
 }
 // Neutralize unsupported specular values generated above the physical range.
 for(const mat of doc.getRoot().listMaterials()){
  mat.setMetallicFactor(0).setRoughnessFactor(.86);
  const spec=mat.getExtension('KHR_materials_specular');if(spec)mat.setExtension('KHR_materials_specular',null);
 }
 await doc.transform(prune(),textureCompress({encoder:sharp,slots:/baseColorTexture|emissiveTexture/,targetFormat:'webp',quality:88,resize:[1024,1024]}),
  textureCompress({encoder:sharp,slots:/normalTexture|metallicRoughnessTexture|occlusionTexture/,targetFormat:'webp',lossless:true,resize:[512,512]}),
  quantize({quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}),prune());
 await io.write(target,doc);const size=(await stat(target)).size;
 const url='/models/prepared/'+filename,index=reports.findIndex(r=>r.url===url);
 if(index>=0)reports.splice(index,1);
 reports.push({source:source.replaceAll('\\','/'),url,bytes:size,meshes,skins:doc.getRoot().listSkins().length,animations:doc.getRoot().listAnimations().length});
 console.log(filename,meshes.reduce((s,m)=>s+m.triangles,0),'triangles',Math.round(size/1024),'KiB');
 await writeFile('artifacts/audit/prepared-models.json',JSON.stringify(reports,null,2));
}
