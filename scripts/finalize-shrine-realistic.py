"""Finalize UVs, preserve editable scene, and export material batches separately."""
import bpy, os, json, math, tempfile
import numpy as np
from mathutils import Vector
ROOT=r'D:\mobby\mobidou\.worktrees\prayer-first-person'
OUT=os.path.join(ROOT,'assets','prayer-first-person')
tempfile.tempdir=os.path.join(ROOT,'output','prayer-realistic-tmp')
os.makedirs(tempfile.tempdir,exist_ok=True)
scene=bpy.context.scene
for previous in list(scene.objects):
    if previous.name.startswith('Camera | prayer detail') or previous.name.startswith('POV | detail hands'):
        bpy.data.objects.remove(previous,do_unlink=True)
def scanned_material(asset):
    name='Real | CC0 '+asset
    existing=bpy.data.materials.get(name)
    if existing:return existing
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    for file,socket in [('Diffuse.jpg','Base Color'),('Rough.jpg','Roughness'),('nor_gl.jpg','Normal')]:
        im=bpy.data.images.load(os.path.join(OUT,'realistic-sources',asset,file),check_existing=True)
        if socket!='Base Color':im.colorspace_settings.name='Non-Color'
        im.pack();tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
        if socket=='Normal':
            normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])
        else:mat.node_tree.links.new(tex.outputs['Color'],shader.inputs[socket])
    return mat
floor=scanned_material('forest_floor');timber=scanned_material('wood_planks_dirt')
for o in scene.objects:
    if o.type!='MESH' or o.hide_render:continue
    changed=False
    for slot in o.material_slots:
        if slot.material and slot.material.name=='Real | forest humus':slot.material=floor;changed=True
        elif slot.material and slot.material.name in ['Real | weathered cedar grain','Real | dark aged cedar']:slot.material=timber;changed=True
    if changed:
        uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
        for poly in o.data.polygons:
            axis=max(range(3),key=lambda k:abs(poly.normal[k]));axes=[k for k in range(3) if k!=axis]
            for li in poly.loop_indices:
                co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(co[axes[0]]*.5,co[axes[1]]*.5)
foliage=bpy.data.materials.get('Real | photographed pine boughs CC0')
if foliage:
    shader=next(n for n in foliage.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    folder=os.path.join(OUT,'realistic-sources','pine_tree_01')
    images=[bpy.data.images.load(os.path.join(folder,name),check_existing=True) for name in ['twig_diff.png','twig_alpha.png','twig_mask.png']]
    w,h=images[0].size;arrays=[]
    for im in images:
        data=np.empty(w*h*4,dtype=np.float32);im.pixels.foreach_get(data);arrays.append(data.reshape(h,w,4))
    rgba=arrays[0].copy();rgba[:,:,3]=arrays[1][:,:,0]*arrays[2][:,:,0]
    combined=bpy.data.images.get('Real | pine needles RGBA') or bpy.data.images.new('Real | pine needles RGBA',width=w,height=h,alpha=True)
    combined.pixels.foreach_set(rgba.ravel());combined.pack()
    tex=next(link.from_node for link in shader.inputs['Base Color'].links)
    tex.image=combined
    foliage.node_tree.links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
mesh=bpy.data.meshes.get('Pine bough cards shared')
if mesh:
    uv=mesh.uv_layers.active
    for p in mesh.polygons:
        for li,co in zip(p.loop_indices,[(.01,.56),(.20,.56),(.20,.99),(.01,.99)]):uv.data[li].uv=co
for o in scene.objects:
    if o.name.startswith('Moss cushion'):
        o.hide_render=True;o.hide_viewport=True;o['blockout_excluded']=True
    if o.name.startswith('Real | scanned moss stone'):
        for p in o.data.polygons:p.use_smooth=True
    if o.name.startswith('Komainu |') and 'plinth' not in o.name:
        o.hide_render=True;o.hide_viewport=True;o['blockout_excluded']=True

cam=scene.camera;cam.location=(-.16,-15.6,1.63);cam.data.lens=27
cam.rotation_euler=(Vector((0,7,.6))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.exposure=.65
for node in scene.world.node_tree.nodes:
    if node.type=='BACKGROUND':node.inputs['Strength'].default_value=.65
for o in scene.objects:
    if o.type=='LIGHT' and o.data.type=='SUN':
        o.data.energy=3.0;o.rotation_euler=(math.radians(45),0,math.radians(-25))
fill=bpy.data.objects.get('Real | soft front skylight')
if fill is None:
    data=bpy.data.lights.new('Real | soft front skylight','AREA');fill=bpy.data.objects.new('Real | soft front skylight',data);scene.collection.objects.link(fill)
fill.location=(-3,-9,6);fill.data.energy=1800;fill.data.shape='DISK';fill.data.size=8
fill.rotation_euler=(Vector((0,4,2))-fill.location).to_track_quat('-Z','Y').to_euler()

# Portable normal maps retain the custom timber surface in glTF renderers.
for mat in bpy.data.materials:
    if not mat.name.startswith('Real |') or not mat.use_nodes:continue
    if bpy.data.images.get(mat.name+' normal'):continue
    shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    source=next((n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'albedo' in n.image.name),None)
    if shader is None or source is None:continue
    w,h=source.size;data=np.empty(w*h*4,dtype=np.float32);source.pixels.foreach_get(data)
    height=data.reshape(h,w,4)[:,:,:3].mean(axis=2)
    gy,gx=np.gradient(height);nx=-gx*5;ny=-gy*5
    norm=np.sqrt(nx*nx+ny*ny+1);pixels=np.ones((h,w,4),dtype=np.float32)
    pixels[:,:,0]=nx/norm*.5+.5;pixels[:,:,1]=ny/norm*.5+.5;pixels[:,:,2]=1/norm*.5+.5
    im=bpy.data.images.new(mat.name+' normal',width=w,height=h);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(pixels.ravel());im.pack()
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
    normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])

