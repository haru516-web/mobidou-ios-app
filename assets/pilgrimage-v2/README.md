# もび道 巡礼 v2 visual assets

Generated: 2026-09-10

Route and place expansion design: [docs/pilgrimage-v2-route-world.md](../../docs/pilgrimage-v2-route-world.md)

These assets are original raster illustrations for the pilgrimage route selector
and the goshuin acquisition ceremony. They share the visual language of the
existing assets/backgrounds artwork: warm handmade washi, visible paper fibres,
Japanese watercolor washes, and restrained woodblock-like ink edges. The
existing spring-dawn.png, autumn-mist.png, and opening-night.png were used as
visual style references. All artwork is intentionally free of text so the app
can place Japanese copy in code.

## Files

| File | Role | Pixel size | Color |
| --- | --- | ---: | --- |
| button-washi.png | reusable wide button texture with a quiet landscape accent | 1974 x 797 | RGB opaque |
| card-washi.png | reusable tall card background with perimeter scenery and a blank center | 1024 x 1536 | RGB opaque |
| route-sanctuary.png | 木漏れ日の奥宮へ / 神域参詣 | 1024 x 1536 | RGB opaque |
| route-mountain.png | 雲をこえる祈り / 山岳修行 | 1086 x 1448 | RGB opaque |
| route-circuit.png | 十二のご縁めぐり / 札所周回 | 1086 x 1448 | RGB opaque |
| route-compassion.png | こころをほどく庭 / 観音巡礼 | 1086 x 1448 | RGB opaque |
| route-vow.png | 七たびの願い道 / 七願掛け | 1086 x 1448 | RGB opaque |
| route-festival.png | （保留）灯りの宿場みち / 門前宿場巡り | 1086 x 1448 | RGB opaque |
| route-story.png | 星あかりのものがたり / 物語の聖地巡礼 | 1086 x 1448 | RGB opaque |
| map-washi.png | 全ルート共通の広域巡礼絵図（山系・大河・平野・離れた社寺） | 1024 x 1536 | RGB opaque |
| ceremony-stage.png | 御朱印ゲット演出の背景ステージ（社と参道） | 1536 x 1024 | RGB opaque |
| ceremony-gate.png | 御朱印ゲット演出の前景鳥居（透過） | 1214 x 1295 | RGBA |

## Prompt record

The following prompt set was used with the built-in image_gen tool. The runtime
does not expose a model argument; the requested high-quality Luna Max workflow
was kept on the built-in image generation path. Every prompt included the
common constraints: no text, lettering, numbers, logos, watermark, people,
mascot, or modern objects unless explicitly requested; original fictional
locations only.

### button-washi.png

Wide reusable UI button texture. Warm ivory handmade washi with subtle fibres,
soft ink-wash edges, and a small panoramic vignette along the lower edge:
distant blue-green mountains, a tiny vermilion torii, a winding path, and pale
clouds. The center and upper middle remain calm and light for dark Japanese
button labels. Refined Japanese watercolor and light sumi-e, muted blue-green,
ochre, and vermilion palette, no border or frame.

### card-washi.png

Tall portrait card background. Warm ivory handmade washi with faint layered
mountains and mist at the top, a seasonal branch in one corner, and a winding
path with a tiny shrine garden along the lower edge. The central area is pale,
textured, and almost empty for a course title, description, and badges. Refined
Japanese watercolor and sumi-e, no decorative frame.

### Route image prompts

- route-sanctuary.png: Rain-washed stone steps through tall cedar and broadleaf
  forest, moss and ferns, gentle mist and dappled light, ending at a secluded
  vermilion torii and small fictional shrine. Fresh, quiet, and contemplative.
- route-mountain.png: Long stone stairs rising above layered blue-gray
  mountains and clouds toward a tiny summit shrine at dawn. Wind-bent pines,
  prayer ribbons, peach-gold sunrise, and a spacious, hopeful feeling.
- route-circuit.png: Elevated view of a fictional flower valley with a winding
  loop connecting many small temple and shrine stops, tiny torii, stone lanterns,
  a bell tower, bridge, lotus pond, and seasonal flowers. A visual journey with
  no map labels or numbers.
- route-compassion.png: Restorative moss garden around a small fictional Kannon
  temple pavilion. Stream, stepping stones, wooden bridge, stone basin,
  hydrangea, camellia, and filtered green light create a tender, reassuring
  atmosphere.
- route-vow.png: Quiet star shrine under an indigo night sky. A stone path
  curves through a meadow to a vermilion torii, with a crescent moon, falling
  stars, and softly glowing lanterns spaced along the path to suggest returning
  again and again.
- route-festival.png: Fictional mountain post town at blue hour. Lantern-lit
  wooden inns, a tea stall, stream, bridges, distant festival drum tower, and
  shrine gate create a warm, sociable route of small encounters. No signage.
- route-story.png: Dreamlike fictional star sanctuary. Moonlit path and bridge
  lead to a shrine above a reflective river; a constellation-like trail,
  lanterns, indigo mountains, and restrained vermilion add storybook wonder.

### map-washi.png

The dedicated map plate is a high-altitude illustrated fictional regional map
rather than a single compound. A long mountain range, broad river, lake/coast,
valley, fields, forests, and villages create generous distance between
destinations. One continuous terracotta road is painted directly into the image
and passes five small landmarks in order: a northwest forest shrine, a central
valley waystation, a northeast mountain temple with bell tower, a central-lower
riverside pavilion, and a far southeast summit shrine. The route line is part of
the image, while the app adds only readable stop labels, progress nodes, and the
selected moby so the regional geography remains visible.

### ceremony-stage.png / ceremony-gate.png

The ceremony is split into a painted stage and a transparent foreground gate so
the character can walk behind the torii. The stage is a Japanese watercolor and
washi courtyard with a shrine at the right and an open stone path. The gate is
a vermilion torii with transparent space below and through the opening. Together
they leave a clear lane for the tottoko walk, bow, two bows/two claps/one bow,
exit bow, and departure motion sequence.

## QA

- Each file was opened for visual inspection after generation.
- PNG headers were checked for the dimensions listed above.
- Stage and route/card/button assets are RGB color type 2 with an opaque
  background; ceremony-gate.png is RGBA with transparent surroundings.
