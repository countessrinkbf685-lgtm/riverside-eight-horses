"""Per-actor landmark rigs, authored from video timing. Blender +X forward, +Z up.
Derived triangle studies, not mocap or production retopology. H06/H07 untouched.
Run Blender --background --python scripts/rig-cast.py -- H01 (or other cast ID).
"""
import bpy, math, json, sys
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
ID=sys.argv[sys.argv.index('--')+1];OUT=ROOT/'artifacts'/ID.lower()
# height, source rotation, neck base, poll, muzzle, dock, idle seconds
CONFIG={
 'H01':(2.02,180,(.48,0,1.16),(1.0,0,1.85),(1.26,0,1.44),(-.96,0,1.30),8),
 'H02':(1.99,180,(.47,0,1.20),(.99,.22,1.84),(1.24,.35,1.43),(-1.02,-.03,1.37),9),
 'H03':(2.04,225,(.46,-.15,1.23),(1.0,.14,1.86),(1.18,.34,1.45),(-1.0,.18,1.42),10),
 'H04':(2.03,180,(.42,0,1.18),(.97,.14,1.87),(1.18,.29,1.45),(-1.0,0,1.32),8.5),
 'H05':(2.01,0,(.42,.04,1.18),(.78,-.30,1.84),(.96,-.54,1.45),(-.99,.16,1.32),9.5),
 'H08':(1.98,180,(.48,0,1.14),(1.07,0,1.79),(1.28,0,1.40),(-1.02,0,1.31),11),
 'P01':(1.72,90,None,None,None,None,12)}
height,heading,base,poll,muzzle,dock,idleDuration=CONFIG[ID];human=ID=='P01'
REFERENCES={'H01':['00047139'],'H02':['aaab9a9b'],'H03':['76de8d3b','950383ab'],'H04':['c8ebd62b','3e726afb'],'H05':['fc893e1d','3b56819c'],'H08':['983f5252','df7c0ebc'],'P01':['8f3f59dd']}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'editable.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
p=np.array([v.co[:] for v in mesh.data.vertices]);p*=height/np.ptp(p[:,2]);p[:,2]-=p[:,2].min()
angle=math.radians(heading);p[:,:2]=p[:,:2]@np.array([[math.cos(angle),math.sin(angle)],[-math.sin(angle),math.cos(angle)]])
for v,co in zip(mesh.data.vertices,p):v.co=co
mesh.name=ID+'_derived_skin';mesh.data.update();x,y,z=p.T;spec={};legs={};sole_indices={}
def bone(n,a,b,parent=None):spec[n]=(Vector(a),Vector(b),parent)
def smooth(a,b,v):
 q=np.clip((v-a)/(b-a),0,1);return q*q*(3-2*q)
def ease(t):
 t=max(0,min(1,t));return t*t*t*(10+t*(-15+6*t))
