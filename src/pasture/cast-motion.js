// Keep clip durations in sync with the authored per-actor Blender reports.
export const castSequences={
 H01:[['PaintingIdle',8]],H02:[['PaintingIdle',9]],H03:[['Idle',10],['Look',8],['Idle',10]],
 H04:[['Idle',8.5],['GrazeDown',2],['GrazeLoop',7.2],['GrazeUp',1.8]],
 H05:[['Idle',9.5],['GrazeDown',2],['GrazeLoop',7.2],['GrazeUp',1.8]],
 H08:[['Idle',11],['GrazeDown',1.6],['GrazeLoop',5.4],['GrazeUp',1.6]],
 P01:[['Idle',12],['Look',10],['Idle',12]]
};
export const castOffsets={H01:1.2,H02:4.1,H03:3.3,H04:5.4,H05:12.1,H08:17.4,P01:6.7};
export function isMuzzleVertex(point,selection){
 if(!selection)return false;
 // glTF Y-up -> authoring Z-up. Selection is in the undeformed bind mesh.
 const p=[point.x,-point.z,point.y];
 return p[2]>selection.zMin&&p[2]<selection.zMax&&p.reduce((n,v,i)=>n+(v-selection.poll[i])*selection.forward[i],0)>selection.alongMin;
}
