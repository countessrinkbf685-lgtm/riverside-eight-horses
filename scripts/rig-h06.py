"""H06 animation study. Derived triangle mesh, landmark skinning, authored clips.
Not automatic motion capture, production retopology, or a terrain locomotion rig.
Blender axes: +X forward, +Y left, +Z up. All authored coordinates in metres.
"""
import bpy, math, json, runpy
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'artifacts/h06'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'editable.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
p=np.array([v.co[:] for v in mesh.data.vertices]);scale=2.02/np.ptp(p[:,2]);p*=scale;p[:,2]-=p[:,2].min()
for v,co in zip(mesh.data.vertices,p):v.co=co
mesh.name='H06_derived_skin'; mesh.data.update()
spec={}
def bone(name,a,b,parent=None):spec[name]=(Vector(a),Vector(b),parent)
bone('Root',(0,0,0),(0,0,.25))
bone('Pelvis',(-.7,.06,1.25),(-.45,.04,1.33),'Root')
bone('Spine01',(-.45,.04,1.33),(-.16,.02,1.31),'Pelvis')
bone('Spine02',(-.16,.02,1.31),(.12,0,1.31),'Spine01')
bone('Spine03',(.12,0,1.31),(.38,-.01,1.32),'Spine02')
bone('Chest',(.38,-.01,1.32),(.58,-.04,1.37),'Spine03')
bone('Neck01',(.42,-.01,1.08),(.70,-.13,1.52),'Chest')
bone('Neck02',(.70,-.13,1.52),(.81,-.23,1.69),'Neck01')
bone('Neck03',(.81,-.23,1.69),(.95,-.32,1.82),'Neck02')
bone('Head',(.95,-.32,1.82),(1.06,-.50,1.46),'Neck03')
bone('Jaw',(1.01,-.39,1.61),(1.06,-.53,1.40),'Head')
for side,y,x in [('L',-.23,1.09),('R',-.36,.94)]:
    bone('Ear'+side+'01',(x,y,1.83),(x+.025,y,1.93),'Head')
    bone('Ear'+side+'02',(x+.025,y,1.93),(x+.04,y,2.015),'Ear'+side+'01')
tail=[(-.88,.065,1.47),(-.98,.067,1.31),(-.99,.074,1.12),(-.98,.09,.94),(-.96,.11,.75),(-.92,.12,.57),(-.87,.12,.40),(-.84,.12,.25)]
for i in range(7):bone('Tail%02d'%i,tail[i],tail[i+1],'Pelvis' if i==0 else 'Tail%02d'%(i-1))
feet={}; legs={}
for tag in ['HL','FL','HR','FR']:
    fore=tag[0]=='F'; left=tag[1]=='L'
    mask=(p[:,0]>0 if fore else (p[:,0]<-.4)&(p[:,0]>-.83))&(p[:,1]>.06 if left else p[:,1]<0)
    def center(z):
        q=np.median(p[mask&(abs(p[:,2]-z)<.035)],axis=0);q[2]=z;return Vector(q)
    sole=center(.035);sole.z=0
    ankle=center(.15);knee=center(.55)
    top=center(.9);top.z=1.01 if fore else 1.08
    if not fore:top.x+=.1 # stifle in front of the hock
    hip=Vector((.49 if fore else -.65,top.y,1.34))
    cannon=center(.31);pastern=center(.075)
    feet[tag]=sole;legs[tag]=(top,knee,ankle,pastern)
    parent='Chest' if fore else 'Pelvis'
    bone(tag+'Shoulder' if fore else tag+'Hip',hip,top,parent)
    bone(tag+'Upper',top,knee,tag+'Shoulder' if fore else tag+'Hip')
    bone(tag+'Lower',knee,cannon,tag+'Upper')
    bone(tag+'Cannon',cannon,ankle,tag+'Lower')
    bone(tag+'Pastern',ankle,pastern,tag+'Cannon')
    bone(tag+'Hoof',pastern,pastern+Vector((.09,0,-.025)),tag+'Pastern')

bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='H06_HorseStudy'
bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,(a,b,parent) in spec.items():
    eb=rig.data.edit_bones.new(name);eb.head=a;eb.tail=b
    if parent:eb.parent=rig.data.edit_bones[parent]
    eb.use_deform=name!='Root'
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
names=list(spec);groups={name:mesh.vertex_groups.new(name=name) for name in names}
def smooth(a,b,x):
    q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
def distance(a,b):
    a=np.array(a);b=np.array(b);d=b-a;t=np.clip(((p-a)*d).sum(axis=1)/(d*d).sum(),0,1)
    return np.linalg.norm(p-(a+t[:,None]*d),axis=1)