bone('Root',(0,0,0),(0,0,.25))
if not human:
 base,poll,muzzle,dock=map(Vector,(base,poll,muzzle,dock))
 bone('Pelvis',(-.72,dock.y,1.23),(-.48,dock.y*.7,1.30),'Root')
 bone('Spine01',spec['Pelvis'][1],(-.12,dock.y*.4,1.29),'Pelvis')
 bone('Spine02',spec['Spine01'][1],(.20,base.y*.5,1.28),'Spine01')
 bone('Chest',spec['Spine02'][1],base+Vector((0,0,.1)),'Spine02')
 neck=[base,base.lerp(poll,.48),base.lerp(poll,.79),poll]
 for i in range(3):bone('Neck%02d'%(i+1),neck[i],neck[i+1],'Chest' if i==0 else 'Neck%02d'%i)
 bone('Head',poll,muzzle,'Neck03');bone('Jaw',poll.lerp(muzzle,.5),muzzle+Vector((0,0,-.03)),'Head')
 forward=(muzzle-poll);yaw=math.atan2(forward.y,forward.x);lateral=Vector((-math.sin(yaw),math.cos(yaw),0))
 for side,sign in [('L',1),('R',-1)]:
  ear=poll+lateral*(.075*sign)+Vector((0,0,.01))
  bone('Ear'+side+'01',ear,ear+Vector((.015,0,.07)),'Head');bone('Ear'+side+'02',ear+Vector((.015,0,.07)),ear+Vector((.03,0,height-poll.z-.005)),'Ear'+side+'01')
 tail=[dock]
 for h in np.linspace(dock.z-.17,.22,6):
  q=p[(x<dock.x+.015)&(abs(z-h)<.055)]
  co=np.median(q,axis=0) if len(q) else np.array(dock)+[-.1,0,0]
  co[2]=h;tail.append(Vector(co))
 for i in range(6):bone('Tail%02d'%i,tail[i],tail[i+1],'Pelvis' if i==0 else 'Tail%02d'%(i-1))
 # Assign each leg by its own horizontal center; tail excluded from hind legs.
 # Separate left/right feet per axle using the empty gap between hoof shells.
 # A global median can cut through a hoof on an asymmetrically posed source.
 splits={}
 for axle in ['F','H']:
  values=np.sort(y[(z<.08)&(x>0 if axle=='F' else (x<-.22)&(x>dock.x+.06))])
  j=int(np.argmax(np.diff(values)));splits[axle]=float((values[j]+values[j+1])/2)
 for tag in ['FL','FR','HL','HR']:
  splitY=splits[tag[0]]
  mask=(x>0 if tag[0]=='F' else (x<-.22)&(x>dock.x+.06))&(y>splitY if tag[1]=='L' else y<=splitY)
  def center(h):
   q=p[mask&(abs(z-h)<.045)];assert len(q),(ID,tag,h)
   co=np.median(q,axis=0);co[2]=h;return Vector(co)
  a,k,h,toe=center(.96),center(.53),center(.14),center(.045)
  legs[tag]=(a,k,h,toe)
  bone(tag+'Upper',a,k,'Chest' if tag[0]=='F' else 'Pelvis');bone(tag+'Lower',k,h,tag+'Upper')
  bone(tag+'Pastern',h,toe,tag+'Lower');bone(tag+'Hoof',toe,toe+Vector((.09,0,-.02)),tag+'Pastern')
  sole_indices[tag]=np.where(mask&(z<.008))[0].tolist()
else:
 bone('Pelvis',(0,0,.83),(0,0,1.01),'Root');bone('Spine01',(0,0,1.01),(0,0,1.18),'Pelvis');bone('Chest',(0,0,1.18),(0,0,1.37),'Spine01')
 bone('Neck',(0,0,1.37),(.01,0,1.49),'Chest');bone('Head',(.01,0,1.49),(.04,0,1.68),'Neck')
 for side,s in [('L',1),('R',-1)]:
  bone('Shoulder'+side,(0,s*.05,1.34),(0,s*.17,1.34),'Chest')
  bone('UpperArm'+side,(0,s*.17,1.34),(.01,s*.31,1.10),'Shoulder'+side)
  bone('Forearm'+side,(.01,s*.31,1.10),(.02,s*.41,.94),'UpperArm'+side)
  bone('Hand'+side,(.02,s*.41,.94),(.03,s*.46,.83),'Forearm'+side)
  bone('Sleeve'+side,(.01,s*.31,1.10),(.02,s*.39,.965),'UpperArm'+side)
  bone('Cuff'+side,(.02,s*.39,.965),(.025,s*.425,.905),'Sleeve'+side)
  bone('Thigh'+side,(0,s*.09,.89),(0,s*.10,.45),'Pelvis');bone('Shin'+side,(0,s*.10,.45),(0,s*.10,.13),'Thigh'+side)
  bone('Foot'+side,(0,s*.10,.13),(.12,s*.10,.055),'Shin'+side)
  bone('Coat'+side,(0,s*.12,.9),(0,s*.17,.58),'Pelvis')
  sole_indices[side]=np.where((z<.008)&(y>0 if s==1 else y<=0))[0].tolist()
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name=ID+'_RigStudy'
bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,(a,b,parent) in spec.items():
 eb=rig.data.edit_bones.new(name);eb.head=a;eb.tail=b
 if parent:eb.parent=rig.data.edit_bones[parent]
 eb.use_deform=name!='Root'
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
names=list(spec);groups={n:mesh.vertex_groups.new(name=n) for n in names}
def distance(a,b):
 a=np.array(a);b=np.array(b);d=b-a;t=np.clip(((p-a)*d).sum(axis=1)/(d*d).sum(),0,1)
 return np.linalg.norm(p-a-t[:,None]*d,axis=1)
