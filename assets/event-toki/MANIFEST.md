# Toki event assets

Branch: `codex/event-assets`; base: `639cf695f4b05e97006e27c850ad4d893eb70d57` (`claude/events`).

Generated with the built-in image_gen tool. WebP quality 90; alpha retained. No nine-slice. Buttons: generated alpha bounds normalized to reference bounds (14,21)-(500,497) on 512x512 canvas; no artwork clipping. Previews are review-only. A–D approved. E all eight complete. F all eight generated; exact reference-stamp compositing awaits user choice.

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
