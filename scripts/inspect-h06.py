import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('E:/8-horses-lang')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'artifacts/h06/editable.glb'))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=mesh;bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
xyz=[list(v.co) for v in mesh.data.vertices]
(ROOT/'artifacts/h06/vertices.json').write_text(json.dumps(xyz))
print('BOUNDS',[(min(p[i] for p in xyz),max(p[i] for p in xyz)) for i in range(3)])
