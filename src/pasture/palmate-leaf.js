// Five pointed lobes, authored as one connected surface so seasonal shedding is whole-leaf.
// This is a maple-like visual morphology, not a species identification from the painting.
export function palmateLeaf(builder,base,angle,length,tint){
 const outline=[[0,0],[-.18,.17],[-.52,.25],[-.27,.39],[-.58,.67],[-.19,.58],[0,1],[.19,.58],[.58,.67],[.27,.39],[.52,.25],[.18,.17]];
 const c=Math.cos(angle),s=Math.sin(angle),phase=base[0]*31+base[1]*53+base[2]*17,tilt=.25+.85*(.5+.5*Math.sin(phase)),roll=Math.sin(phase*1.7)*.24;
 const point=(u,v,lift=0)=>[base[0]+length*(c*v-s*u),base[1]+length*(v*tilt+u*roll+Math.sin(v*Math.PI)*.14+lift),base[2]+length*(s*v+c*u)];
 const center=builder.vertex(point(0,.44,.06),[.5,.44],tint.map(v=>v*1.08));
 const ring=outline.map(([u,v])=>builder.vertex(point(u,v),[u*.8+.5,v],tint));
 for(let i=0;i<ring.length;i++)builder.tri(center,ring[i],ring[(i+1)%ring.length]);
}
