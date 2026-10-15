import * as THREE from 'three/webgpu';

// The entrance/exit match Idle at its loop boundary; all feet remain planted.
export const grazeSequence=[['Idle',8],['GrazeDown',1.7],['GrazeLoop',6.8],['GrazeUp',.8]];
export const lookSequence=[['Idle',8],['Look',8],['Idle',8]];
export function sequencePose(time,sequence=grazeSequence){
 const duration=sequence.reduce((sum,[,seconds])=>sum+seconds,0);
 let local=((time%duration)+duration)%duration;
 for(const [clip,seconds]of sequence){if(local<seconds)return {clip,time:local};local-=seconds;}
 return {clip:'Idle',time:0};
}
export function createGrazingAnimation(root,clips,sequence=grazeSequence){
 const mixer=new THREE.AnimationMixer(root),actions=Object.fromEntries(clips.map(c=>[c.name,mixer.clipAction(c)]));
 const animation={mixer,clips:clips.map(c=>c.name),active:null,time:0,
  evaluateClip(clip,time){
   const pose={clip,time},action=actions[clip];
   if(animation.active!==pose.clip){mixer.stopAllAction();action.reset().setLoop(pose.clip==='GrazeDown'||pose.clip==='GrazeUp'?THREE.LoopOnce:THREE.LoopRepeat,Infinity);action.clampWhenFinished=true;action.play();animation.active=pose.clip;}
   action.paused=false;action.time=pose.time%action.getClip().duration;
   mixer.update(0);
  },
  evaluate(time){
   const pose=sequencePose(time,sequence);animation.evaluateClip(pose.clip,pose.time);animation.time=time;mixer.time=time;
  },
  update(dt){animation.evaluate(animation.time+dt);}
 };
 animation.evaluate(0);return animation;
}
