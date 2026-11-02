import bpy, os
ROOT=r'D:\mobby\mobidou\.worktrees\prayer-first-person'
OUT=os.path.join(ROOT,'assets','prayer-first-person')
scene=bpy.context.scene
main=scene.camera
detail=bpy.data.objects['Camera | prayer detail']
overlay=bpy.data.objects['POV | detail hands']
overlay.location.y=bpy.data.objects['POV | Mobby 2D hands'].location.y-.19
scene.camera=detail;scene.cycles.samples=24
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-prayer-preview.png')
bpy.ops.render.render(write_still=True)
scene.camera=main;scene.cycles.samples=32
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-preview.png')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shrine-world-realistic.blend'))
print('DETAIL_CORRECTED',flush=True)
