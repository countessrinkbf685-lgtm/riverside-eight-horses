// Adapted module wrapper from E:/fabotanic/src/modules/geometry.js; pure geometry logic retained.

import {V,clamp,lerp,bezier,tangent} from './math.js';

class MeshBuilder{
 constructor(name){this.name=name;this.p=[];this.n=[];this.uv=[];this.c=[];this.idx=[];this.normalSeams=[]}
 vertex(p,uv,color){if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||!uv||uv.length!==2||!uv.every(Number.isFinite)||!color||color.length!==3||!color.every(Number.isFinite))throw new Error(this.name+': non-finite or malformed vertex');this.p.push(...p);this.uv.push(...uv);this.c.push(...color);return this.p.length/3-1}
 tri(a,b,c){const p=this.p;const A=p.slice(a*3,a*3+3),B=p.slice(b*3,b*3+3),C=p.slice(c*3,c*3+3);if(V.len(V.cross(V.sub(B,A),V.sub(C,A)))>1e-12)this.idx.push(a,b,c)}
 finish(){const n=new Float32Array(this.p.length);for(let i=0;i<this.idx.length;i+=3){const [a,b,c]=this.idx.slice(i,i+3);const p=this.p;const ab=[p[b*3]-p[a*3],p[b*3+1]-p[a*3+1],p[b*3+2]-p[a*3+2]],ac=[p[c*3]-p[a*3],p[c*3+1]-p[a*3+1],p[c*3+2]-p[a*3+2]],nn=V.cross(ab,ac);for(const v of [a,b,c])for(let k=0;k<3;k++)n[v*3+k]+=nn[k]}
 for(const [a,b] of this.normalSeams)for(let k=0;k<3;k++){const v=n[a*3+k]+n[b*3+k];n[a*3+k]=v;n[b*3+k]=v;}
 for(let i=0;i<n.length;i+=3){const l=Math.hypot(n[i],n[i+1],n[i+2]);if(l>1e-10){n[i]/=l;n[i+1]/=l;n[i+2]/=l}else{n[i]=0;n[i+1]=1;n[i+2]=0}}
 return {name:this.name,positions:new Float32Array(this.p),normals:n,uvs:new Float32Array(this.uv),colors:new Float32Array(this.c.map(v=>Math.min(1,Math.max(0,v)))),indices:new Uint32Array(this.idx)}}
}
function tube(builder,path,r1,r2,segments,sides,color=[1,1,1]){
 const rings=[];for(let i=0;i<=segments;i++){const t=i/segments,center=path(t),dir=tangent(path,t);const ref=Math.abs(dir[1])>.9?[1,0,0]:[0,1,0],x=V.norm(V.cross(ref,dir)),y=V.norm(V.cross(dir,x)),rad=lerp(r1,r2,t);const row=[];for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,p=V.add(center,V.add(V.mul(x,Math.cos(a)*rad),V.mul(y,Math.sin(a)*rad)));row.push(builder.vertex(p,[j/sides,t],color))}rings.push(row);builder.normalSeams.push([row[0],row[sides]]);}
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=rings[i][j],b=rings[i][j+1],c=rings[i+1][j],d=rings[i+1][j+1];builder.tri(a,b,c);builder.tri(b,d,c)}
 const c0=builder.vertex(path(0),[.5,0],color),c1=builder.vertex(path(1),[.5,1],color);for(let j=0;j<sides;j++){builder.tri(c0,rings[0][j+1],rings[0][j]);builder.tri(c1,rings[segments][j],rings[segments][j+1])}
}
/* Parametric, genuinely curved leaf surface. Tips are triangle fans (no degenerate triangles). */
function leaf(builder,{path,side,width,segments=10,across=4,profile=.7,fold=.12,curl=.02,ripple=0,phase=0,serrate=0,shape='plain',damage=0,edgeWave=0,color=[1,1,1],up=[0,1,0]}){
 const rows=[];for(let i=0;i<=segments;i++){
  const t=i/segments,center=path(t);let w=width*.5*Math.pow(Math.max(0,Math.sin(Math.PI*t)),profile)*(1-.20*t);
  if(serrate)w*=1+Math.sin(t*Math.PI*28+phase)*serrate;
  if(shape==='clover')w*=.66+1.05*Math.pow(t,.65);
  else if(shape==='dandelion')w*=.58+.48*Math.pow(.5+.5*Math.sin(t*Math.PI*12+.4),2);
  else if(shape==='plantain')w*=.72+.42*Math.pow(Math.sin(Math.PI*t),.65);
  else if(shape==='oak')w*=.70+.29*Math.cos(t*Math.PI*10-.7)*Math.sin(Math.PI*t);
  else if(shape==='cherry')w*=.78+.16*Math.sin(t*Math.PI*22+phase)*Math.sin(Math.PI*t);
  else if(shape==='ginkgo'){w*=.38+1.18*Math.pow(t,.72);w*=1-.16*Math.exp(-Math.pow((t-.92)/.055,2));}
  else if(shape==='maple'){const lobes=.52+.58*Math.pow(.5+.5*Math.cos(t*Math.PI*10+phase*.18),1.8)*Math.sin(Math.PI*t);w*=lobes;}
  else if(shape==='zelkova')w*=.76+.14*Math.sin(t*Math.PI*26+phase)*Math.sin(Math.PI*t);
  else if(shape==='needle')w*=.22+.08*Math.sin(Math.PI*t);
  else if(shape==='petal'){w*=.70+1.05*Math.sin(Math.PI*t);w*=1-.18*Math.exp(-Math.pow((t-.93)/.045,2));}
  else if(shape==='tridentate'){w*=.74+1.08*Math.sin(Math.PI*t);w*=1-.18*Math.exp(-Math.pow((t-.93)/.045,2));}
  else if(shape==='pinnate_feather'){w*=.62+.42*Math.pow(.5+.5*Math.cos(t*Math.PI*14+phase*.2),2)*Math.sin(Math.PI*t);}
  const dir=tangent(path,t);let sideV=V.norm(V.sub(side,V.mul(dir,V.dot(side,dir))));if(V.len(sideV)<.1)sideV=V.norm(V.cross(dir,[1,0,0]));
  let normal=V.norm(V.cross(dir,sideV));if(V.dot(normal,up)<0){sideV=V.mul(sideV,-1);normal=V.mul(normal,-1);}
  if(i===0||i===segments){rows.push([builder.vertex(center,[.5,t],color)]);continue}
  const row=[];for(let j=0;j<=across;j++){const q=j/across*2-1;const asym=1+.045*Math.sin(phase+t*5)*q;const bite=damage*Math.exp(-Math.pow((t-(.25+.45*(.5+.5*Math.sin(phase))))/.045,2))*Math.pow(Math.max(0,q*Math.sign(Math.sin(phase+.8))),8);const tooth=(shape==='tridentate'&&t>.84)?(1-.24*Math.pow(Math.sin(Math.abs(q)*Math.PI*2.5),2)*((t-.84)/.16)):1;const localW=w*asym*(1-bite*.62)*tooth;const z=(-Math.abs(q)*fold+q*q*curl)*width*Math.sin(Math.PI*t)+ripple*Math.sin(t*Math.PI*5+phase+q)*Math.pow(Math.abs(q),2)*width+edgeWave*Math.sin(t*Math.PI*9+phase)*Math.pow(Math.abs(q),6)*width;
   row.push(builder.vertex(V.add(center,V.add(V.mul(sideV,q*localW),V.mul(normal,z))),[j/across,t],color))}rows.push(row);
 }
 for(let i=0;i<segments;i++){const a=rows[i],b=rows[i+1];if(a.length===1){for(let j=0;j<across;j++)builder.tri(a[0],b[j],b[j+1])}else if(b.length===1){for(let j=0;j<across;j++)builder.tri(a[j],b[0],a[j+1])}else{for(let j=0;j<across;j++){builder.tri(a[j],b[j],a[j+1]);builder.tri(a[j+1],b[j],b[j+1])}}}
}

export {MeshBuilder,tube,leaf};
