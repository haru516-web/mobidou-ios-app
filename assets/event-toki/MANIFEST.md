# Toki event assets

Branch: `codex/event-assets`; base: `639cf695f4b05e97006e27c850ad4d893eb70d57` (`claude/events`).

Generated with the built-in image_gen tool. WebP quality 90; alpha retained. No nine-slice. Buttons: generated alpha bounds normalized to reference bounds (14,21)-(500,497) on 512x512 canvas; no artwork clipping. Previews are review-only. Legacy A–F records below are superseded by the 15-spot taste brief. Legacy assets are retained unchanged. Previous traditional-stamp alignment work is superseded by the era-card design.

## Assets

| File | Dimensions | Bytes | Alpha | Preview | Subject |
|---|---|---:|---|---|---|
| pop-buttons/event-home.webp | 512×512 | 80028 | yes | previews/event-home.webp (256×256) | A charming original small tin toy sedan with round headlights, softly rounded body, indigo paint and muted gold trim, three-quarter view. No recognizable real car design. |
| pop-buttons/event-book.webp | 512×512 | 77618 | yes | previews/event-book.webp (256×256) | An indigo cloth bound Japanese accordion goshuin book, blank front cover, cream pages, cream binding and small muted gold bookmark. No writing. |
| pop-buttons/event-gacha.webp | 512×512 | 71836 | yes | previews/event-gacha.webp (256×256) | One small wooden Japanese reward tag, natural wood grain, indigo cord, indigo and muted gold rim; entirely blank face. |
| pop-buttons/event-walk.webp | 512×512 | 94316 | yes | previews/event-walk.webp (256×256) | A short gently winding cream path through soft green hills ending at a tiny original shrine roof, no recognizable shrine. |
| pop-buttons/event-normal.webp | 512×512 | 72202 | yes | previews/event-normal.webp (256×256) | One simple vermilion red torii representing normal pilgrimage, handmade watercolor illustration. |
| pop-buttons/event-collection.webp | 512×512 | 79220 | yes | previews/event-collection.webp (256×256) | A small two-level wooden display shelf with three tiny nostalgic miniatures: round-headlight tin car, black rotary phone, folded clamshell phone. Simplified and clearly legible. |

| map.webp | 1024×1536 | 535208 | no | previews/map.webp (512×768) | Pale Showa to Heisei watercolor pilgrimage landscape; continuous winding road, no baked-in markers or text. |

## Button prompt set

Common prompt:

Use case: stylized-concept. Edit the reference washi circular app button into ONE matching event button. Keep reference circular handmade cream washi disk shape, exact framing and proportions, tactile fibers, subtle attached lower-right edge shadow, and generous transparent outer margin. Add a thin indigo #2F4A6B painted outer rim and an even thinner muted gold #C9A24B inner accent. Center a single small illustration with the reference handmade watercolor/paper texture and restrained dark outlines, occupying about 55% of disk width. No lettering, numbers, labels, logos or watermarks. No cast floating shadow outside button. Transparent background. Square 512x512 deliverable. Original fictional objects only, no real brands, vehicle models, shrines or delinquent culture.

- event-home: A charming original small tin toy sedan with round headlights, softly rounded body, indigo paint and muted gold trim, three-quarter view. No recognizable real car design.
- event-book: An indigo cloth bound Japanese accordion goshuin book, blank front cover, cream pages, cream binding and small muted gold bookmark. No writing.
- event-gacha: One small wooden Japanese reward tag, natural wood grain, indigo cord, indigo and muted gold rim; entirely blank face.
- event-walk: A short gently winding cream path through soft green hills ending at a tiny original shrine roof, no recognizable shrine.
- event-normal: One simple vermilion red torii representing normal pilgrimage, handmade watercolor illustration.
- event-collection: A small two-level wooden display shelf with three tiny nostalgic miniatures: round-headlight tin car, black rotary phone, folded clamshell phone. Simplified and clearly legible.

## Review derivatives

These are review-only and are not app assets. Text is confined to preview labels. The map follows the requested approximate anchor layout; the road center is not guaranteed to coincide with every anchor pixel. `map-anchors.webp` overlays 36px-radius circles at the specified coordinates for review, not a runtime marker-size specification.

| File | Dimensions | Bytes |
|---|---|---:|
| previews/buttons.webp | 840×610 | 91472 |
| previews/event-book.webp | 256×256 | 24488 |
| previews/event-collection.webp | 256×256 | 24790 |
| previews/event-gacha.webp | 256×256 | 22118 |
| previews/event-home.webp | 256×256 | 24686 |
| previews/event-normal.webp | 256×256 | 21698 |
| previews/event-walk.webp | 256×256 | 27538 |
| previews/map-anchors.webp | 512×768 | 180854 |
| previews/map.webp | 512×768 | 180044 |
| previews/route-layout.webp | 512×768 | 12316 |