w=np.zeros((len(p),len(names)))
if not human:
 tailmask=(1-smooth(dock.x-.04,dock.x+.10,x))*(1-smooth(dock.z-.12,dock.z+.05,z))
 legmask=1-smooth(.76,1.10,z)
 neckmask=smooth(base.x-.16,base.x+.23,x)*smooth(base.z-.12,base.z+.28,z)
 # Yawed head uses distance to its sagittal axis, not a global X cutoff.
 dhead=(muzzle-poll);fwd=Vector((dhead.x,dhead.y,0)).normalized()
 along=(p-np.array(poll))@np.array(fwd)
 headmask=smooth(-.15,-.035,along)*smooth(1.16,1.39,z)
 for i,name in enumerate(names):
  if name=='Root':continue
  a,b,_=spec[name];d=distance(a,b)
  if name.startswith('Tail'):mask=tailmask;fall=.075
  elif name[:2] in legs:
   tag=name[:2];splitY=splits[tag[0]];region=(smooth(-.1,.1,x) if tag[0]=='F' else 1-smooth(-.35,-.10,x))*(smooth(splitY-.035,splitY+.035,y) if tag[1]=='L' else 1-smooth(splitY-.035,splitY+.035,y))
   mask=legmask*region*(1-tailmask);fall=.10
  elif name.startswith('Ear'):mask=smooth(poll.z+.015,poll.z+.09,z)*headmask;fall=.045
  elif name in ['Head','Jaw']:
   mask=headmask*(1-smooth(poll.z+.015,poll.z+.11,z));fall=.20
   if name=='Jaw':mask*=.06
  elif name.startswith('Neck'):mask=neckmask*(1-headmask);fall=.22
  else:mask=(1-legmask)*(1-neckmask)*(1-tailmask);fall=.30
  w[:,i]=np.exp(-(d/fall)**2)*mask
 for tag in legs:
  splitY=splits[tag[0]]
  mask=(x>0 if tag[0]=='F' else x<-.22)&(y>splitY if tag[1]=='L' else y<=splitY)&(z<.11)
  w[mask]=0;w[mask,names.index(tag+'Hoof')]=1
 if ID in ['H01','H02']:
  # Hanging source-tail cards extend outside the narrow dock mask. Keep the
  # entire free tail on its chain, avoiding pelvis-weighted fins in a deep bow.
  cut=dock.x+.17-.08*smooth(.80,1.15,z)
  free=(x<cut)&(z<dock.z-.17)
  w[free]=0
  for i,name in enumerate(names):
   if name.startswith('Tail'):w[free,i]=np.exp(-(distance(*spec[name][:2])[free]/.22)**2)
 muzzle_indices=np.where((along>.17)&(z>muzzle.z-.10)&(z<muzzle.z+.07))[0].tolist()
