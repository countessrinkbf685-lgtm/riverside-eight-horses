import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'public/models/prepared/0d2e3526350332ae1efe54590e2a4bbd.glb'))
bark=list(bpy.context.scene.objects)
points=[o.matrix_world@Vector(c) for o in bark if o.type=='MESH' for c in o.bound_box]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));scale=7.3/(hi.z-lo.z);center=(hi+lo)*.5
for o in bark:
    if o.type=='MESH':
        world=o.matrix_world.copy()
        for v in o.data.vertices:v.co=(world@v.co-Vector((center.x,center.y,lo.z)))*scale
        o.parent=None;o.matrix_world.identity();o.name='T01_reference_bark'
bpy.ops.import_scene.gltf(filepath=str(root/'artifacts/realism-v3/willow-branches.glb'))
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        for f in o.data.polygons:f.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/realism-v3/T01-willow-refinement.blend'))
print('Saved editable T01 bark and separated branch / leaf meshes.')