Map anchor layout (x,y normalized; visit in order): (0.10,0.84), (0.34,0.72), (0.16,0.56), (0.42,0.46), (0.72,0.54), (0.84,0.36), (0.60,0.22), (0.86,0.10). No cropping or nine-slice for map. The plain `route-layout.webp` is the geometry guide, not the generated map.

## Map prompt history

### Pass 1

Use case: historical-scene. Create an event pilgrimage map by reimagining the reference watercolor washi landscape. Portrait 1024x1536. Same cream fibrous washi and delicate Japanese watercolor brush texture, but paler and low contrast for UI overlays. One single continuous clearly visible thin cream/gold winding road must pass in order through normalized canvas positions, x from left and y from top: (0.10,0.84), (0.34,0.72), (0.16,0.56), (0.42,0.46), (0.72,0.54), (0.84,0.36), (0.60,0.22), (0.86,0.10). These are invisible layout anchors, do NOT draw markers, circles or numbers. Road follows these points as one unbranched serpentine, no other roads. From bottom to top it traverses fictional Showa retro era to Heisei era. Lower part: tiny old neighborhood shops with blank awnings, mountain pass, modest roadside diner, bathhouse chimney, gentle record district hillside. Upper part: quiet neighborhood park, a small bridge and open scenic overlook, subtly more modern modest buildings. Landscapes soft green wooded hills, muted indigo rivers, atmospheric distant mountains. At the eight anchors only a very tiny unobtrusive roof silhouette adjacent to road, ample clear space for code overlaid round markers. No large shrines. Thin indigo #2F4A6B and muted gold #C9A24B fine border, subtle and unobtrusive. Absolutely no text, lettering, signs, names, numbers, brands, logo, real shrines, real car models, manufacturer designs, delinquent or biker depictions. No people needed. Fill canvas; opaque background.

### Pass 2

Edit this map. Correct the route geometry; current route is not aligned to the required eight UI anchor positions. Preserve watercolor cream washi style, border and Showa-to-Heisei theme, but lighten scenery significantly and simplify it to low contrast. REMOVE ALL existing roads and redraw ONLY ONE continuous unbranched serpentine path through EXACT pixel centers on a 1024x1536 canvas in this order starting bottom: (102,1290) -> (348,1106) -> (164,860) -> (430,707) -> (737,829) -> (860,553) -> (614,338) -> (881,154). Specifically path must first climb right to 348,1106, then left to164,860, then right/up to430,707, then loop DOWN RIGHT to737,829 before climbing to860,553, then LEFT UP to614,338, then RIGHT UP to881,154. Single path, no branches, no additional roads. Route width about 24 pixels, muted cream with very thin gold edges. Keep these anchors clear and NO markers, circles, numbers or labels. Tiny original shrine roof shadows next to these anchors only. Lower half add blank vintage shop awnings, modest roadside diner, bathhouse chimney, hill with tiny record-like abstract circular decor without text. Upper half quiet Heisei park, bridge near614,338 and overlook near881,154. These features very small, backdrop supports overlay UI; faded watercolor. No text/logos/brands/real shrines/people.

### Pass 3

Edit image1 map using image2 as STRICT ROAD GEOMETRY guide. Output 1024x1536. Keep handmade watercolor washi style and indigo/gold fine border from image1. Replace main road with exactly the continuous serpentine geometry in image2, at the exact same canvas coordinates. Remove dark guide dots in final; they are invisible UI marker anchor positions, not artwork. No dots, circles, lettering or numbers in output. Do not approximate road from image1; follow image2 faithfully, especially the downward loop at center right. Make all scenery pale low contrast with generous blank washi around road. Bottom Showa vintage shops blank awnings, mountain pass, original small roadside diner with generic canopy, bathhouse chimney and a modest record-shop district. Top Heisei small neighborhood park, bridge beside left bend at x614 y338 and overlook at x881 y154. Just a tiny roof shadow at each guide dot, no large shrine buildings. No real shrines, logos, brands, real cars or lettering. Fully opaque.

### Pass 4

Edit this map with ONLY local architectural/detail changes to make the Showa-to-Heisei transition visually clear. STRICTLY keep the entire winding road geometry and framing pixel positions unchanged. Keep cream paper and indigo/gold border. Keep delicate watercolor; reduce scenery contrast. At the very bottom roadside shops replace traditional tiled buildings with tiny Showa wooden shops with faded blank striped cloth awnings and blank storefronts. At right side of road bend around x350,y1106 near existing chimney: clear modest Showa bathhouse chimney with light steam. At x220,y840 add a very tiny Showa roadside drive-in building with a plain flat canopy, no lettering, and one miniature generic original sedan, no brand. Around x680,y810 place small record shop with a blank black circular vinyl disc graphic in window, no writing. Upper near x850,y550 depict small Heisei neighborhood park with a tiny simple swing and bench beside roof shadow. Near x614,y338 preserve bridge and add a few tiny late-20th-century plain low-rise houses behind it. Top x880,y154 scenic lookout. This is a peaceful late20th-century nostalgic Japanese town not an ancient feudal village. Tiny discreet details only. No text, labels, numbers, logos, real manufacturer models, real shrine designs, people or delinquent culture. Output 1024x1536. All these changes adjacent to road, DO NOT move road.