else:
 arm=smooth(.16,.25,abs(y))*smooth(.74,.89,z);head=smooth(1.38,1.50,z);coat=(1-smooth(.89,1.03,z))*smooth(.48,.65,z)
 for i,name in enumerate(names):
  if name=='Root':continue
  a,b,_=spec[name];d=distance(a,b);fall=.15
  if name.startswith(('Shoulder','UpperArm','Forearm','Hand','Sleeve','Cuff')):
   mask=arm*(1-head)*(smooth(-.02,.02,y) if name.endswith('L') else 1-smooth(-.02,.02,y));fall=.095
   if name.startswith('Hand'):mask*=1-smooth(.885,.935,z);fall=.065
   elif name.startswith(('Sleeve','Cuff')):mask*=smooth(.885,.925,z)*(1-smooth(1.08,1.16,z));fall=.12
   elif name.startswith('Forearm'):mask*=.15
  elif name=='Head':mask=head;fall=.18
  elif name=='Neck':mask=smooth(1.30,1.39,z)*(1-head);fall=.12
  elif name.startswith('Coat'):mask=coat*(1-arm);fall=.19
  elif name.startswith(('Thigh','Shin','Foot')):mask=(1-smooth(.50,.72,z))*(smooth(-.01,.01,y) if name.endswith('L') else 1-smooth(-.01,.01,y));fall=.11
  else:mask=(1-arm)*(1-head)*(1-coat)*smooth(.65,.92,z);fall=.20
  w[:,i]=np.exp(-(d/fall)**2)*mask
 for side in ['L','R']:
  mask=(z<.18)&(y>0 if side=='L' else y<=0);w[mask]=0;w[mask,names.index('Foot'+side)]=1
 muzzle_indices=[]
for vi,weights in enumerate(w):
 top=np.argsort(weights)[-4:];total=weights[top].sum()
 if total<1e-15:top=[names.index('Pelvis')];weights[top]=1;total=1
 for j in top:
  if weights[j]/total>1e-6:groups[names[j]].add([vi],float(weights[j]/total),'REPLACE')
