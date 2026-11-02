import bpy, os, json
ROOT=r'D:\mobby\mobidou\.worktrees\prayer-first-person'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets','prayer-first-person','shrine-world-realistic.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes, 'No imported meshes'
assert not any(o.type in ['CAMERA','LIGHT'] for o in bpy.context.scene.objects)
assert not any('POV' in o.name or 'Mobby' in o.name for o in meshes)
images=[i for i in bpy.data.images if i.type=='IMAGE']
assert images and all(i.size[0]>0 and i.size[1]>0 and i.has_data for i in images),'Unresolved texture'
result={'blender':bpy.app.version_string,'importedMeshes':len(meshes),'images':len(images),'imageDataResolved':True,'cameras':0,'lights':0,'hands':False}
with open(os.path.join(ROOT,'docs','prayer-first-person','realistic-glb-roundtrip.json'),'w',encoding='utf-8') as f:json.dump(result,f,indent=2)
print('ROUNDTRIP_OK',json.dumps(result),flush=True)
