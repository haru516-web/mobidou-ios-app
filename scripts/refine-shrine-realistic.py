"""Run in the already-open blockout after importing the documented CC0 assets."""
import bpy, math, random, os, json
import numpy as np
from mathutils import Vector

ROOT = r'D:\mobby\mobidou\.worktrees\prayer-first-person'
OUT = os.path.join(ROOT, 'assets', 'prayer-first-person')
random.seed(83)
scene = bpy.context.scene
SRC=os.path.join(OUT,'realistic-sources')

def load_image(path,noncolor=False):
    im=bpy.data.images.load(path,check_existing=True)
    if noncolor:im.colorspace_settings.name='Non-Color'
    im.pack();return im

def pbr_scan(name,folder):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for filename,socket in [('Diffuse.jpg','Base Color'),('Rough.jpg','Roughness'),('nor_gl.jpg','Normal')]:
        tex=nodes.new('ShaderNodeTexImage');tex.image=load_image(os.path.join(folder,filename),socket!='Base Color')
        if socket=='Normal':
            normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
        else:links.new(tex.outputs['Color'],shader.inputs[socket])
    return mat

if not bpy.data.materials.get('stone_tiles_02'):
    pbr_scan('stone_tiles_02',os.path.join(SRC,'stone_tiles_02'))
scene.world.use_nodes=True
wn=scene.world.node_tree.nodes;wl=scene.world.node_tree.links
env=wn.new('ShaderNodeTexEnvironment');env.image=load_image(os.path.join(SRC,'forest_slope','lighting.hdr'))
background=next(n for n in wn if n.type=='BACKGROUND');wl.new(env.outputs['Color'],background.inputs['Color'])

def bsdf(mat):
    return next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def texture_material(name, base, wood=False):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    nodes=mat.node_tree.nodes; links=mat.node_tree.links; shader=bsdf(mat)
    size=512; y,x=np.mgrid[0:size,0:size].astype(float)/size
    rng=np.random.default_rng(14)
    grain=(np.sin(x*320+np.sin(y*21)*2)+np.sin(x*713+y*4)*.4)*.13 if wood else (np.sin(x*77+np.sin(y*32))*np.cos(y*63)*.12)
    grain+=rng.normal(0,.055,(size,size))
    image=bpy.data.images.new(name+' albedo',width=size,height=size)
    pixels=np.ones((size,size,4),dtype=np.float32)
    for c in range(3): pixels[:,:,c]=np.clip(base[c]*(1+grain),0,1)
    image.pixels.foreach_set(pixels.ravel()); image.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24;bump.inputs['Distance'].default_value=.025 if wood else .06
    links.new(tex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    shader.inputs['Roughness'].default_value=.78
    return mat

wood=texture_material('Real | weathered cedar grain',(.17,.105,.057),True)
darkwood=texture_material('Real | dark aged cedar',(.065,.041,.022),True)
red=texture_material('Real | oxidized vermilion timber',(.36,.066,.027),True)
earth=texture_material('Real | forest humus',(.075,.064,.038))
moss=texture_material('Real | shaded moss',(.07,.105,.028))
roof=texture_material('Real | weathered roof ceramic',(.065,.075,.071))
stone=bpy.data.materials.get('stone_tiles_02')

for obj in list(bpy.data.objects):
    if obj.type!='MESH' or obj.name.startswith('POV'): continue
    for slot in obj.material_slots:
        if not slot.material:continue
        n=slot.material.name
        if n.startswith('Cedar |'):slot.material=darkwood if 'shadow' in n else wood
        elif n.startswith('Torii |'):slot.material=red
        elif n.startswith('Forest floor') or n.startswith('Path |'):slot.material=earth
        elif n.startswith('Moss |'):slot.material=moss
        elif n.startswith('Roof |'):slot.material=roof
        elif n.startswith('Stone |') and stone:slot.material=stone
    if obj.name.startswith('Approach stone'):
        obj.rotation_euler.z+=random.uniform(-.018,.018)
        obj.location.z+=random.uniform(-.012,.012)
    # Replace rounded blockout foliage with the sourced, textured conifer model.
    if any(slot.material and slot.material.name.startswith('Canopy |') for slot in obj.material_slots):
        obj.hide_render=True;obj.hide_viewport=True;obj['blockout_excluded']=True
    if obj.name.startswith('Cedar |'):
        obj.hide_render=True;obj.hide_viewport=True;obj['blockout_excluded']=True

# A common world-space scale gives the stone scans a consistent physical size.
if stone:
    nodes=stone.node_tree.nodes;links=stone.node_tree.links
    coord=nodes.new('ShaderNodeTexCoord'); mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=.5
    anchor=bpy.data.objects.new('Real | texture metre reference',None);scene.collection.objects.link(anchor);coord.object=anchor
    links.new(coord.outputs['Object'],mapping.inputs[0])
    for node in nodes:
        if node.type=='TEX_IMAGE':node.projection='BOX';node.projection_blend=.2;links.new(mapping.outputs[0],node.inputs['Vector'])

def cube(name,loc,scale,mat,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name='Real | '+name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Worn edges','BEVEL');m.width=bevel;m.segments=2
    return o

def rod(name,a,b,r,mat,vertices=10):
    d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.name='Real | '+name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

# Individually articulated rafters, floor boards and lattice replace flat silhouettes.
for i in range(35):
    x=-2.48+i*.146
    cube('veranda board', (x,9.0,1.105),(.137,2.0,.07),wood,.007)
for x in [-2.65,2.65]:
    rod('veranda handrail',(x,8.7,1.85),(x,12.9,1.85),.055,wood)
    for y in np.arange(8.8,13,.38):rod('baluster',(x,y,1.1),(x,y,1.83),.024,wood)
for x in np.arange(-2.55,2.6,.17):
    cube('door lattice',(x,8.99,2.55),(.025,.045,2.45),wood,.004)
for z in np.arange(1.45,3.8,.22):cube('door lattice cross',(0,8.965,z),(5.1,.045,.025),wood,.004)
for x in np.arange(-3.5,3.55,.22):
    rod('exposed eave rafter',(x,8.43,4.37),(x,9.12,4.43),.045,darkwood)
for i in range(19):
    cube('offering box slat',(-.88+i*.098,8.24,1.63),(.06,.59,.038),darkwood,.005)

# Roof courses follow the gable profile; shallow curved clay channels catch grazing light.
for side in [-1,1]:
    for row in range(13):
        x=side*(.12+row*.282);z=6.40-abs(x)*.49
        for j in range(14):
            y=8.48+j*.375
            o=cube('roof tile',(x,y,z),(.295,.39,.055),roof,.025)
            o.rotation_euler.y=side*.455

# Moss, pebbles and leaf litter have irregular spacing and size, leaving the walk clear.
for i in range(230):
    side=random.choice([-1,1]);x=side*random.uniform(1.9,7.3);y=random.uniform(-17,17)
    if x< -2.8 and 1<y<5:continue
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,.02))
    o=bpy.context.object;o.name='Real | ground stone';o.scale=(random.uniform(.035,.18),random.uniform(.04,.21),random.uniform(.02,.08));o.data.materials.append(stone if i%3 else moss)