mod=mesh.modifiers.new('Actor skin','ARMATURE');mod.object=rig;mesh.parent=rig
CLIPS={'Neutral':1,'Idle':idleDuration}
if ID in ['H03','P01']:CLIPS['Look']=10 if human else 8
if human:CLIPS={'APose':1,**CLIPS}
painting=ID in ['H01','H02']
if painting:CLIPS.update(Painting=1,PaintingIdle=idleDuration,PaintingDown=3.2,PaintingUp=3.2)
graze=ID in ['H04','H05','H08'];down=1.6 if ID=='H08' else 2;hold=2.7 if ID=='H08' else 3.6;up=1.6 if ID=='H08' else 1.8
if graze:CLIPS.update(GrazeDown=down,GrazeLoop=hold,GrazeUp=up,Graze=1+down+hold+up+1)
PERIOD=2.4;DUTY=.72;STRIDE=.16;SPEED=STRIDE/(PERIOD*DUTY);ONSETS={'HL':0,'FL':.25,'HR':.5,'FR':.75}
if ID=='H04':CLIPS['Walk']=PERIOD
grazePitch=1.0
def pose(t,mode):
 if mode=='Graze':
  if t<1:return pose(0,'Neutral')
  if t<1+down:return pose(t-1,'GrazeDown')
  if t<1+down+hold:return pose(t-1-down,'GrazeLoop')
  if t<1+down+hold+up:return pose(t-1-down-hold,'GrazeUp')
  return pose(0,'Neutral')
 posed={};phase=t/idleDuration*math.tau;idle=mode in ['Idle','PaintingIdle'];env=math.sin(phase/2)**2;walk=mode=='Walk'
 fold=(ease(t/3.2) if mode=='PaintingDown' else 1-ease(t/3.2) if mode=='PaintingUp' else 1) if mode.startswith('Painting') else 0
 body=Vector((0,0,-.035)) if walk else Vector((0,0,0))
 body.z-=.08*fold
 bodyrot=Matrix.Rotation(math.radians(32 if ID=='H01' else 25)*fold,3,'Y');hip=spec['Pelvis'][0]
 def bodypoint(p):return hip+bodyrot@(p-hip)+body
 amount=ease(t/down) if mode=='GrazeDown' else 1-ease(t/up) if mode=='GrazeUp' else 1 if mode=='GrazeLoop' else 0
 turn=(ease((t-.65)/1.45) if t<2.1 else 1-ease((t-3)/2)) if mode=='Look' else 0
 def place(name,origin,rot):
  rest=rig.data.bones[name];parent=spec[name][2];desired=Matrix.Translation(origin)@(rot@rest.matrix_local.to_3x3()).to_4x4();basis=rest.matrix_local.inverted()
  if parent:basis=basis@rig.data.bones[parent].matrix_local@posed[parent].inverted()
  rig.pose.bones[name].matrix_basis=basis@desired;posed[name]=desired
 if human:
  # Independent world-space boot/coat transforms hold the ground contact.
  look=math.radians(23)*(ease((t-.8)/1.2)-2*ease((t-3.2)/1.6)+ease((t-6.3)/1.7)) if mode=='Look' else math.radians(4)*math.sin(phase)*env if idle else 0
  for name,(a,b,parent) in spec.items():
   rot=Matrix.Identity(3);origin=a.copy()
   if name in ['Spine01','Chest']:rot=Matrix.Rotation(math.radians(.35)*math.sin(phase*2)*env if idle else 0,3,'Y')
   if name in ['Neck','Head']:rot=Matrix.Rotation(look*(.35 if name=='Neck' else 1),3,'Z')
   if name.startswith(('UpperArm','Forearm','Hand','Sleeve','Cuff')):
    side=name[-1];s=1 if side=='L' else -1;shoulder=spec['UpperArm'+side][0]
    rot=Matrix.Rotation(-s*math.radians(17+(2.4*math.sin(phase)*env if idle else 0)) if mode!='APose' else 0,3,'X');origin=shoulder+rot@(a-shoulder)
    if name.startswith(('Forearm','Hand','Sleeve','Cuff')) and mode!='APose':
     elbow=spec['Forearm'+side][0];elbowWorld=shoulder+rot@(elbow-shoulder)
     # Small elbow flexion takes hands clear of the robe. Cuffs keep a broad,
     # mostly rigid section, rather than sharing hand and torso weights.
     rot=Matrix.Rotation(math.radians(-9-(1.5*math.sin(phase+.6)*env if idle else 0)),3,'Y')@rot;origin=elbowWorld+rot@(a-elbow)
   if name.startswith('Coat'):rot=Matrix.Rotation(math.radians(.45)*math.sin(phase)*env if idle else 0,3,'X')
   place(name,origin,rot)
 else:
  for name in ['Root','Pelvis','Spine01','Spine02','Chest']:
   a,b,_=spec[name];place(name,bodypoint(a) if name!='Root' else a,(bodyrot if name!='Root' else Matrix.Identity(3))@Matrix.Rotation(math.radians(.28)*math.sin(phase*2)*env if idle and name.startswith('Spine') else 0,3,'X'))
  joint=bodypoint(base)
  for name,angle,look in [('Neck01',76,8),('Neck02',92,18),('Neck03',102,28)]:
   a,b,_=spec[name];d=b-a
   foldangle=({'Neck01':66,'Neck02':70,'Neck03':73} if ID=='H01' else {'Neck01':46,'Neck02':51,'Neck03':56})[name]
   rot=Matrix.Rotation(math.radians(-look*turn+((.7 if fold else 3)*math.sin(phase)*env if idle else 0)),3,'Z')@Matrix.Rotation(math.radians(angle)*amount*grazePitch+math.radians(foldangle)*fold+(math.radians(.4 if fold else .8)*math.sin(phase*2)*env if idle else 0),3,'Y')@Matrix.Rotation(-math.atan2(d.y,d.x),3,'Z')
   place(name,joint,rot);joint+=rot@d
  d=muzzle-poll
  headrot=Matrix.Rotation(math.radians(-36*turn+((1 if fold else 6)*math.sin(phase)*env if idle else 0)),3,'Z')@Matrix.Rotation(math.radians(5)*amount+math.radians(-50 if ID=='H01' else 0)*fold+(math.radians(.4 if fold else 1.5)*math.sin(phase*2)*env if idle else 0),3,'Y')@Matrix.Rotation(math.radians(55)*fold if ID=='H01' else 0,3,'X')@Matrix.Rotation(-math.atan2(d.y,d.x),3,'Z')
  if ID=='H01' and fold:
   curl=Matrix.Rotation(math.radians(130)*fold,3,'Y')@Matrix.Rotation(-math.atan2(d.y,d.x),3,'Z')
   headrot=Matrix.Rotation(math.radians(-60)*fold,3,'Z')@Matrix.Rotation(math.radians(55)*fold,3,(curl@d).normalized())@curl
  for name,(a,b,parent) in spec.items():
   if name in posed:continue
   if name.startswith(('Head','Jaw','Ear')):
    rot=headrot;origin=joint+rot@(a-poll)
    if name=='Jaw' and mode=='GrazeLoop':origin.z-=.003*math.sin(t/hold*math.tau*3)**2
    if name.startswith('Ear'):
     side=name[3];ear=spec['Ear'+side+'01'][0];flick=(16 if side=='L' else -12)*math.sin(phase*(2 if side=='L' else 3))*env if idle else 0
     rot=headrot@Matrix.Rotation(math.radians(flick),3,'X');origin=joint+headrot@(ear-poll)+rot@(a-ear)
    place(name,origin,rot)
   elif name.startswith('Tail'):
    i=int(name[-2:]);origin=bodypoint(a) if i==0 else posed['Tail%02d'%(i-1)]@Vector((0,rig.data.bones['Tail%02d'%(i-1)].length,0))
    tailphase=t/hold*math.tau if mode=='GrazeLoop' else phase
    swing=math.radians(9+i*2)*math.sin(tailphase-i*.12)*math.sin(tailphase/2)**2 if idle or mode=='GrazeLoop' else 0
    place(name,origin,Matrix.Rotation(math.radians(32 if ID=='H01' else 25)*fold*max(0,1-i/3),3,'Y')@Matrix.Rotation(swing,3,'X'))
   elif not walk and not fold:place(name,a,Matrix.Identity(3))
  if fold:
   for tag,(top,knee,ankle,toe) in legs.items():
    a=bodypoint(top);l1=(knee-top).length;l2=(ankle-knee).length
    if tag[0]=='F':
     # Fore-knee folds forward and down; cannon and hoof tuck back under chest.
     forefold=1-(1-fold)**2.5 # tuck the hoof before lowering the chest
     dz=max(.09,min(l1*.90,a.z-.14));offset=Vector((math.sqrt(max(0,l1*l1-dz*dz)),0,-dz))
     upper=(knee-top).rotation_difference(offset).slerp(Matrix.Identity(3).to_quaternion(),1-forefold).to_matrix();mid=a+upper@(knee-top)
     targetdir=Vector((-.88,0,.47)).normalized()*l2
     lower=(ankle-knee).rotation_difference(targetdir).slerp(Matrix.Identity(3).to_quaternion(),1-forefold).to_matrix();target=mid+lower@(ankle-knee)
     hoofrot=Matrix.Rotation(math.radians(-115)*forefold,3,'Y')
     shell=p[(x>0)&(y>splits['F'] if tag[1]=='L' else y<=splits['F'])&(z<.11)]
     lowest=float(((shell-np.array(ankle))@np.array(hoofrot).T+np.array(target))[:,2].min())
     if lowest<.003*ease(fold/.1):
      target.z+=.003*ease(fold/.1)-lowest
      axis=(target-a).normalized();dist=(target-a).length;along=(l1*l1-l2*l2+dist*dist)/(2*dist)
      pole=(mid-a)-axis*(mid-a).dot(axis);mid=a+axis*along+pole.normalized()*math.sqrt(max(0,l1*l1-along*along))
      upper=(knee-top).rotation_difference(mid-a).to_matrix();lower=(ankle-knee).rotation_difference(target-mid).to_matrix()
    else:
     target=ankle.copy();axis=(target-a).normalized();dist=(target-a).length
     assert dist<l1+l2+1e-5,(ID,tag,'painting hind reach',dist-l1-l2)
     along=(l1*l1-l2*l2+dist*dist)/(2*dist);restaxis=(ankle-top).normalized();pole=(knee-top)-restaxis*(knee-top).dot(restaxis)
     if pole.length<.001:pole=Vector((-1,0,0))
     bend=(pole-axis*pole.dot(axis)).normalized();mid=a+axis*along+bend*math.sqrt(max(0,l1*l1-along*along));upper=(knee-top).rotation_difference(mid-a).to_matrix();lower=(ankle-knee).rotation_difference(target-mid).to_matrix();hoofrot=Matrix.Identity(3)
    place(tag+'Upper',a,upper);place(tag+'Lower',mid,lower);place(tag+'Pastern',target,hoofrot);place(tag+'Hoof',target+hoofrot@(toe-ankle),hoofrot)
  if walk:
   for tag,(top,knee,ankle,toe) in legs.items():
    ph=(t/PERIOD-ONSETS[tag])%1;target=ankle.copy()
    if ph<DUTY:target.x+=STRIDE*.5-STRIDE*ph/DUTY
    else:
     u=(ph-DUTY)/(1-DUTY);target.x+=-STRIDE*.5+STRIDE*u*u*(3-2*u);target.z+=.06*math.sin(math.pi*u)**2
    a=top+body;l1=(knee-top).length;l2=(ankle-knee).length;axis=(target-a).normalized();dist=(target-a).length
    assert dist<l1+l2,(ID,tag,'unreachable IK',dist-l1-l2)
    along=(l1*l1-l2*l2+dist*dist)/(2*dist);restaxis=(ankle-top).normalized();pole=(knee-top)-restaxis*(knee-top).dot(restaxis)
    if pole.length<.001:pole=Vector((1 if tag[0]=='F' else -1,0,0))
    bend=(pole-axis*pole.dot(axis)).normalized();mid=a+axis*along+bend*math.sqrt(max(0,l1*l1-along*along))
    for name,start,end in [(tag+'Upper',a,mid),(tag+'Lower',mid,target),(tag+'Pastern',target,toe+target-ankle),(tag+'Hoof',toe+target-ankle,spec[tag+'Hoof'][1]+target-ankle)]:
     rest=spec[name][1]-spec[name][0];rot=rest.rotation_difference(end-start).to_matrix();place(name,start,rot)
 bpy.context.view_layer.update()
