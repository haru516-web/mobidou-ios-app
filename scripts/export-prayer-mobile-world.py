"""Make a 1K texture Android/iOS GLB from the high-resolution editable Blend."""
import bpy, os, tempfile
root=r'D:\mobby\mobidou\.worktrees\prayer-first-person\assets\prayer-first-person'
tempfile.tempdir=r'D:\mobby\mobidou\.worktrees\prayer-first-person\output\prayer-mobile-export-tmp'
os.makedirs(tempfile.tempdir,exist_ok=True)
source=os.path.join(root,'shrine-world-realistic.blend')
bpy.ops.wm.open_mainfile(filepath=source)
changed=[]
for image in bpy.data.images:
    # Packed files may report has_data=False until image.scale() reads the pixels.
    if image.source not in ['FILE','GENERATED']:continue
    width,height=image.size
    largest=max(width,height)
    if largest>1024:
        scale=1024/largest
        w=max(1,round(width*scale));h=max(1,round(height*scale))
        image.scale(w,h);changed.append((image.name,(width,height),(w,h)))
bpy.context.scene.camera=bpy.data.objects.get('Camera | first-person approach') or bpy.context.scene.camera
mesh_objects=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and not obj.hide_render and not obj.name.startswith('POV')]
bpy.ops.object.select_all(action='DESELECT')
for obj in mesh_objects:
    obj.select_set(True)
if mesh_objects:
    # The scene contains many individual leaves and stones. Join static geometry
    # in the export copy so mobile GPUs do not issue one draw call per object.
    bpy.context.view_layer.objects.active=mesh_objects[0]
    bpy.ops.object.join()
    bpy.context.view_layer.objects.active.name='Shrine Environment'
    bpy.context.view_layer.objects.active.data.name='Shrine Environment Mesh'
props=bpy.ops.export_scene.gltf.get_rna_type().properties
valid={p.identifier for p in props}
kwargs={'filepath':os.path.join(root,'shrine-world-realistic.glb'),'export_format':'GLB','use_selection':True,'export_apply':True,'export_cameras':False,'export_lights':False,'export_image_quality':82}
if 'export_image_format' in valid:kwargs['export_image_format']='AUTO'
bpy.ops.export_scene.gltf(**kwargs)
print('MOBILE_EXPORT_TEXTURES',changed,flush=True)