x,y,z=p.T;weights=np.zeros((len(p),len(names)))
# Regional masks prevent opposite limbs, belly and hanging tail stealing weights.
tailmask=(1-smooth(-.88,-.82,x))*smooth(.18,.30,z)*(1-smooth(1.4,1.55,z))
legmask=1-smooth(.82,1.12,z)
neckmask=smooth(.48,.76,x)*smooth(1.0,1.5,z)
headmask=smooth(.83,.95,x)*smooth(1.25,1.6,z)
for i,name in enumerate(names):
    if name=='Root':continue
    a,b,_=spec[name];d=distance(a,b)
    if name.startswith('Tail'):mask=tailmask;fall=.065
    elif name[:2] in legs:
        tag=name[:2];fore=tag[0]=='F';left=tag[1]=='L'
        region=(smooth(-.15,.15,x) if fore else 1-smooth(-.4,-.1,x))*(smooth(-.015,.045,y) if left else 1-smooth(-.015,.045,y))
        mask=legmask*region*(1-tailmask);fall=.075
        if 'Shoulder' in name or 'Hip' in name:mask=region*smooth(.75,1.02,z)*(1-smooth(1.25,1.5,z))*(1-tailmask);fall=.14
    elif name.startswith('Ear'):
        mask=smooth(1.82,1.91,z)*headmask;fall=.038
    elif name in ['Head','Jaw']:
        mask=headmask*(1-smooth(1.82,1.93,z));fall=.13
        if name=='Jaw':mask*=.08
    elif name.startswith('Neck'):
        mask=neckmask*(1-headmask);fall=.18
    else:mask=(1-legmask)*(1-neckmask)*(1-tailmask);fall=.27
    weights[:,i]=np.exp(-np.square(d/fall))*mask
# Hoof shell stays rigid, including the bottom rings that are measured later.
sole_indices={}
for tag in legs:
    fore=tag[0]=='F';left=tag[1]=='L'
    mask=(x>0 if fore else x<-.4)&(y>.04 if left else y<.04)&(z<.095)
    weights[mask]=0;weights[mask,names.index(tag+'Hoof')]=1
    sole_indices[tag]=np.where(mask&(z<.003))[0].tolist()
for vi,w in enumerate(weights):
    top=np.argsort(w)[-4:];total=w[top].sum()
    if total<1e-15:top=[names.index('Spine02')];w[top]=1;total=1
    for j in top:
        if w[j]/total>1e-6:groups[names[j]].add([vi],float(w[j]/total),'REPLACE')
mod=mesh.modifiers.new('Horse skin','ARMATURE');mod.object=rig;mesh.parent=rig
for mat in mesh.data.materials:
    bsdf=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if bsdf:bsdf.inputs['Roughness'].default_value=.87;bsdf.inputs['Metallic'].default_value=0

def segment(name,a,b):
    rest=rig.data.bones[name];delta=(rest.tail_local-rest.head_local).rotation_difference(b-a)
    return Matrix.Translation(a)@(delta.to_matrix()@rest.matrix_local.to_3x3()).to_4x4()
def solve(a,t,l1,l2,pole):
    axis=(t-a).normalized();dist=(t-a).length
    if dist>l1+l2+1e-5:raise ValueError('Unreachable hoof: '+str(dist-l1-l2))
    d=max(.001,min(dist,l1+l2-1e-7));along=(l1*l1-l2*l2+d*d)/(2*d)
    bend=(pole-axis*pole.dot(axis)).normalized()
    return a+axis*along+bend*math.sqrt(max(0,l1*l1-along*along))
PERIOD=2.4;DUTY=.72;STRIDE=.18;SPEED=STRIDE/(PERIOD*DUTY)
onsets={'HL':0,'FL':.25,'HR':.5,'FR':.75}
CLIPS={'Idle':8,'Walk':PERIOD,'GrazeDown':1.7,'GrazeLoop':3.4,'GrazeUp':.8,'Neutral':1,'HeadReturn':1.2,'Graze':8}
def ease(t):
    t=max(0,min(1,t));return t*t*t*(10+t*(-15+6*t))