def evaluated():
 ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh();q=np.array([v.co[:] for v in em.vertices]);ev.to_mesh_clear();return q
if graze:
 assert len(muzzle_indices)>10,(ID,'missing muzzle')
 # Tune the lowest actual muzzle vertices to 22 mm above the plane, not just a bone.
 lo,hi=.65,1.35
 for _ in range(18):
  grazePitch=(lo+hi)/2;pose(0,'GrazeLoop');clearance=float(evaluated()[muzzle_indices,2].min())
  if clearance>.022:lo=grazePitch
  else:hi=grazePitch
 print(ID,'grazing calibration',grazePitch,clearance,flush=True)
scene=bpy.context.scene;scene.render.fps=30;actions={};contacts={}
for mode,duration in CLIPS.items():
 rig.animation_data_clear();maxdrift=0;maxheight=0;initial=None;minmuzzle=100;support_origins={}
 for frame in range(round(duration*30)+1):
  t=frame/30;pose(0 if frame==round(duration*30) and mode in ['Idle','PaintingIdle','Look','GrazeLoop','Walk'] else t,mode)
  for pb in rig.pose.bones:
   pb.rotation_mode='QUATERNION';pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_quaternion',frame=frame)
  if frame%3==0 or frame==round(duration*30):
   q=evaluated()
   if initial is None:initial=q.copy()
   for tag,ids in sole_indices.items():
    if mode.startswith('Painting') and tag.startswith('F'):continue
    assert len(ids)>0,(ID,tag,'no soles')
    if mode=='Walk':
     if (t/PERIOD-ONSETS[tag])%1>=DUTY:support_origins.pop(tag,None);continue
     points=q[ids].copy();points[:,0]+=t*SPEED
     if tag not in support_origins:support_origins[tag]=points.copy()
     maxdrift=max(maxdrift,float(np.linalg.norm(points-support_origins[tag],axis=1).max()))
    else:maxdrift=max(maxdrift,float(np.linalg.norm(q[ids]-initial[ids],axis=1).max()))
    maxheight=max(maxheight,float(abs(q[ids,2]).max()))
   if muzzle_indices:minmuzzle=min(minmuzzle,float(q[muzzle_indices,2].min()))
 action=rig.animation_data.action;action.name=mode;action.use_fake_user=True;actions[mode]=action
 contacts[mode]={'maxSoleHeightMeters':maxheight,'maxSupportDriftMeters':maxdrift,'minimumMuzzleHeightMeters':minmuzzle if muzzle_indices else None,'soleVertexCounts':{k:len(v) for k,v in sole_indices.items()}}
 print(ID,mode,contacts[mode],flush=True)