## C–F first-item approval samples

Built-in image_gen, WebP quality 90. No nine-slice or cropping; D resized from generated 1024×1536 to 256×384. Reference comparison previews have labels and checkerboard backgrounds for alpha review; these are not app assets.

### book-cover

| File | Dimensions | Bytes | Alpha |
|---|---|---:|---|
| book-cover.webp | 1024×1536 | 480974 | no |
| previews/book-cover.webp | 512×768 | 121936 | no |
| previews/compare-book-cover.webp | 800×640 | 126518 | no |

Reference: `assets/goshuin-book-covers/circuit.webp`.

Final prompt:

Use case: product-mockup. Edit reference into an original event goshuin book cover. Portrait 1024x1536, opaque. Preserve reference front-view closed book shape, size in canvas, binding spine, realistic tactile quality and soft background shadow. Replace vermilion decorated cover with deep indigo #2F4A6B woven cloth and a slender gold #C9A24B frame. Center one small elegant gold-line emblem pairing a fictional round-headlight tin toy sedan and an open clamshell mobile phone, linked by a very fine winding journey line, representing Showa to Heisei. Restrained detail and generous indigo cloth whitespace. Remove ALL title labels, writing and existing floral medallions. Absolutely no lettering, numbers, logos, manufacturer motifs, real car model or carrier identity. Not an actual branded automobile. Gold fine embroidery/foil rather than neon. Traditional Japanese handmade collectible finish.

### ticket-event-tag

| File | Dimensions | Bytes | Alpha |
|---|---|---:|---|
| ticket-event-tag.webp | 256×384 | 30934 | yes |
| previews/ticket-event-tag.webp | 128×192 | 10758 | yes |
| previews/compare-ticket-event-tag.webp | 800×640 | 43044 | no |

Reference: `assets/ui-round6/tickets/ticket-gacha-tag-v1.webp`.

Final prompt:

Use case: precise-object-edit. Edit reference reward wooden tag. Keep EXACT reference silhouette, shape, proportions, framing, wood grain, hole position, braided rope placement, restrained attached shadow and transparent outer margin. Output 256x384 transparent background. Change red-and-white cord to indigo #2F4A6B and cream braided cord. Add thin muted gold #C9A24B edging around wood tag. Replace central red circle with indigo circular disk retaining fine gold outline. No text, letters, numbers, logos, icons or watermark. Same real handcrafted worn wood texture and subtle light as reference. One tag only.

### keychain-showa-shoutengai

| File | Dimensions | Bytes | Alpha |
|---|---|---:|---|
| keychains/keychain-showa-shoutengai-v1-transparent.webp | 1024×1536 | 317536 | yes |
| previews/keychain-showa-shoutengai.webp | 512×768 | 114834 | yes |
| previews/compare-keychain-showa-shoutengai.webp | 800×640 | 94370 | no |

Reference: `assets/collection/keychains/keychain-akane-v1-transparent.webp`.

Final prompt:

Use case: product-mockup. Edit reference into one original nostalgic tin toy sedan miniature keychain. Output portrait 1024x1536 with genuine transparent background including inside keyring; remove reference atmospheric background completely. Match reference gold hinged circular keyring at top, short connected gold chain/jump-ring construction, miniature craft finish, detailed realistic shadows ON object and canvas framing/margins. Replace the entire shrine miniature with ONE charming unbranded original small tin toy sedan with round headlights, imaginative softly rounded compact body, indigo #2F4A6B paint and restrained gold #C9A24B trim. Three-quarter view, large miniature body lower in frame; keyring and chain clearly attached at roof hook. Paint rubs, tiny scratches, tin seams, believable wheels and nostalgic toy craftsmanship. Indigo/cream cord accent. If small secondary wooden tag retained, entirely blank with thin gold rim. Absolutely no writing, numbers, logos, manufacturer emblem, real automotive model design, real shrine, branded character, person, delinquent culture or floating external ground shadow. Match reference object scale and premium handmade material realism, NOT flat cartoon.

### goshuin-showa-shoutengai

| File | Dimensions | Bytes | Alpha |
|---|---|---:|---|
| goshuin/showa-shoutengai.webp | 1024×1536 | 523298 | no |
| previews/goshuin-showa-shoutengai.webp | 512×768 | 177308 | no |
| previews/compare-goshuin-showa-shoutengai.webp | 800×640 | 183820 | no |

