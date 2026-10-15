import * as THREE from 'three/webgpu';
export const views={
 home:{name:'全卷 · 河岸相望',position:[0,8.5,25],target:[0,3.1,-.6],span:11.8},
 river:{name:'清流近看 · 浅岸见底',position:[-2,7.8,6],target:[-2,0,-7],span:6.5},
 redleaves:{name:'坡石红叶 · 掌裂与秋色',position:[-9.4,4.7,10],target:[-9.4,1.6,-1.8],span:5.2},
 left:{name:'左侧马群 · 坡石之间',position:[-5.3,4.8,14],target:[-5.3,1.25,.4],span:7.3},
 willow:{name:'柳下灰马 · 灰斑与垂枝',position:[1.3,4.3,14],target:[1.3,1.7,1],span:6.7},
 canopy:{name:'柳冠近看 · 枝序与垂梢',position:[1.8,7.6,15],target:[1.8,5.8,.8],span:6.1},
 right:{name:'牧者花马 · 沿岸静立',position:[9,3.5,13],target:[9,1.15,2],span:5.6}
};
export class CameraDirector{
 constructor(camera){this.camera=camera;this.target=new THREE.Vector3();this.endPos=new THREE.Vector3();this.endTarget=new THREE.Vector3();this.span=13;this.endSpan=13;this.key='home';this.resize();this.go('home',true);}
 resize(){this.aspect=innerWidth/innerHeight;this.updateProjection();}
 updateProjection(){const s=this.span,a=this.aspect;this.camera.left=-s*a/2;this.camera.right=s*a/2;this.camera.top=s/2;this.camera.bottom=-s/2;this.camera.updateProjectionMatrix();}
 go(key,instant=false){const v=views[key];this.key=key;this.endPos.fromArray(v.position);this.endTarget.fromArray(v.target);const minWidth={home:25.5,river:12,redleaves:6.5,left:8.4,willow:5.3,canopy:7.8,right:5.8}[key];this.endSpan=Math.max(v.span,minWidth/this.aspect);if(this.aspect<.8&&key==='willow'){this.endPos.x=.7;this.endTarget.x=.7;}if(instant){this.camera.position.copy(this.endPos);this.target.copy(this.endTarget);this.span=this.endSpan;}this.tick(instant?1:0);}
 focus(x,z){this.key='detail';this.endTarget.set(x,1.25,z);this.endPos.set(x+1.8,3.6,z+9);this.endSpan=Math.max(4.9,4/this.aspect);}
 pan(delta){const x=Math.max(-10,Math.min(10,this.endTarget.x+delta)),dx=x-this.endTarget.x;this.endPos.x+=dx;this.endTarget.x=x;}
 tick(dt){const alpha=1-Math.exp(-dt*6);this.camera.position.lerp(this.endPos,alpha);this.target.lerp(this.endTarget,alpha);this.span=THREE.MathUtils.lerp(this.span,this.endSpan,alpha);this.camera.lookAt(this.target);this.updateProjection();}
}