def phase_at(t,tag):return (t/PERIOD-onsets[tag])%1
def pose(t,mode):
    if mode=='Graze':
        if t<1.2:return pose(0,'Neutral')
        if t<2.9:return pose(t-1.2,'GrazeDown')
        if t<6.3:return pose(t-2.9,'GrazeLoop')
        if t<7.1:return pose(t-6.3,'GrazeUp')
        return pose(0,'Neutral')
    posed={};walk=mode=='Walk';graze=mode.startswith('Graze');idle=mode=='Idle'
    cycle=t/PERIOD if walk else t/8
    amount=ease(t/1.7) if mode=='GrazeDown' else 1-ease(t/.8) if mode=='GrazeUp' else 1 if mode=='GrazeLoop' else 0
    straight=ease(t/1.2) if mode=='HeadReturn' else 1
    if not (idle or walk):cycle=0
    phase=cycle*math.tau
    body=Vector((0,.003*math.sin(phase),(-.035 if walk else -.008)+.003*math.sin(phase*2)))
    def place(name,a,b,rotation=None):
        desired=segment(name,a,b) if rotation is None else Matrix.Translation(a)@(rotation@rig.data.bones[name].matrix_local.to_3x3()).to_4x4()
        parent=spec[name][2];basis=rig.data.bones[name].matrix_local.inverted()
        if parent:basis=basis@rig.data.bones[parent].matrix_local@posed[parent].inverted()
        pb=rig.pose.bones[name];pb.matrix_basis=basis@desired;posed[name]=desired
    for name in ['Root','Pelvis','Spine01','Spine02','Spine03','Chest']:
        a,b,_=spec[name];shift=Vector((0,0,0)) if name=='Root' else body;place(name,a+shift,b+shift)
    # Each cervical segment is untwisted into the body's sagittal plane.
    # Keep the source bind mesh; author a full rotation (including roll) for its skin.
    sway=math.radians(3 if idle else .7 if walk else 0)*math.sin(phase)
    nod=math.radians(1.5 if idle else 1 if walk else 0)*math.sin(phase*2)
    joint=spec['Neck01'][0].copy()+body
    for name,angle in [('Neck01',76),('Neck02',92),('Neck03',102)]:
        a,b,_=spec[name];d=b-a
        yaw=-math.atan2(d.y,d.x)*straight
        rot=Matrix.Rotation(sway,3,'Z')@Matrix.Rotation(math.radians(angle)*amount+nod,3,'Y')@Matrix.Rotation(yaw,3,'Z')
        tip=joint+rot@d;place(name,joint,tip,rot);joint=tip
    poll=spec['Head'][0];head_direction=spec['Head'][1]-poll
    yaw=-math.atan2(head_direction.y,head_direction.x)*straight
    look=math.radians(6 if idle else .8 if walk else 0)*math.sin(phase)
    headnod=math.radians(3 if idle else 1.5 if walk else 0)*math.sin(phase*2)
    chew=.004*math.sin(t/3.4*math.tau*4)**2 if mode=='GrazeLoop' else 0
    headrot=Matrix.Rotation(sway+look,3,'Z')@Matrix.Rotation(math.radians(5)*amount+headnod,3,'Y')@Matrix.Rotation(yaw,3,'Z')
    for name,(a,b,parent) in spec.items():
        if name in posed or name[:2] in legs:continue
        if name.startswith(('Head','Jaw','Ear')):
            rot=headrot;origin=joint+headrot@(a-poll)
            if name=='Jaw':origin.z-=chew
            if name.startswith('Ear'):
                side=name[3];base=spec['Ear'+side+'01'][0]
                # Independent ear flicks return exactly to neutral at loop boundaries.
                flick=math.radians(18 if side=='L' else -14)*math.sin(phase*(2 if side=='L' else 3))*math.sin(phase/2)**2 if idle else 0
                earrot=Matrix.Rotation(flick,3,'X');rot=headrot@earrot
                origin=joint+headrot@(base-poll)+rot@(a-base)
            place(name,origin,origin+rot@(b-a),rot);continue
        if name=='Root':place(name,a,b);continue
        def offset(p):
            q=p.copy()+body
            if name.startswith('Tail'):
                f=max(0,(1.47-p.z)/1.22);tailphase=t/3.4*math.tau if mode=='GrazeLoop' else phase
                q.y+=f**1.35*(.19 if idle else .14 if mode=='GrazeLoop' else .08)*math.sin(tailphase-f*.65)*math.sin(tailphase/2)**2
            return q
        place(name,offset(a),offset(b))
    for tag,(top,knee,ankle,pastern) in legs.items():
        target=ankle.copy();ph=phase_at(t,tag)
        if walk:
            if ph<DUTY:target.x+=STRIDE*.5-STRIDE*ph/DUTY
            else:
                u=(ph-DUTY)/(1-DUTY);swingEase=u*u*(3-2*u)
                target.x+=-STRIDE*.5+STRIDE*swingEase
                target.z+=.065*math.sin(math.pi*u)**2
        ttop=top+body;l1=(knee-top).length;l2=(ankle-knee).length
        axis=(ankle-top).normalized();pole=(knee-top)-axis*(knee-top).dot(axis)
        try:mid=solve(ttop,target,l1,l2,pole)
        except ValueError as e:raise ValueError(f'{mode} {t} {tag}: {e}')
        upper=tag+('Shoulder' if tag[0]=='F' else 'Hip');place(upper,spec[upper][0]+body,ttop)
        place(tag+'Upper',ttop,mid)
        split=(spec[tag+'Lower'][1]-knee).length/l2;cannon=mid+(target-mid)*split
        place(tag+'Lower',mid,cannon);place(tag+'Cannon',cannon,target)
        delta=target-ankle;pas=pastern+delta
        place(tag+'Pastern',target,pas);place(tag+'Hoof',pas,spec[tag+'Hoof'][1]+delta)
    bpy.context.view_layer.update()

