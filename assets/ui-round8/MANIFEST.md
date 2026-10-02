# UI round 8 asset manifest

- Worktree: D:/mobby/mobidou-ui-assets8
- Branch: codex/ui-assets-round8
- Base: claude/ui-navigation-overhaul / d62ae68
- Generator: built-in image_gen; reference: assets/ui-round3/ui/card-frame.webp.
- Encoding: WebP quality 90, method 6; RGBA, interior alpha 230/255 (approximately 90%), exterior alpha 0.
- No text, numbers, logos, or code changes. No PNG originals in this worktree.

| File | Dimensions | Bytes | Purpose | Slice |
|---|---|---|---|---|
| gacha/panel-dark-v1.webp | 1024 x 512 | 62462 | Dark lacquer lower panel for gacha guidance, results, and skip controls | Nine-slice: left=110, right=110, top=110, bottom=110 source pixels; corners fixed, edges and center stretch |

- Outer alpha box (x0, y0, x1, y1; exclusive upper bounds): (10, 34, 1013, 503).
- Slice coordinates: x=[0,110,914,1024], y=[0,110,402,512]. Full canvas is the slice domain; transparent margin is included in the fixed corners/edges.
- At 350pt width, source scale is 350/1024; each fixed corner side is 37.60pt. Preserve that corner size when varying height from 100 to 330pt.
- Uncommitted reviews: _review/panel-dark-v1-350pt.webp (350 x 175), _review/panel-dark-v1-nine-slice-350pt.webp (350pt panels at heights 100,175,330 on dark background).

## Generation prompt

Front-facing 2:1 dark Japanese lacquer panel near #211A13, with restrained handmade torn washi edges matching card-frame.webp, a single fine distressed gold perimeter line and four small worn gold fasteners within 110px corner regions. Quiet central surface, ornament restricted to edges, nine-slice compatible. Transparent exterior, approximately 90% opaque interior. No text, digits, logos, characters, scene, or external shadow.
