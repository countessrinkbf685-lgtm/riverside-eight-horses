// Shared numerical source for river geometry, terrain and dry-land checks.
export const nearBank=[[-14,-4],[-10,-4.6],[-6,-5.1],[-2,-4.6],[2,-3.8],[6,-3],[10,-2.8],[14,-3.1]];
export function bankZ(x){
 const u=Math.max(0,Math.min(nearBank.length-1,(x+14)/4)),i=Math.min(nearBank.length-2,Math.floor(u)),t=u-i;
 const a=nearBank[Math.max(0,i-1)][1],b=nearBank[i][1],c=nearBank[i+1][1],d=nearBank[Math.min(nearBank.length-1,i+2)][1];
 return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
}
export const smooth=(a,b,t)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
export const mound=(x,z,cx,cz,rx,rz,h)=>h*Math.exp(-2*((x-cx)**2/rx**2+(z-cz)**2/rz**2));
export const shoreZ=x=>bankZ(x)+.09*Math.sin(x*1.7)+.035*Math.sin(x*4.3+.8);
export const riverWidth=x=>6.3+.4*Math.sin(x*.29+.5);
export const farShoreZ=x=>shoreZ(x)-riverWidth(x);
// Relief starts outside the authored standing / walking area, preserving existing contacts.
export function peripheralRelief(x,z){
 const side=smooth(11.5,18,Math.abs(x)),front=smooth(7.5,14,z),mask=1-(1-side)*(1-front);
 return mask*(.18+.22*(.5+.5*Math.sin(x*.27+z*.20))
  +mound(x,z,-18,8,8,10,.65)+mound(x,z,18,11,9,11,.78)
  +mound(x,z,-5,20,10,7,.58)+mound(x,z,10,30,12,9,.65)
  +.07*Math.sin(x*.68-z*.37));
}
function meadowHeight(x,z){
 return .4+mound(x,z,-11,-.8,3.7,5,1.0)+mound(x,z,3.5,.6,3.4,3.6,.44)
  +mound(x,z,-5,6.1,3.5,2.4,.38)+mound(x,z,5.8,6.5,4,2.5,.36)
  +.055*Math.sin(x*.72+z*.53)+.03*Math.sin(x*1.8-z*.7);
}
export function groundHeight(x,z){
 const shore=shoreZ(x),far=farShoreZ(x);
 if(z>=shore-1e-5){
  let base=meadowHeight(x,z)+peripheralRelief(x,z);
  // Broad, smoothly blended standing pads retain dry, calm contact areas while surrounding land gains relief.
  for(const a of anchors){
   if(a.id==='H08'||a.id==='P01')continue;
   const angle=a.heading*Math.PI/180,dx=x-a.x,dz=z-a.z,u=dx*Math.cos(angle)+dz*Math.sin(angle),v=-dx*Math.sin(angle)+dz*Math.cos(angle);
   const radius=Math.hypot(u/1.55,v/.72),w=1-smooth(.75,1.55,radius);
   base=base*(1-w)+meadowHeight(a.x,a.z)*w;
  }
  // The flowered horse and herder share one level patch. Two overlapping pads
  // previously bent H08's rear-hoof area and its lowered muzzle into the slope.
  const groupRadius=Math.hypot((x-9.1)/3.25,(z-2.1)/1.05),groupWeight=1-smooth(.85,1.4,groupRadius);
  base=base*(1-groupWeight)+meadowHeight(8.4,2)*groupWeight;
  return -.015+base*smooth(0,.85,z-shore);
 }
 if(z<=far+1e-5){const d=far-z;return -.015+smooth(0,1.3,d)*(.42+mound(x,z,-9,-17,12,7,.8)+mound(x,z,15,-22,16,9,1.0)+.06*Math.sin(x*.4+z*.6));}
 return -.2;
}
export function isDry(x,z,margin=0){return z-shoreZ(x)>=margin;}
export function actorClearance(x,z){
 let min=Infinity;
 for(const a of anchors){const angle=a.heading*Math.PI/180,dx=x-a.x,dz=z-a.z;min=Math.min(min,Math.hypot((dx*Math.cos(angle)+dz*Math.sin(angle))/1.55,(-dx*Math.sin(angle)+dz*Math.cos(angle))/.7));}
 return min;
}
export const rockPlacements=[
 {x:-11.9,z:-2.8,scale:1.45,yaw:.15,tilt:.08,sink:.28},
 {x:-11.1,z:-.7,scale:1.55,yaw:.58,tilt:-.12,sink:.28},
 {x:-10.3,z:1.0,scale:.75,yaw:1.45,tilt:.15,sink:.22},
 {x:-9.7,z:5.8,scale:.8,yaw:1.0,tilt:.1,sink:.2},
 {x:-.4,z:6.4,scale:1.2,yaw:1.8,tilt:-.07,sink:.3},
 {x:5.8,z:6.7,scale:.9,yaw:1.35,tilt:.09,sink:.22},
 {x:11.8,z:5.8,scale:.7,yaw:.7,tilt:-.12,sink:.2}
];
// Mathematical heading increases from +X toward +Z; Three Y rotation has opposite sign.
export function yawForHeading(heading,nativeHeading){return (nativeHeading-heading)*Math.PI/180;}
export function seededRandom(seed=128){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
export const anchors=[
 ['H01',-7.2,3.0,140],['H02',-6.3,4.6,180],['H03',-5.1,-2.4,270],['H04',-4.3,.2,180],
 ['H05',-2.9,-2.4,0],['H06',.4,3.4,0],['H07',2.2,-1.6,90],['H08',8.4,2,180],['P01',10.2,2.2,180]
].map(([id,x,z,heading])=>({id,x,z,heading}));
