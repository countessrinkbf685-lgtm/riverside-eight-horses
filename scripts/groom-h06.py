"""Layered mesh groom, bound to the existing tail chain. Blender metres, Z up.
No particle-system runtime dependency and no alpha-sorting hair sheets.
"""
import bpy, bmesh, math, random
from mathutils import Vector

def build_tail(mesh,rig,spec):
    random.seed(611)
    def center(z):
        points=[spec['Tail%02d'%i][0] for i in range(7)]+[spec['Tail06'][1]]
        for a,b in zip(points,points[1:]):
            if b.z<=z<=a.z:return a.lerp(b,(a.z-z)/(a.z-b.z))
        return points[0].copy() if z>points[0].z else points[-1]+Vector((.015,0,z-points[-1].z))
    # Cut the source tail below the dock. Preserve the rump and all hoof vertices.
    bm=bmesh.new();bm.from_mesh(mesh.data)
    old=[v for v in bm.verts if .17<v.co.z<1.04 and v.co.x<-.87]
    removed=len(old);bmesh.ops.delete(bm,geom=old,context='VERTS');bm.to_mesh(mesh.data);bm.free();mesh.data.update()
    def smooth(a,b,v):
        t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
    # The anatomical Tail00 pivot is anterior to the visible hair cap. Use
    # measured surface sections for the groom, not the bone centre as a cylinder.
    guides=[(1.53,-.943,.058),(1.46,-.970,.062),(1.33,-.984,.067),(1.15,-.991,.077),(.94,-.980,.09),(.75,-.96,.11),(.57,-.92,.12),(.40,-.87,.12),(.25,-.84,.12)]
    def hair_center(z):
        for (za,xa,ya),(zb,xb,yb) in zip(guides,guides[1:]):
            if zb<=z<=za:
                t=(za-z)/(za-zb);return Vector((xa+(xb-xa)*t,ya+(yb-ya)*t,z))
        return Vector((guides[0][1],guides[0][2],z)) if z>guides[0][0] else Vector((-.84+.015*(.25-z),.12,z))
    protected=0;adjusted=0;max_shift=0
    # Keep the proven anatomical join. Only the lower hidden rim is tapered;
    # the visible groom envelope is fitted outside the original upper dock.
    for v in mesh.data.vertices:
        before=v.co.copy()
        if 1.02<v.co.z<1.20 and v.co.x<-.87:
            t=max(0,min(1,(v.co.z-1.02)/.18));f=.06+.94*t*t*(3-2*t);c=center(v.co.z)
            v.co.x=c.x+(v.co.x-c.x)*f;v.co.y=c.y+(v.co.y-c.y)*f
            max_shift=max(max_shift,(v.co-before).length);adjusted+=1
        else:protected+=1
    verts=[];faces=[];tones=[]
    # Nested, tapered locks cover the retained core from the actual hair cap.
    # Width, clump direction and colour vary per lock, never per vertex row.
    for k in range(720):
        fine=k>=240;angle=random.random()*math.tau;spread=random.uniform(.94,1.04)
        length=random.uniform(.94,1.34) if not fine else random.uniform(.70,1.36)
        root_z=random.uniform(1.455,1.515);width=random.uniform(.0022,.0042) if not fine else random.uniform(.00045,.00125)
        phase=random.random()*math.tau;curl=random.uniform(-.022,.022);start=len(verts)
        clump=k%19;angle+=(.04*math.sin(clump*2.1));tone=random.uniform(-.025,.04)
        for j in range(21):
            t=j/20;z=root_z-length*t;c=hair_center(z)
            cap=math.sqrt(max(.10,1-((z-1.43)/.10)**2)) if z>1.43 else 1
            root_blend=smooth(1.06,1.22,z)
            rx=(.111*root_blend+(.091+.012*math.sin(t*4))*(1-root_blend))*cap*spread*(.74+.26*smooth(0,.07,t))
            ry=(.137*root_blend+(.100+.012*math.sin(t*5))*(1-root_blend))*cap*spread*(.74+.26*smooth(0,.07,t))
            c+=Vector((math.cos(angle)*rx,math.sin(angle)*ry,0))
            c.x+=.009*math.sin(t*6+phase)*t+curl*t*t
            c.y+=.008*math.sin(t*8+phase)*t+.015*math.sin(clump)*t*t
            # Root width grows out of the surface; tips end as individual hairs.
            w=width*(.12+.88*smooth(0,.10,t))*max(.008,(1-t)**.85)
            side=Vector((-math.sin(angle),math.cos(angle),.01));normal=Vector((math.cos(angle),math.sin(angle),0))
            for across in [-1,0,1]:verts.append(tuple(c+side*w*across+normal*w*.22*(1-abs(across))))
        for j in range(20):
            a=start+j*3
            for q in range(2):faces.append((a+q,a+q+1,a+q+4,a+q+3));tones.append((tone,j))
    data=bpy.data.meshes.new('H06_tapered_tail_fibres');data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new('H06_tail_groom',data);bpy.context.collection.objects.link(obj)
    # Longitudinal colour variation and a darker dock; geometry supplies the silhouette.
    mat=bpy.data.materials.new('H06_tail_fibres');mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.63
    colors=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Color';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    data.materials.append(mat)
    for poly,(tone,j) in zip(data.polygons,tones):
        t=j/19;v=.09+tone+.24*smooth(.04,.72,t)
        for li in poly.loop_indices:colors.data[li].color=(v*1.07,v*.99,v*.84,1)
        poly.use_smooth=True
    groups=[obj.vertex_groups.new(name='Tail%02d'%i) for i in range(7)]
    levels=[spec['Tail%02d'%i][0].z for i in range(7)]
    for v in data.vertices:
        z=v.co.z
        if z>=levels[0]:groups[0].add([v.index],1,'REPLACE');continue
        if z<=levels[-1]:groups[-1].add([v.index],1,'REPLACE');continue
        for i in range(6):
            if levels[i+1]<=z<=levels[i]:
                u=(levels[i]-z)/(levels[i]-levels[i+1]);groups[i].add([v.index],1-u,'REPLACE');groups[i+1].add([v.index],u,'REPLACE');break
    mod=obj.modifiers.new('Tail chain follow','ARMATURE');mod.object=rig;obj.parent=rig
    return obj,{'strands':720,'broadStrands':240,'fineStrands':480,'triangles':len(faces)*2,'removedSourceTailVertices':removed,'reshapedSleeveVertices':adjusted,'protectedBodyVertices':protected,'maxSleeveShiftMeters':max_shift,'method':'measured hair-cap guides, surface-fitted outer locks, continuous root-to-tip colour; original upper dock retained and lower hidden rim tapered; 7 tail-bone weights; source unchanged'}
