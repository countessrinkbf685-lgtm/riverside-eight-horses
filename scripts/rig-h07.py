"""H07-specific stationary rig. Video-referenced authoring, not motion capture.
Canonical Blender axes +X forward, +Y left, +Z up; source rotated +90 degrees.
Source GLB untouched. Hoof chains remain fixed for Idle and Look.
"""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'artifacts/h07'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'editable.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
p=np.array([v.co[:] for v in mesh.data.vertices]);p*=1.96/np.ptp(p[:,2]);p[:,2]-=p[:,2].min()
p[:,:2]=np.column_stack((-p[:,1],p[:,0]))
for v,co in zip(mesh.data.vertices,p):v.co=co
mesh.name='H07_derived_skin';mesh.data.update();spec={}
def bone(name,a,b,parent=None):spec[name]=(Vector(a),Vector(b),parent)
bone('Root',(0,0,0),(0,0,.25))
bone('Pelvis',(-.76,0,1.22),(-.5,0,1.29),'Root')
bone('Spine01',(-.5,0,1.29),(-.15,0,1.26),'Pelvis')
bone('Spine02',(-.15,0,1.26),(.20,0,1.25),'Spine01')
bone('Chest',(.20,0,1.25),(.48,0,1.28),'Spine02')
bone('Neck01',(.45,0,1.20),(.66,0,1.48),'Chest')
bone('Neck02',(.66,0,1.48),(.88,.015,1.67),'Neck01')
bone('Neck03',(.88,.015,1.67),(1.055,.025,1.78),'Neck02')
bone('Head',(1.055,.025,1.78),(1.27,.065,1.39),'Neck03')
bone('Jaw',(1.12,.04,1.57),(1.26,.06,1.36),'Head')
for side,y in [('L',.11),('R',-.08)]:
 bone('Ear'+side+'01',(1.04,y,1.79),(1.07,y,1.87),'Head')
 bone('Ear'+side+'02',(1.07,y,1.87),(1.10,y,1.955),'Ear'+side+'01')
tail=[(-1.01,0,1.33),(-1.13,0,1.16),(-1.17,.008,.97),(-1.19,.008,.78),(-1.21,.01,.59),(-1.24,.015,.40),(-1.27,.02,.22)]
for i in range(6):bone('Tail%02d'%i,tail[i],tail[i+1],'Pelvis' if i==0 else 'Tail%02d'%(i-1))
x,y,z=p.T;sole_indices={};legs={}
for tag in ['FL','FR','HL','HR']:
 fore=tag[0]=='F';left=tag[1]=='L'
 mask=(x>0 if fore else (x<-.4)&(x>-.98))&(y>0 if left else y<0)
 def center(height):
  q=p[mask&(abs(z-height)<.035)]
  assert len(q), (tag,height)
  v=np.median(q,axis=0);v[2]=height;return Vector(v)
 a=center(.96);k=center(.53);h=center(.14);toe=center(.04)
 legs[tag]=(a,k,h,toe)
 bone(tag+'Upper',a,k,'Chest' if fore else 'Pelvis')
 bone(tag+'Lower',k,h,tag+'Upper')
 bone(tag+'Pastern',h,toe,tag+'Lower')
 bone(tag+'Hoof',toe,toe+Vector((.09,0,-.02)),tag+'Pastern')
 sole_indices[tag]=np.where(mask&(z<.008))[0].tolist()
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='H07_HorseStudy'
bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,(a,b,parent) in spec.items():
 eb=rig.data.edit_bones.new(name);eb.head=a;eb.tail=b
 if parent:eb.parent=rig.data.edit_bones[parent]
 eb.use_deform=name!='Root'
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
names=list(spec);groups={n:mesh.vertex_groups.new(name=n) for n in names}
def smooth(a,b,v):
 q=np.clip((v-a)/(b-a),0,1);return q*q*(3-2*q)
