import {culturalChapters,horseCulture} from './culture-data.js';
import './culture.css';

export function installCulture({chooseView,showDetail,setSeason,compare,isReady}){
 const $=s=>document.querySelector(s),panel=$('#culture-panel'),toggle=$('#culture-toggle');let selected=0,opener=toggle;
 const tabs=$('#culture-chapters');
 for(const [i,c] of culturalChapters.entries()){
  const button=document.createElement('button');button.type='button';button.textContent=`${c.number} ${c.title.split('，')[0]}`;button.dataset.chapter=c.id;button.onclick=()=>select(i);tabs.append(button);
 }
 function render(){
  const c=culturalChapters[selected];$('#culture-tag').textContent=c.tag;$('#culture-title').textContent=c.title;$('#culture-intro').textContent=c.intro;$('#culture-body').textContent=c.body;$('#culture-quote').textContent=c.quote;$('#culture-attribution').textContent=c.attribution||'';$('#culture-source').textContent=c.source;$('#culture-progress').textContent=`${selected+1} / ${culturalChapters.length}`;
  tabs.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
  $('#culture-action').textContent=c.action;$('#culture-action').disabled=!isReady();$('#culture-prev').disabled=selected===0;$('#culture-next').disabled=selected===culturalChapters.length-1;
 }
 function select(index,navigate=true){panel.scrollTop=0;selected=Math.max(0,Math.min(culturalChapters.length-1,index));render();if(navigate&&isReady())chooseView(culturalChapters[selected].view);}
 function close(restoreFocus=true){panel.hidden=true;toggle.setAttribute('aria-expanded','false');document.querySelector('#app').classList.remove('reading-culture');if(restoreFocus)(opener?.offsetParent?opener:toggle).focus();}
 function open(id){opener=document.activeElement instanceof HTMLElement?document.activeElement:toggle;panel.hidden=false;toggle.setAttribute('aria-expanded','true');$('#detail').hidden=true;$('#app').classList.add('reading-culture');select(Math.max(0,culturalChapters.findIndex(c=>c.id===id)));$('#culture-close').focus();}
 toggle.onclick=()=>panel.hidden?open('horses'):close();$('#culture-close').onclick=()=>close();$('#culture-prev').onclick=()=>select(selected-1);$('#culture-next').onclick=()=>select(selected+1);
 $('#culture-action').onclick=()=>{const c=culturalChapters[selected];if(!isReady())return;if(c.actor){close(false);showDetail(c.actor);}else if(c.compare){close(false);compare();}else if(c.season){setSeason(c.season);chooseView(c.view);}else if(c.viewAction)chooseView(c.viewAction);};
 document.addEventListener('keydown',e=>{if(panel.hidden)return;if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();close();}else if(['ArrowLeft','ArrowRight','Home'].includes(e.key))e.stopPropagation();});
 $('#detail-culture-open').onclick=()=>open($('#detail-id').textContent==='P01'?'herder':'horses');
 return {open,close,refresh(){if(!panel.hidden)render();},get selected(){return culturalChapters[selected].id;},get visible(){return !panel.hidden;},describeActor(id){
  close(false);const horse=horseCulture[id];$('#detail-cultural-name').textContent=horse?.coat||'圉人 · 蓝衣牧者';$('#detail-cultural-note').textContent=horse?.note||'“圉人”是牧养马匹者的传统称呼。蓝衣、束带与腰侧鞘具延续原画形象；本项目不为他附会个人姓名、确定职衔或族属。';
 }};
}