Reference: `assets/goshuin/akane.webp`.

Final prompt:

Use case: illustration-story. Edit reference into an original fictional goshuin for ひだまり商店街の小社. Portrait 1024x1536 opaque. Match reference warm yellowed fibrous washi paper, bold dry-brush black calligraphy down left side, large distressed vermilion circular seal behind writing, layered woodblock watercolor scenery on right and lower region. Remove existing character and existing text completely. EXACT only permitted black ink text, written vertically in two parallel readable columns (right column first): right column 『ひだまり商店街』, left column 『の小社』. Together reads exactly ひだまり商店街の小社. No other writing, no date, no imitation seal text. Red circular seal contains a SMALL simplified generic round-headlight tin sedan motif instead of letters. Right-side scenery a peaceful fictional Showa shopping street with blank cloth awnings and warm sunlight, a tiny original shrine roof shadow, charming unbranded tin toy sedan vignette at lower right with indigo body and gold trim. No fuzzy mascot; thematic collectible is sedan. Add subtle fine indigo #2F4A6B edge and muted gold #C9A24B accent, keep sacred ink/seal and reference paper/art composition dominant. Fictional original sedan, no real car model, logo, manufacturer, carrier, recognizable real shrine, delinquent or biker depictions. Only the prescribed goshuin black ink name may be text.

## E final keychain inventory

Each side tag carries one black subject pictogram, no text. All eight are 1024×1536 transparent WebP quality 90. No cropping/nine-slice. Built-in image_gen; approved miniature construction and finish used as reference.

| File | Dimensions | Bytes | Alpha | Preview |
|---|---|---:|---|---|
| keychains/keychain-showa-shoutengai-v1-transparent.webp | 1024×1536 | 317536 | yes | previews/keychain-showa-shoutengai.webp |
| keychains/keychain-showa-toge-v1-transparent.webp | 1024×1536 | 395768 | yes | previews/keychain-showa-toge.webp |
| keychains/keychain-showa-drivein-v1-transparent.webp | 1024×1536 | 375940 | yes | previews/keychain-showa-drivein.webp |
| keychains/keychain-showa-sento-v1-transparent.webp | 1024×1536 | 329904 | yes | previews/keychain-showa-sento.webp |
| keychains/keychain-showa-record-v1-transparent.webp | 1024×1536 | 441158 | yes | previews/keychain-showa-record.webp |
| keychains/keychain-heisei-park-v1-transparent.webp | 1024×1536 | 273386 | yes | previews/keychain-heisei-park.webp |
| keychains/keychain-heisei-pager-v1-transparent.webp | 1024×1536 | 364800 | yes | previews/keychain-heisei-pager.webp |
| keychains/keychain-heisei-century-v1-transparent.webp | 1024×1536 | 406292 | yes | previews/keychain-heisei-century.webp |

E all-eight review: `previews/keychains-all.webp` (1104×868).

## F generated goshuin inventory

All eight include the shrine name, subject seal and lower-left もび seal. Showa five use strong yellow washi; Heisei three use brighter whiter washi. 1024×1536 opaque WebP quality 90. No cropping/nine-slice. Small stamp was generated toward reference bbox (51,1309)-(170,1468); a 10–20px variation remains on some images. Exact source-stamp compositing is awaiting explicit user choice.

| File | Dimensions | Bytes | Alpha | Preview |
|---|---|---:|---|---|
| goshuin/showa-shoutengai.webp | 1024×1536 | 523298 | no | previews/goshuin-showa-shoutengai.webp |
| goshuin/showa-toge.webp | 1024×1536 | 537582 | no | previews/goshuin-showa-toge.webp |
| goshuin/showa-drivein.webp | 1024×1536 | 592730 | no | previews/goshuin-showa-drivein.webp |
| goshuin/showa-sento.webp | 1024×1536 | 521268 | no | previews/goshuin-showa-sento.webp |
| goshuin/showa-record.webp | 1024×1536 | 570286 | no | previews/goshuin-showa-record.webp |
| goshuin/heisei-park.webp | 1024×1536 | 612244 | no | previews/goshuin-heisei-park.webp |
| goshuin/heisei-pager.webp | 1024×1536 | 607364 | no | previews/goshuin-heisei-pager.webp |
| goshuin/heisei-century.webp | 1024×1536 | 659566 | no | previews/goshuin-heisei-century.webp |

F all-eight review: `previews/goshuin-all.webp` (1104×868).

## E/F prompt specification

Use approved event sedan keychain and shopping-street goshuin as the matching references. E: realistic miniature, gold hinged ring and chain, indigo/cream connector, aged finish, gold-rim wooden side tag with one black sumi pictogram of subject, no text or brands, transparent1024×1536. F: black dry-brush vertical shrine name in two columns, vermilion round seal with subject pictogram, matching scenic vignette, small lower-left white もび inside vermilion rectangle, opaque1024×1536. Showa warm yellow paper; Heisei bright white paper. Fictional designs only, no logos, manufacturers, carriers, real shrines, people or delinquent culture.

