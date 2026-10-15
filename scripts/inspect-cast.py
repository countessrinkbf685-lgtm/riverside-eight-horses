import bpy,json,math
import numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
specs={'H01':(2.02,180),'H02':(1.99,180),'H03':(2.04,225),'H04':(2.03,180),'H05':(2.01,0),'H08':(1.98,180),'P01':(1.72,90)}
for id,(height,heading) in specs.items():
 out=ROOT/'artifacts'/id.lower()
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(out/'editable.glb'))
 mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 p=np.array([v.co[:] for v in mesh.data.vertices]);p*=height/np.ptp(p[:,2]);p[:,2]-=p[:,2].min()
 a=math.radians(heading);p[:,:2]=p[:,:2]@np.array([[math.cos(a),math.sin(a)],[-math.sin(a),math.cos(a)]])
 (out/'vertices.json').write_text(json.dumps(p.tolist()))
 print(id,[(float(p[:,i].min()),float(p[:,i].max())) for i in range(3)])