rig.animation_data_clear();rig.animation_data_create()
for name,action in actions.items():
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
pose(0,'APose' if human else 'Neutral');bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'rigged.glb'),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_skins=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(ID+'-rig-study.blend')))
report={'asset':ID,'stage':'derived triangle deformation study; art cleanup and retopology pending','method':'per-actor landmarks, regional weights, video-referenced authored timing; not motion capture','forwardAxis':'+X','sourceRotationDegrees':heading,'bones':len(spec),'vertices':len(p),'clips':CLIPS,'contacts':contacts,'grazePitchScale':grazePitch if graze else None,'soleIndices':sole_indices,'muzzleBindSelection':{'poll':list(poll),'forward':list(fwd),'alongMin':.17,'zMin':muzzle.z-.10,'zMax':muzzle.z+.07} if not human else None,'landmarks':{k:{'head':list(a),'tail':list(b),'parent':par} for k,(a,b,par) in spec.items()},'limitations':['stationary clips only; terrain locomotion pending','H01/H02 painting crouch not authored'] if not human else ['fingers remain fused source geometry','no rope or locomotion; sleeve cleanup and retopology pending']}
report['soleSplitY']=splits if not human else None
if painting:
 report['paintingPose']={'source':'public/references/original.jpg','interpretation':'H01 deep bow with rolled head; H02 forelimbs folded with hind support. Hidden limbs reconstructed, not observed.','supportFeet':['HL','HR'],'clips':['Painting','PaintingIdle','PaintingDown','PaintingUp']}
 report['limitations']=['hidden limbs in painting reconstructed anatomically; exact 3D pose not recoverable','derived triangle topology; manual art refinement still possible']
if human:
 report['sleeveRefinement']={'controls':['SleeveL','SleeveR','CuffL','CuffR'],'elbowFlexDegrees':9,'method':'separate cuff and sleeve weights; broad cuff cross sections; hands clear of robe'}
 report['limitations']=['fingers remain fused source geometry','skeletal cloth motion, not cloth simulation; derived triangle topology']
report['references']=['gemini_generated_video_'+key for key in REFERENCES[ID]]
report['referenceCaveat']='H03/H04 brown-horse identities and H05 assignments remain candidates; references guide timing only, actor anatomy comes from its own model.'
(OUT/'rig-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if ID=='H04':
 report.update(stanceFraction=DUTY,walkSpeedMetersPerSecond=SPEED,contactOnsets=ONSETS)
 report['limitations'][0]='Walk verified on flat stage; terrain locomotion pending'
 (OUT/'rig-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