def distance(a,b):
 a=np.array(a);b=np.array(b);d=b-a;t=np.clip(((p-a)*d).sum(axis=1)/(d*d).sum(),0,1)
 return np.linalg.norm(p-a-t[:,None]*d,axis=1)
tailmask=(1-smooth(-1.08,-.99,x))*(1-smooth(1.15,1.38,z))
legmask=1-smooth(.75,1.08,z)
neckmask=smooth(.30,.65,x)*smooth(1.12,1.43,z)
# Sloping jaw boundary keeps the entire muzzle rigid while blending at the poll.
headmask=smooth(.91,1.04,x)*smooth(1.20,1.40,z)
w=np.zeros((len(p),len(names)))
for i,name in enumerate(names):
 if name=='Root':continue
 a,b,_=spec[name];d=distance(a,b)
 if name.startswith('Tail'):mask=tailmask;fall=.075
 elif name[:2] in legs:
  tag=name[:2];region=(smooth(-.1,.1,x) if tag[0]=='F' else 1-smooth(-.4,-.1,x))*(smooth(-.03,.03,y) if tag[1]=='L' else 1-smooth(-.03,.03,y))
  mask=legmask*region*(1-tailmask);fall=.10
 elif name.startswith('Ear'):mask=smooth(1.79,1.87,z)*headmask;fall=.04
 elif name in ['Head','Jaw']:
  mask=headmask*(1-smooth(1.80,1.90,z));fall=.20
  if name=='Jaw':mask*=.08
 elif name.startswith('Neck'):mask=neckmask*(1-headmask);fall=.20
 else:mask=(1-legmask)*(1-neckmask)*(1-tailmask);fall=.30
 w[:,i]=np.exp(-(d/fall)**2)*mask
for tag in legs:
 mask=(x>0 if tag[0]=='F' else x<-.4)&(y>0 if tag[1]=='L' else y<0)&(z<.11)
 w[mask]=0;w[mask,names.index(tag+'Hoof')]=1
for vi,weights in enumerate(w):
 top=np.argsort(weights)[-4:];total=weights[top].sum()
 if total<1e-15:top=[names.index('Spine02')];weights[top]=1;total=1
 for j in top:
  if weights[j]/total>1e-6:groups[names[j]].add([vi],float(weights[j]/total),'REPLACE')
mod=mesh.modifiers.new('Horse skin','ARMATURE');mod.object=rig;mesh.parent=rig
def ease(t):
 t=max(0,min(1,t));return t*t*t*(10+t*(-15+6*t))