| id | Miniature and tag motif | Shrine title |
|---|---|---|
| showa-shoutengai | round-headlight tin sedan | ひだまり商店街の小社 |
| showa-toge | angular tin coupe | 峠の見晴らし祠 |
| showa-drivein | streamlined tin sports car | 夜明けドライブインの社 |
| showa-sento | black rotary telephone | 銭湯煙突山の祠 |
| showa-record | cassette boombox | レコード坂の御堂 |
| heisei-park | clamshell mobile phone | 放課後の公園ほこら |
| heisei-pager | pocket pager | ポケベル橋のたもと社 |
| heisei-century | compact digital camera | 世紀末の見晴らし社 |

Targeted correction prompts:

- f-showa-shoutengai: Use case: precise-object-edit. Image1 is finished event goshuin. Image2 is the original stamp reference. ONLY correct the small bottom-left vermilion もび seal to match reference ACTUAL red ink bounding rectangle: left x51, top y1309, right x170, bottom y1468 on 1024x1536 canvas; red ink WIDTH119 HEIGHT159. Use the SAME red/white distressed brush stamp as image2, white も above び. Match size and position exactly; current seal varies from reference and must be aligned. Include thin natural paper margin as reference. Remove old small seal before placing corrected one; ONE small seal only. Preserve ALL other artwork, title characters, main large seal, subject, scene, paper color and texture exactly. No title changes, no new text; just もび seal. Opaque1024x1536.
- f-showa-toge: Use case: precise-object-edit. Image1 is finished event goshuin. Image2 is the original stamp reference. ONLY correct the small bottom-left vermilion もび seal to match reference ACTUAL red ink bounding rectangle: left x51, top y1309, right x170, bottom y1468 on 1024x1536 canvas; red ink WIDTH119 HEIGHT159. Use the SAME red/white distressed brush stamp as image2, white も above び. Match size and position exactly; current seal varies from reference and must be aligned. Include thin natural paper margin as reference. Remove old small seal before placing corrected one; ONE small seal only. Preserve ALL other artwork, title characters, main large seal, subject, scene, paper color and texture exactly. No title changes, no new text; just もび seal. Opaque1024x1536.
- f-showa-sento: Use case: precise-object-edit. Image1 is finished event goshuin. Image2 is the original stamp reference. ONLY correct the small bottom-left vermilion もび seal to match reference ACTUAL red ink bounding rectangle: left x51, top y1309, right x170, bottom y1468 on 1024x1536 canvas; red ink WIDTH119 HEIGHT159. Use the SAME red/white distressed brush stamp as image2, white も above び. Match size and position exactly; current seal varies from reference and must be aligned. Include thin natural paper margin as reference. Remove old small seal before placing corrected one; ONE small seal only. Preserve ALL other artwork, title characters, main large seal, subject, scene, paper color and texture exactly. No title changes, no new text; just もび seal. Opaque1024x1536.
- f-showa-record: Use case: precise-object-edit. Image1 is finished event goshuin. Image2 is the original stamp reference. ONLY correct the small bottom-left vermilion もび seal to match reference ACTUAL red ink bounding rectangle: left x51, top y1309, right x170, bottom y1468 on 1024x1536 canvas; red ink WIDTH119 HEIGHT159. Use the SAME red/white distressed brush stamp as image2, white も above び. Match size and position exactly; current seal varies from reference and must be aligned. Include thin natural paper margin as reference. Remove old small seal before placing corrected one; ONE small seal only. Preserve ALL other artwork, title characters, main large seal, subject, scene, paper color and texture exactly. No title changes, no new text; just もび seal. Opaque1024x1536.
- f-heisei-park: Use case: precise-object-edit. Image1 is finished event goshuin. Image2 is the original stamp reference. ONLY correct the small bottom-left vermilion もび seal to match reference ACTUAL red ink bounding rectangle: left x51, top y1309, right x170, bottom y1468 on 1024x1536 canvas; red ink WIDTH119 HEIGHT159. Use the SAME red/white distressed brush stamp as image2, white も above び. Match size and position exactly; current seal varies from reference and must be aligned. Include thin natural paper margin as reference. Remove old small seal before placing corrected one; ONE small seal only. Preserve ALL other artwork, title characters, main large seal, subject, scene, paper color and texture exactly. No title changes, no new text; just もび seal. Opaque1024x1536.
- f-heisei-pager: Use case: precise-object-edit. Image1 is finished event goshuin. Image2 is the original stamp reference. ONLY correct the small bottom-left vermilion もび seal to match reference ACTUAL red ink bounding rectangle: left x51, top y1309, right x170, bottom y1468 on 1024x1536 canvas; red ink WIDTH119 HEIGHT159. Use the SAME red/white distressed brush stamp as image2, white も above び. Match size and position exactly; current seal varies from reference and must be aligned. Include thin natural paper margin as reference. Remove old small seal before placing corrected one; ONE small seal only. Preserve ALL other artwork, title characters, main large seal, subject, scene, paper color and texture exactly. No title changes, no new text; just もび seal. Opaque1024x1536.
- e-showa-sento: Use case: precise-object-edit. ONLY change the rotary telephone miniature main body, handset and coiled phone cable from navy blue to true black aged lacquer (#17191D) with subtle gray reflections. This must read as a BLACK telephone. Preserve all gold trim, scratches, realistic material, gold keyring and chain, indigo/cream hanging cord, wooden side tag and its black telephone pictogram, composition and framing exactly. Do not change outside the phone miniature; keep transparent background and holes. No writing/numbers/logos. 1024x1536.
- f-heisei-century: Use case: illustration-story. Create a matching fictional goshuin for 世紀末の見晴らし社. Image1 sets event woodblock watercolor style, large vermilion seal and black brush calligraphy arrangement. Image2 sets small bottom-left もび stamp. Exact black title vertical in two columns: right 世紀末の見晴らし; left 社. Main large distressed circular seal contains a small original compact digital camera pictogram, no seal letters. Right scenery a quiet scenic overlook and distant late20th-century skyline with gentle pale blue sky and soft spring trees, one tiny fictional roof shadow. Lower right original unbranded compact digital camera with large lens, blank screen and unlabeled controls, indigo body with subtle gold trim. NO reference car or mascot. White bright fibrous washi, visibly whiter than Showa, delicate cream white paper with cool indigo scenery accents and pastel daylight, no orange/yellow stained paper. Mandatory small bottom-left distressed vermilion rectangle seal with white も above び vertically, exactly reference actual red-ink bbox x51,y1309 to x170,y1468, width119 height159. Only title and this もび may be text. No logos, numbers, brand, manufacturer design, real shrine or people. Opaque1024x1536.


## 15-spot taste samples (2026-10-09)

Authoritative brief: docs/codex-event-assets-taste.md, merged from claude/events at 468b2f2. Initial E3/F2 batch only; remaining E12/F13 and B/C/D/A await visual approval. Built-in image_gen; pristine era-new objects, no aging. F uses era typography and a single round metal/holographic もび marker rather than traditional stamps. All legacy E/F files retained. WebP quality90, method6; E generated alpha retained. Comparison previews are 800×650, previous left/new right. Strap is compared with the previous Heisei park item as an era reference, since no legacy strap exists.

### e-showa-car

- File: keychains/keychain-showa-car-v1-transparent.webp
- Dimensions: 1024×1536; bytes: 324616; alpha: (0, 254)
- Comparison: previews/compare-15-e-showa-car.webp (800×650)
- Source: C:\Users\User\.codex\generated_images\01a11af9-b286-7401-9677-f00660143a49\exec-31b0781c-0042-4fbd-bd30-e8c3b040df36.png
- Final generation prompt: Pristine newly released product in its own era, high saturation and contrast, immaculate glossy finish and strong specular lighting. No scratches, patina, dirt, rust, faded colors, sepia, aging or nostalgia filter. Original fictional unbranded design: no actual model, manufacturer emblem, logos, product names, copyrighted characters, people or dangerous driving. Create a premium realistic 3D collectible miniature keychain, portrait 1024x1536 truly transparent background and transparent holes. Entire object in frame with comfortable margins. Polished gold split ring at top, small linked gold chain, braided cord, attached small fresh pale wood tag with gold rim and ONE small black ink pictogram of the subject, absolutely NO letters/numbers. Main miniature fills lower two thirds with dramatic three-quarter view, detailed realistic materials. A brand-new Showa-era original boxy low flat two-door coupe, long straight hood, FOUR ROUND HEADLIGHTS, broad angular grille without emblem, thick mirror chrome bumpers, wide whitewall tires, deep vivid candy turquoise lacquer. Angular straight-edged body, never round small sedan. Bright warm sodium gold and magenta neon reflections on chrome and glossy paint, no background signs. Indigo-white cord, wood tag black car silhouette. Use image1 only as reference for keyring/chain/cord/tag arrangement, discard all aging and rounded car. Image2 only general period boxy proportions, do NOT copy its exact car or logos.

### e-heisei-keitai

- File: keychains/keychain-heisei-keitai-v1-transparent.webp
- Dimensions: 1024×1536; bytes: 425392; alpha: (0, 254)
- Comparison: previews/compare-15-e-heisei-keitai.webp (800×650)
- Source: C:\Users\User\.codex\generated_images\01a11af9-b286-7401-9677-f00660143a49\exec-389c5fcb-0a22-410c-aa0c-df812587268a.png
- Final generation prompt: Pristine newly released product in its own era, high saturation and contrast, immaculate glossy finish and strong specular lighting. No scratches, patina, dirt, rust, faded colors, sepia, aging or nostalgia filter. Original fictional unbranded design: no actual model, manufacturer emblem, logos, product names, copyrighted characters, people or dangerous driving. Create a premium realistic 3D collectible miniature keychain, portrait 1024x1536 truly transparent background and transparent holes. Entire object in frame with comfortable margins. Polished gold split ring at top, small linked gold chain, braided cord, attached small fresh pale wood tag with gold rim and ONE small black ink pictogram of the subject, absolutely NO letters/numbers. Main miniature fills lower two thirds with dramatic three-quarter view, detailed realistic materials. A newly released Heisei folding mobile phone OPEN with hinge, short antenna, bright color LCD displaying only abstract pastel geometric shapes NO UI letters or numbers. Iridescent metallic pink and clear violet plastic, dense small rhinestones, holographic heart and star embellishments, polished chrome, vivid pink-aqua-lavender gradient sparkle. Unlabeled physical keypad. Pink-aqua braided cord. Wood tag ONE black folding-phone pictogram. Clean polished gold hardware. No text anywhere.

### e-heisei-strap

- File: keychains/keychain-heisei-strap-v1-transparent.webp
- Dimensions: 1024×1536; bytes: 533246; alpha: (0, 254)
- Comparison: previews/compare-15-e-heisei-strap.webp (800×650)
- Source: C:\Users\User\.codex\generated_images\01a11af9-b286-7401-9677-f00660143a49\exec-69264631-5b32-4608-bf14-5d770d834852.png
- Final generation prompt: Pristine newly released product in its own era, high saturation and contrast, immaculate glossy finish and strong specular lighting. No scratches, patina, dirt, rust, faded colors, sepia, aging or nostalgia filter. Original fictional unbranded design: no actual model, manufacturer emblem, logos, product names, copyrighted characters, people or dangerous driving. Create a premium realistic 3D collectible miniature keychain, portrait 1024x1536 truly transparent background and transparent holes. Entire object in frame with comfortable margins. Polished gold split ring at top, small linked gold chain, braided cord, attached small fresh pale wood tag with gold rim and ONE small black ink pictogram of the subject, absolutely NO letters/numbers. Main miniature fills lower two thirds with dramatic three-quarter view, detailed realistic materials. Main miniature is a flamboyant BUNDLE of multiple new Heisei fashion phone straps hanging in separate strings: translucent glitter candy pink/aqua/lavender beads, holographic hearts, clear faceted stars, rhinestone spheres, tiny shiny metallic charms. NO PHONE as main body, no mascot or character. Pink-aqua braided cord and small wood side tag ONE black star pictogram. Many crisp glossy little highlights, dramatic but realistic product illustration.

### f-showa-car

- File: goshuin/showa-car.webp
- Dimensions: 1024×1536; bytes: 426906; alpha: None
- Comparison: previews/compare-15-f-showa-car.webp (800×650)
- Source: C:\Users\User\.codex\generated_images\01a11af9-b286-7401-9677-f00660143a49\exec-2bec48da-f953-4476-a7bc-e637bf244921.png
- Final generation prompt: Pristine newly released product in its own era, high saturation and contrast, immaculate glossy finish and strong specular lighting. No scratches, patina, dirt, rust, faded colors, sepia, aging or nostalgia filter. Original fictional unbranded design: no actual model, manufacturer emblem, logos, product names, copyrighted characters, people or dangerous driving. Create a FULL BLEED rectangular portrait 1024x1536 opaque collectible card. NOT Japanese traditional goshuin: NO washi, brush calligraphy, red seal, ink stamp, torii or shrine scenery. Only readable text is the exact Japanese shrine title specified plus ONE tiny round corner marker reading もび. Clear accurate characters, no other lettering including on objects. Powerful large composition. A brand-new Showa-era original boxy low flat two-door coupe, long straight hood, FOUR ROUND HEADLIGHTS, broad angular grille without emblem, thick mirror chrome bumpers, wide whitewall tires, deep vivid candy turquoise lacquer. Angular straight-edged body, never round small sedan. Bright warm sodium gold and magenta neon reflections on chrome and glossy paint, no background signs. Fresh polished enamel sign / glossy Showa movie-poster composition. Hero car enormous in lower 65%, low camera, radiant sodium amber neon magenta reflections, geometric navy #2F4A6B rim with gold highlights. Top exact title in readable Japanese signmaker block typography, lit dimensional enamel lettering: 「ひだまり商店街の小社」 split as ひだまり商店街 / の小社. NOT brush. One small round gold-metal badge bottom-left reading もび, ~7% canvas width. Poster printed brand-new, high gloss, no other text.

### f-heisei-keitai

- File: goshuin/heisei-keitai.webp
- Dimensions: 1024×1536; bytes: 661030; alpha: None
- Comparison: previews/compare-15-f-heisei-keitai.webp (800×650)
- Source: C:\Users\User\.codex\generated_images\01a11af9-b286-7401-9677-f00660143a49\exec-2acd7d82-a497-4021-8cff-79ba647960af.png
- Final generation prompt: Pristine newly released product in its own era, high saturation and contrast, immaculate glossy finish and strong specular lighting. No scratches, patina, dirt, rust, faded colors, sepia, aging or nostalgia filter. Original fictional unbranded design: no actual model, manufacturer emblem, logos, product names, copyrighted characters, people or dangerous driving. Create a FULL BLEED rectangular portrait 1024x1536 opaque collectible card. NOT Japanese traditional goshuin: NO washi, brush calligraphy, red seal, ink stamp, torii or shrine scenery. Only readable text is the exact Japanese shrine title specified plus ONE tiny round corner marker reading もび. Clear accurate characters, no other lettering including on objects. Powerful large composition. A newly released Heisei folding mobile phone OPEN with hinge, short antenna, bright color LCD displaying only abstract pastel geometric shapes NO UI letters or numbers. Iridescent metallic pink and clear violet plastic, dense small rhinestones, holographic heart and star embellishments, polished chrome, vivid pink-aqua-lavender gradient sparkle. Unlabeled physical keypad. Brand-new Heisei holographic sticker-book card. Oversized hero folding phone center lower 65%, luminous pastel pink-aqua-lavender gradient, glitter, rhinestone sparkle, puffy hearts/stars and holographic foil frame. Top exact title in big readable Japanese rounded POP lettering 「放課後の公園ほこら」 split as 放課後の / 公園ほこら, glossy candy pink and white outlined type. One tiny ROUND rainbow holographic sticker bottom-left reading もび, ~7% canvas width. No other text. No traditional paper or ink.

## Event key visual - review candidate (2026-10-09)

Generated with built-in image_gen using babumoby.webp, bearmobby.webp and dogmobby.webp as character identity/material references. Initial composition was edited once to turn all three friends toward the upper-right Heisei destination. Resized with Lanczos and encoded as WebP quality 90, method 6; generated alpha preserved. Rounded rectangle radius approximately 6% of width, thin indigo (#2F4A6B) and gold (#C9A24B) frame. No nine-slice. No text or logos. Factory-new fictional era objects; no aging or delinquent imagery. Review candidate; subsequent adjustments await user review.

| File | Dimensions | Bytes | Alpha | Purpose |
|---|---|---:|---|---|
| key-visual.webp | 1024x1152 | 536862 | yes | Popup key visual: three distinct plush Moby friends following an S-road from Showa neon night to Heisei pastel day |
| previews/key-visual-375.webp | 375x422 | 96110 | yes | Requested 375pt-width review at 1 pixel per point |
| previews/key-visual-290.webp | 290x326 | 61186 | yes | Review at approximate actual popup artwork width |

Generation prompt (normalized): Portrait 8:9 rounded rectangular mobile-event illustration, transparent outside corners, thin indigo/gold frame. One broad S-road runs bottom-left to upper-right. Lower half is Showa night with sodium-orange lighting, abstract wordless neon and wet chrome reflections; large original boxy four-round-headlight candy two-tone car, chrome motorcycle, wood-cabinet color CRT and mirror ball. Upper half is Heisei pastel-pink/blue day with glitter and rainbow holographic shine; large decorated flip phone, slim PHS, translucent pager, bead/heart/star straps, glossy platform boots and voluminous white loose socks. Exactly three large side-by-side walking plush Moby friends matching baby, bear and dog references, moving toward upper-right; understated shrine roof at road end. Factory-new glossy objects, saturated lighting, bold readable forms at 290pt. No lettering, numbers, brands, recognizable real products, logos, extra characters, grain, fading, rust, scratches, sepia or delinquent/dangerous-driving imagery.

Final edit prompt: Preserve composition, objects, colors, character identities, road and rounded indigo/gold frame with transparent outside corners. Change only the three central friends into three-quarter rear/side walking poses toward the upper-right pastel shrine, with heads and feet pointing in the travel direction, no looking back at the camera; preserve their large size and side-by-side row. No text, logos or extra embellishments.

Validation: RGBA WebP; alpha range 0-255. Four corner alpha values of the main asset are 0,0,1,0 (the value 1 is a near-transparent antialiasing sample); preview corners are all 0. Visually reviewed the 375px derivative for character count, direction, period-object readability and no lettering. Only the new key visual, its two previews and this manifest are included in its commit; pre-existing changes are retained.

- key-visual.webp: replaced on 2026-10-09 by the variant the user chose (three friends facing front, 1000x1125, alpha). Same 8:9 ratio as the first version.
