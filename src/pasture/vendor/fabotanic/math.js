// Adapted module wrapper from E:/fabotanic/src/modules/math.js; pure geometry logic retained.


/* VERDANT — deterministic math, no external dependencies. */
const V = {
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
 mul:(a,s)=>{if(!a||a.length<3)throw new Error('Vector operation received invalid input');return [a[0]*s,a[1]*s,a[2]*s]}, dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len:a=>Math.hypot(...a), norm(a){const l=Math.hypot(...a)||1;return a.map(x=>x/l)},
 mix:(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
// Mulberry32 JavaScript correspondence (bryc, Public domain): see MULBERRY32-NOTICE.txt.
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
function randomSeed(){const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]}
function bezier(a,b,c,d,t){const u=1-t;return a.map((v,i)=>u*u*u*v+3*u*u*t*b[i]+3*u*t*t*c[i]+t*t*t*d[i])}
function tangent(fn,t){return V.norm(V.sub(fn(Math.min(1,t+.0002)),fn(Math.max(0,t-.0002))))}
function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function orthographic(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1])}
function lookAt(eye,target,up=[0,1,0]){const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])}
function rotateY(t){const c=Math.cos(t),s=Math.sin(t);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])}

export {V,clamp,lerp,rng,randomSeed,bezier,tangent,identity,multiply,perspective,orthographic,lookAt,rotateY};