# The overlay remains the unchanged existing 2D walk sprite, lit by the same scene.
hands=bpy.data.objects.get('POV | Mobby 2D hands')
if hands:
    hands.visible_shadow=False
scene.render.resolution_percentage=100;scene.cycles.samples=32
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-preview.png')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shrine-world-realistic.blend'))

# Batch copies only; the .blend keeps all architecture editable.
bpy.ops.object.select_all(action='DESELECT')
deps=bpy.context.evaluated_depsgraph_get();groups={};temp=[]
for o in list(scene.objects):
    if o.type!='MESH' or o.hide_render or o.name.startswith('POV'):continue
    if 'pine canopy' in o.name:
        o.select_set(True);continue
    key=tuple(m.name if m else '' for m in o.data.materials)
    ev=o.evaluated_get(deps);meshcopy=bpy.data.meshes.new_from_object(ev)
    dupe=bpy.data.objects.new('Export batch part',meshcopy);scene.collection.objects.link(dupe);dupe.matrix_world=o.matrix_world.copy()
    groups.setdefault(key,[]).append(dupe);temp.append(dupe)
batch=[]
for key,parts in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
    parts[0].name='Environment | '+(' + '.join(key) or 'unassigned');batch.append(parts[0])
bpy.ops.object.select_all(action='DESELECT')
exported=batch+[o for o in scene.objects if 'pine canopy' in o.name and not o.hide_render]
for o in exported:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'shrine-world-realistic.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
for o in batch:bpy.data.objects.remove(o,do_unlink=True)
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-preview.png')
bpy.ops.render.render(write_still=True)
print('FINAL_RENDER_READY',flush=True)
# A second eye-level view verifies the shrine and hand-washing pavilion beyond the gate.
detail=cam.copy();detail.data=cam.data.copy();scene.collection.objects.link(detail)
detail.name='Camera | prayer detail';detail.location=(.65,-.8,1.63);detail.data.lens=23
detail.rotation_euler=(Vector((-.3,10,2.65))-detail.location).to_track_quat('-Z','Y').to_euler()
if hands:
    overlay=hands.copy();overlay.data=hands.data;scene.collection.objects.link(overlay);overlay.parent=detail;overlay.name='POV | detail hands';overlay.location.y-=.19
scene.camera=detail;scene.cycles.samples=24
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-prayer-preview.png')
bpy.ops.render.render(write_still=True)
scene.camera=cam;scene.cycles.samples=32;scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shrine-world-realistic.blend'))
print('DETAIL_RENDER_READY',flush=True)
