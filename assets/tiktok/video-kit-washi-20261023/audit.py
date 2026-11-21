from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json

root = Path(__file__).parent
sheet = Image.new('RGB', (960, 620), '#e8e4da')
draw = ImageDraw.Draw(sheet)
records = []
for i, p in enumerate(sorted((root/'generated').glob('*.png'))):
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        records.append(dict(file=p.relative_to(root).as_posix(), width=im.width, height=im.height, format=im.format, mode=im.mode, alpha='A' in im.getbands(), bytes=p.stat().st_size))
        thumb = ImageOps.contain(im.convert('RGB'), (300, 555))
        sheet.paste(thumb,(10+i*320,10))
        draw.text((10+i*320,575),p.stem,fill='#252e28')
assert len(records) == 3
sheet.save(root/'preview.jpg',quality=94)
(root/'manifest.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(json.dumps(records,indent=2))