for i in range(130):
    x=random.choice([-1,1])*random.uniform(1.9,6);y=random.uniform(-16,15)
    o=cube('fallen cedar litter',(x,y,.025),(random.uniform(.03,.07),random.uniform(.1,.24),.008),wood,0);o.rotation_euler.z=random.uniform(0,math.tau)

# Sacred rope fibres and bronze fastening details.
for x in [-2.45,2.45]:
    for z in [1.0,2.6,3.65]:
        for dx in [-.14,.14]:
            rod('torii bronze peg',(x+dx,-3.46,z),(x+dx,-3.50,z),.025,darkwood)

cam=scene.camera;cam.data.lens=29;cam.location=(.12,-13.3,1.62)
cam.rotation_euler=(Vector((0,4.5,2.25))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.clip_end=150
scene.render.resolution_x=720;scene.render.resolution_y=1280;scene.render.resolution_percentage=100
for o in bpy.data.objects:
    if o.type=='LIGHT':
        if o.data.type=='SUN':o.data.energy=2.2;o.data.angle=math.radians(7);o.rotation_euler=(math.radians(28),math.radians(-25),math.radians(-32))
        elif o.data.type=='AREA':o.data.energy*=.35
world=scene.world
if world and world.use_nodes:
    for n in world.node_tree.nodes:
        if n.type=='BACKGROUND':n.inputs['Strength'].default_value=.35
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=-.35
scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-preview.png')
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.film_transparent=False
print('REFINED',len(scene.objects),'objects; trees placed in next step')

# Textured, layered pine boughs use the CC0 photographed twig atlas, rather than blobs.
pinefolder=os.path.join(SRC,'pine_tree_01')
foliage=bpy.data.materials.new('Real | photographed pine boughs CC0');foliage.use_nodes=True
n=foliage.node_tree.nodes;l=foliage.node_tree.links;s=bsdf(foliage)
diff=n.new('ShaderNodeTexImage');diff.image=load_image(os.path.join(pinefolder,'twig_diff.png'))
mask=n.new('ShaderNodeTexImage');mask.image=load_image(os.path.join(pinefolder,'twig_alpha.png'),True)
l.new(diff.outputs['Color'],s.inputs['Base Color']);l.new(mask.outputs['Color'],s.inputs['Alpha']);s.inputs['Roughness'].default_value=.85
foliage.surface_render_method='DITHERED'
bark=texture_material('Real | pine bark atlas',(.13,.08,.035),True)
bn=bark.node_tree.nodes.new('ShaderNodeTexImage');bn.image=load_image(os.path.join(pinefolder,'bark_diff.png'));bark.node_tree.links.new(bn.outputs['Color'],bsdf(bark).inputs['Base Color'])

verts=[];faces=[]
for level in range(17):
    z=3+level*.38;radius=(9.7-z)*.36
    for branch in range(7):
        angle=branch*math.tau/7+level*2.4
        for segment in range(5):
            t=(segment+1)/5
            center=Vector((math.cos(angle)*radius*t,math.sin(angle)*radius*t,z+.13*math.sin(t*math.pi)))
            width=.65*(1-.35*t);length=.80
            across=Vector((-math.sin(angle),math.cos(angle),.12))*width
            along=Vector((math.cos(angle),math.sin(angle),random.uniform(-.25,.25)))*length
            k=len(verts);verts.extend([center-across-along,center+across-along,center+across+along,center-across+along]);faces.append((k,k+1,k+2,k+3))
mesh=bpy.data.meshes.new('Pine bough cards shared');mesh.from_pydata(verts,[],faces);mesh.materials.append(foliage)
uv=mesh.uv_layers.new(name='UVMap')
for p in mesh.polygons:
    for li,co in zip(p.loop_indices,[(.01,.56),(.20,.56),(.20,.99),(.01,.99)]):uv.data[li].uv=co
positions=[(-5,-11), (5,-10),(-6,-5),(6,-4),(-5,1),(6,2),(-6,7),(6,8),(-5,14),(5,16),(-9,20),(-3,22),(3,23),(9,21),(-10,7),(10,10)]
for i,(x,y) in enumerate(positions):
    scale=random.uniform(.85,1.25)
    tree=bpy.data.objects.new('Real | pine canopy %02d'%i,mesh);scene.collection.objects.link(tree);tree.location=(x,y,0);tree.scale=(scale,scale,scale);tree.rotation_euler.z=random.uniform(0,math.tau)
    trunk=rod('textured pine trunk',(x,y,-.1),(x+.13,y+.08,9.5*scale),.23*scale,bark,16)
    for level in range(9):
        z=(3.2+level*.65)*scale;r=(9.5*scale-z)*.32
        for a in range(4):
            angle=a*math.pi/2+level*1.8+i
            rod('pine branch',(x,y,z),(x+math.cos(angle)*r,y+math.sin(angle)*r,z+.1),.035*scale,bark,6)

before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC,'rock_moss_set_01','model.gltf'))
rocks=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
for i,obj in enumerate(rocks):
    obj.name='Real | scanned moss stone %02d'%i
    obj.location=(random.choice([-1,1])*random.uniform(2.3,4),random.uniform(-10,10),0)
    largest=max(obj.dimensions)
    if largest:obj.scale*=random.uniform(.5,1.0)/largest
    bpy.context.view_layer.update()
    low=min((obj.matrix_world@Vector(c)).z for c in obj.bound_box);obj.location.z-=low
    for j in range(3):
        dupe=obj.copy();dupe.data=obj.data;scene.collection.objects.link(dupe);dupe.location=(random.choice([-1,1])*random.uniform(2.3,5),random.uniform(-12,15),obj.location.z-.03);dupe.rotation_euler.z=random.uniform(0,math.tau)