CLIPS={'Neutral':1,'Idle':8,'Look':8}
def pose(t,mode):
 posed={};phase=t/8*math.tau;idle=mode=='Idle';envelope=math.sin(phase/2)**2
 turn=(ease((t-.65)/1.45) if t<2.1 else 1-ease((t-3.0)/2.0)) if mode=='Look' else 0
 def place(name,origin,rot):
  rest=rig.data.bones[name];parent=spec[name][2]
  desired=Matrix.Translation(origin)@(rot@rest.matrix_local.to_3x3()).to_4x4()
  basis=rest.matrix_local.inverted()
  if parent:basis=basis@rig.data.bones[parent].matrix_local@posed[parent].inverted()
  rig.pose.bones[name].matrix_basis=basis@desired;posed[name]=desired
 for name in ['Root','Pelvis','Spine01','Spine02','Chest']:
  a,b,_=spec[name];rot=Matrix.Rotation(math.radians(.28)*math.sin(phase*2)*envelope if idle and name.startswith('Spine') else 0,3,'X');place(name,a,rot)
 joint=spec['Neck01'][0].copy()
 for name,angle in [('Neck01',8),('Neck02',18),('Neck03',28)]:
  a,b,_=spec[name];yaw=math.radians(-angle*turn+(3*math.sin(phase)*envelope if idle else 0))
  rot=Matrix.Rotation(yaw,3,'Z')@Matrix.Rotation(math.radians(.8)*math.sin(phase*2)*envelope if idle else 0,3,'Y')
  place(name,joint,rot);joint+=rot@(b-a)
 poll=spec['Head'][0];headrot=Matrix.Rotation(math.radians(-36*turn+(6*math.sin(phase)*envelope if idle else 0)),3,'Z')@Matrix.Rotation(math.radians(1.5)*math.sin(phase*2)*envelope if idle else 0,3,'Y')
 for name,(a,b,parent) in spec.items():
  if name in posed:continue
  if name.startswith(('Head','Jaw','Ear')):
   rot=headrot;origin=joint+rot@(a-poll)
   if name.startswith('Ear'):
    side=name[3];base=spec['Ear'+side+'01'][0];flick=(16 if side=='L' else -12)*math.sin(phase*(2 if side=='L' else 3))*math.sin(phase/2)**2 if idle else (12 if side=='L' else -6)*turn
    rot=headrot@Matrix.Rotation(math.radians(flick),3,'X');origin=joint+headrot@(base-poll)+rot@(a-base)
   place(name,origin,rot)
  elif name.startswith('Tail'):
   i=int(name[-2:]);origin=spec[name][0] if i==0 else posed['Tail%02d'%(i-1)]@Vector((0,rig.data.bones['Tail%02d'%(i-1)].length,0))
   yaw=math.radians(14+i*3)*math.sin(phase-i*.12)*math.sin(phase/2)**2 if idle else 0
   place(name,origin,Matrix.Rotation(yaw,3,'X'))
  else:place(name,a,Matrix.Identity(3))
 bpy.context.view_layer.update()
scene=bpy.context.scene;scene.render.fps=30;actions={};contacts={}
for mode,duration in CLIPS.items():
 rig.animation_data_clear();max_drift=0;max_height=0;initial={}
 for frame in range(round(duration*30)+1):
  pose(0 if frame==round(duration*30) else frame/30,mode)
  for pb in rig.pose.bones:
   pb.rotation_mode='QUATERNION';pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_quaternion',frame=frame)
  ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh()
  for tag,ids in sole_indices.items():
   q=np.array([em.vertices[i].co[:] for i in ids]);assert len(q),tag
   if frame==0:initial[tag]=q.copy()
   max_drift=max(max_drift,float(np.linalg.norm(q-initial[tag],axis=1).max()));max_height=max(max_height,float(abs(q[:,2]).max()))
  ev.to_mesh_clear()
 action=rig.animation_data.action;action.name=mode;action.use_fake_user=True;actions[mode]=action
 contacts[mode]={'maxSoleHeightMeters':max_height,'maxSupportDriftMeters':max_drift,'soleVertexCounts':{k:len(v) for k,v in sole_indices.items()}}
rig.animation_data_clear();rig.animation_data_create()
for name,action in actions.items():
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
pose(0,'Neutral');bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'rigged.glb'),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_skins=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'H07-rig-study.blend'))
report={'asset':'H07','stage':'derived triangle deformation study; art cleanup and retopology pending','method':'H07-specific anatomical landmarks and regional weights; video-referenced authored timing, not motion capture','forwardAxis':'+X','sourceRotationDegrees':90,'bones':len(spec),'vertices':len(p),'triangles':len(mesh.data.polygons),'clips':CLIPS,'contacts':contacts,'references':['gemini_generated_video_f155de74.mp4','gemini_generated_video_17c07da1.mp4'],'timing':{'Idle':'settled four-hoof stance; omit initial lifted hoof','Look':'neutral 0-.65; turn .65-2.1; hold 2.1-3; return 3-5; settle 5-8'},'soleIndices':sole_indices,'landmarks':{k:{'head':list(a),'tail':list(b),'parent':par} for k,(a,b,par) in spec.items()}}
(OUT/'rig-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('H07_REPORT',json.dumps({'bones':len(spec),'contacts':contacts}))