groom,groom_report=runpy.run_path(str(ROOT/'scripts/groom-h06.py'))['build_tail'](mesh,rig,spec)
# Source-tail removal changes vertex indices; rebuild sole samples on the retained mesh.
p=np.array([v.co[:] for v in mesh.data.vertices]);x,y,z=p.T
for tag in sole_indices:
    mask=(x>0 if tag[0]=='F' else x<-.4)&(y>.04 if tag[1]=='L' else y<.04)&(z<.003)
    sole_indices[tag]=np.where(mask)[0].tolist()
scene=bpy.context.scene;scene.render.fps=30;actions={};contacts={}
for mode,duration in CLIPS.items():
    rig.animation_data_clear();samples=[]
    for frame in range(round(duration*30)+1):
        t=frame/30;pose(0 if frame==round(duration*30) and mode in ['Idle','Walk','GrazeLoop'] else t,mode)
        for pb in rig.pose.bones:
            pb.rotation_mode='QUATERNION';pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_quaternion',frame=frame)
        ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh()
        samples.append({tag:{'support':mode!='Walk' or phase_at(t,tag)<DUTY,'points':[[float(v) for v in em.vertices[i].co] for i in ids]} for tag,ids in sole_indices.items()})
        ev.to_mesh_clear()
    action=rig.animation_data.action;action.name=mode;action.use_fake_user=True;actions[mode]=action
    max_height=0;max_drift=0
    for tag in legs:
        previous=None;origin=None
        for i,sample in enumerate(samples):
            s=sample[tag];points=np.array(s['points']);points[:,0]+=i/30*SPEED if mode=='Walk' else 0
            if s['support']:
                max_height=max(max_height,float(np.max(abs(points[:,2]))))
                if previous is None:origin=points.copy()
                max_drift=max(max_drift,float(np.max(np.linalg.norm((points-origin)[:,:2],axis=1))))
                previous=points
            else:previous=None
    contacts[mode]={'measured':'evaluated skinned sole vertices, flat plane, constant root speed for Walk','maxSoleHeightMeters':max_height,'maxSupportDriftMeters':max_drift,'soleVertexCounts':{k:len(v) for k,v in sole_indices.items()},'passed':max_height<=.01 and max_drift<=.02}
rig.animation_data_clear();rig.animation_data_create()
for name,action in actions.items():
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
pose(0,'Idle');bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);groom.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'rigged.glb'),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_skins=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'H06-rig-study.blend'))
report={'stage':'deformation study, derived triangle topology; manual retopology and terrain locomotion pending','method':'horse landmarks + regional segment weights + authored four-beat clips; not video motion capture','tailGroom':groom_report,'bones':len(spec),'vertices':len(p),'triangles':len(mesh.data.polygons),'clips':CLIPS,'stanceFraction':DUTY,'strideMetersDuringSupport':STRIDE,'walkSpeedMetersPerSecond':SPEED,'contactOnsets':onsets,'contacts':contacts,'references':['gemini_generated_video_37037a6e.mp4','gemini_generated_video_3ea4540b.mp4','gemini_generated_video_2265f448.mp4'],'soleIndices':sole_indices,'neutralPose':{'forwardAxis':'+X','method':'length-preserving cervical yaw correction into sagittal plane, full rigid head rotation','sourceHeadYawDegrees':math.degrees(math.atan2((spec['Head'][1]-spec['Head'][0]).y,(spec['Head'][1]-spec['Head'][0]).x)),'headReturnDuration':1.2,'idleHeadLookDegrees':6,'idleNeckSwayDegrees':3,'idleEarFlickDegrees':[18,-14]},'landmarks':{k:{'head':list(a),'tail':list(b),'parent':parent} for k,(a,b,parent) in spec.items()}}
(OUT/'rig-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('H06_REPORT',json.dumps({k:report[k] for k in ['bones','vertices','triangles','contacts']}))



