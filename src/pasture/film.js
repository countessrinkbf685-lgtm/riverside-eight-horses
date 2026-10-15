import './film.css';
export const filmDuration=48;
// Each pair is an intentional, slow orthographic dolly; cuts preserve screen direction.
export const filmShots=[
 {name:'水岸初醒',sub:'郎世宁《郊原牧马图卷》意境再现',from:[-1.2,8.7,25,-1.2,3.1,-.6,15.6],to:[0,8.3,24,0,3,-.6,14.5],hour:[7.1,8],season:[0,0]},
 {name:'八骏闲游',sub:'俯仰之间，自有生意',from:[-6.4,4.6,14,-6.4,1.5,.2,6.3],to:[-6,4.4,13.5,-6,1.45,.2,6],hour:[8.5,9],season:[0,0]},
 {name:'柳影低回',sub:'垂枝拂岸，灰马悠然',from:[.15,4.1,13,.15,1.85,1,6.1],to:[.65,4,12.5,.65,1.8,1,5.7],hour:[9,10],season:[1,1]},
 {name:'牧者相伴',sub:'人马相安，水草之间',from:[9.15,3.8,13,9.15,1.7,2,5.6],to:[8.6,3.7,12.5,8.6,1.7,2,5.2],hour:[15,15.6],season:[2,2]},
 {name:'清流有声',sub:'沿永定河意象，溯一带清光',from:[-6,6,-3.3,-6,0,-9.3,4],to:[-4.8,5.8,-3.8,-4.8,0,-9.3,3.8],hour:[10,11],season:[1,1]},
 {name:'秋色入卷',sub:'柳梢与远山，相映成画',from:[2.5,8.8,15,2.5,6,.8,5.5],to:[1.4,8.5,14.5,1.4,5.8,.8,5.8],hour:[15.2,16.2],season:[2,2]},
 {name:'四时递嬗',sub:'春生 · 夏长 · 秋染 · 冬藏',from:[0,8.5,25,0,3.1,-.6,14.6],to:[0,8.5,25,0,3.1,-.6,14.6],hour:[10,10],season:[0,3]},
 {name:'昼夜流转',sub:'一卷水岸，十二时辰',from:[0,8.5,25,0,3.1,-.6,14.6],to:[.4,8.8,26,.4,3.15,-.6,15.4],hour:[16.5,24],season:[2,2]}
];
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function filmFrame(seconds){
 const time=Math.max(0,Math.min(filmDuration-1e-6,seconds)),index=Math.floor(time/6),local=time-index*6,u=local/6,s=smooth(u),shot=filmShots[index];
 const lerp=(a,b)=>a+(b-a)*s;
 return {index,time,local,shot,pose:shot.from.map((n,i)=>lerp(n,shot.to[i])),hour:lerp(...shot.hour),season:lerp(...shot.season),captionOpacity:smooth(local/.65)*smooth((6-local)/.55),fade:index===0?1-smooth(local/.8):index===7?smooth((local-5)/1):0};
}
export function installFilm({renderer,scene,camera,director,actors,seasons,timeOfDay,motionTime,state}){
 renderer.setAnimationLoop(null);renderer.setPixelRatio(1);state.motion=false;document.body.classList.add('filming');
 const overlay=document.createElement('div');overlay.id='film-overlay';
 overlay.innerHTML='<div id="film-caption"><span class="film-eyebrow"></span><h1></h1><p></p></div><div id="film-fade"></div>';
 document.body.append(overlay);
 const caption=overlay.querySelector('#film-caption'),eyebrow=caption.querySelector('span'),title=caption.querySelector('h1'),sub=caption.querySelector('p'),fade=overlay.querySelector('#film-fade');
 const offsets={H01:1.2,H02:4.1,H03:3.3,H04:5.4,H05:12.1,H06:7,H07:4,H08:17.4,P01:6.7};
 return {duration:filmDuration,shots:filmShots,
  async renderFrame(seconds){
   if(!Number.isFinite(seconds))throw new Error('Film time must be finite');
   const f=filmFrame(seconds),p=f.pose;
   seasons.setPhase(f.season);timeOfDay.setHour(f.hour);motionTime.value=f.time;
   for(const [id,actor] of actors)actor.userData.animation?.evaluate(f.time+(offsets[id]||0));
   camera.position.set(...p.slice(0,3));director.target.set(...p.slice(3,6));director.span=p[6];director.updateProjection();camera.lookAt(director.target);
   caption.style.opacity=String(f.captionOpacity);caption.className=f.index===0?'opening':f.index===7?'closing':'';
   eyebrow.textContent=f.index===0?'郊原牧马 · 数字画境':f.index===7?'四季 · 十二时辰':'沿水岸牧马';
   title.textContent=f.index===0||f.index===7?'沿水岸牧马':f.shot.name;
   sub.textContent=f.index===7?'一卷水岸，十二时辰':f.shot.sub;fade.style.opacity=String(f.fade);
   renderer.render(scene,camera);await renderer.backend.device.queue.onSubmittedWorkDone();
   return {time:f.time,shot:f.index+1,caption:title.textContent,hour:f.hour,season:f.season};
  }
 };
}
