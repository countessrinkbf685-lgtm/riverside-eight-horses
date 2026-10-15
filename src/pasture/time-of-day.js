// Art-directed apparent solar time; not a date/location ephemeris.
export const timePeriods=[
 {key:'zi',name:'子时',hour:0,range:'23:00–01:00',mood:'夜半'},
 {key:'chou',name:'丑时',hour:2,range:'01:00–03:00',mood:'鸡鸣'},
 {key:'yin',name:'寅时',hour:4,range:'03:00–05:00',mood:'平旦'},
 {key:'mao',name:'卯时',hour:6,range:'05:00–07:00',mood:'日出'},
 {key:'chen',name:'辰时',hour:8,range:'07:00–09:00',mood:'食时'},
 {key:'si',name:'巳时',hour:10,range:'09:00–11:00',mood:'隅中'},
 {key:'wu',name:'午时',hour:12,range:'11:00–13:00',mood:'日中'},
 {key:'wei',name:'未时',hour:14,range:'13:00–15:00',mood:'日昳'},
 {key:'shen',name:'申时',hour:16,range:'15:00–17:00',mood:'晡时'},
 {key:'you',name:'酉时',hour:18,range:'17:00–19:00',mood:'日入'},
 {key:'xu',name:'戌时',hour:20,range:'19:00–21:00',mood:'黄昏'},
 {key:'hai',name:'亥时',hour:22,range:'21:00–23:00',mood:'人定'}
];
export const wrapHour=hour=>((hour%24)+24)%24;
export const periodAt=hour=>timePeriods[Math.floor((wrapHour(hour)+1)/2)%12];
// sun, ambient, reflection, moon, warmth, seasonal-sky contribution.
const samples=[
 [0,.105,.045,.24,0,0],[0,.09,.035,.20,0,0],
 [0,.12,.055,.12,.05,.03],[.26,.46,.38,0,1,.32],
 [.82,.90,.90,0,.25,.93],[1,1,1,0,.02,1],
 [1.12,1.03,1.04,0,0,1],[1.04,1,1,0,.04,1],
 [.78,.85,.84,0,.42,.90],[.18,.38,.28,.025,1,.20],
 [0,.14,.065,.15,.12,.015],[0,.115,.05,.22,0,0]
];
export function sampleTime(hour){
 hour=wrapHour(hour);const phase=hour/2,i=Math.floor(phase),f=phase-i,t=f*f*(3-2*f);
 const values=samples[i].map((n,k)=>n+(samples[(i+1)%12][k]-n)*t);
 return Object.fromEntries(['sun','ambient','reflection','moon','warmth','daylight'].map((key,k)=>[key,values[k]]));
}
export function createTimeController(apply,onChange=()=>{}){
 let hour=8,auto=false,transition=null;const cycleSeconds=240;
 const status=()=>({hour,key:periodAt(hour).key,auto,transitioning:!!transition,cycleSeconds});
 function emit(){apply({...sampleTime(hour),hour});onChange(status());}
 return {
  initialize:emit,
  setHour(value){if(!Number.isFinite(value))throw new Error('Hour must be finite');hour=wrapHour(value);auto=false;transition=null;emit();},
  select(key,{instant=false}={}){
   const period=timePeriods.find(p=>p.key===key);if(!period)throw new Error('Unknown time period: '+key);
   auto=false;
   if(instant){hour=period.hour;transition=null;}else{const delta=wrapHour(period.hour-hour+12)-12;transition={from:hour,delta,elapsed:0};}
   emit();
  },
  setAuto(value){auto=Boolean(value);transition=null;emit();},
  update(dt,running){
   if(!running||!Number.isFinite(dt)||dt<=0)return;
   if(transition){transition.elapsed+=dt;const t=Math.min(1,transition.elapsed/2),s=t*t*(3-2*t);hour=wrapHour(transition.from+transition.delta*s);if(t===1)transition=null;emit();}
   else if(auto){hour=wrapHour(hour+dt*24/cycleSeconds);emit();}
  },
  get status(){return status();}
 };
}