# Store UVs usable by glTF. Project each face on its dominant axis at physical scale.
for obj in scene.objects:
    if obj.type!='MESH' or obj.hide_render or obj.name.startswith('POV') or 'pine canopy' in obj.name or 'scanned moss stone' in obj.name:continue
    if any(slot.material and slot.material==stone for slot in obj.material_slots):
        uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
        for poly in obj.data.polygons:
            axis=max(range(3),key=lambda k:abs(poly.normal[k]));axes=[k for k in range(3) if k!=axis]
            for li in poly.loop_indices:
                co=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
                uv.data[li].uv=(co[axes[0]]*.5,co[axes[1]]*.5)
if stone:
    for node in stone.node_tree.nodes:
        if node.type=='TEX_IMAGE':
            for link in list(node.inputs['Vector'].links):stone.node_tree.links.remove(link)
            node.projection='FLAT'

for im in bpy.data.images:
    if im.source=='FILE' and not im.packed_file:
        try:im.pack()
        except Exception:pass
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shrine-world-realistic.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH' and not o.hide_render and not o.name.startswith('POV'):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'shrine-world-realistic.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
scene.render.resolution_percentage=50
scene.cycles.samples=24
scene.render.filepath=os.path.join(OUT,'shrine-world-realistic-draft.png')
bpy.ops.render.render(write_still=True)
print('DRAFT_READY')
