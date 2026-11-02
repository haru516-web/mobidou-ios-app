import bpy, math, os, numpy as np
source=r'D:\mobby\mobidou\.worktrees\prayer-first-person\assets\prayer-first-person\realistic-sources\forest_slope\lighting.hdr'
output=r'D:\mobby\mobidou\.worktrees\prayer-first-person\assets\prayer-first-person\shrine-sky.jpg'
scene=bpy.context.scene
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.65
image=bpy.data.images.load(source,check_existing=True)
image.scale(1024,512)
image.save_render(output,scene=scene)
print('SKY_BAKED',output,flush=True)
