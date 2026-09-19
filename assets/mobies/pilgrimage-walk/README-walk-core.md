# 巡礼歩行スプライト

`{id}.png` は、御朱印巡り画面で使う右向き歩行アニメーションです。

現在のモビー18体（mobirin / mobichi / yami / mobiyan / mobiyura / reomoby /
potemoby / mobibou / babumoby / bearmobby / boymobby / dogmobby / lanimobby /
ojimobby / reamobby / shikamobby / uyumobby / wolfmobby）をすべて収録しています。

- 1枚につき横4コマ、`1536 × 1024 px`（1コマ `384 × 1024 px`）
- 4コマの順序は `contact → down → passing → up`
- 全コマを同じ縮尺・同じ接地線で配置
- 右向きの横姿勢、全身がセル内に収まる
- 背景は実アルファ透明（チェッカー模様は含めない）
- 文字、枠線、仕切り線、床、影、透かしは含めない

## 生成プロンプト

Use case: stylized-concept  
Asset type: game character animation sprite sheet  
Input images: supplied existing character artwork as the identity reference; preserve the same plush fur, face, camera-lens eye, cross, costume, and signature accessories.  
Primary request: create one horizontal four-frame walk-cycle sprite sheet of the same character walking toward the right in a clean side profile. Use four sequential in-between poses: contact, down, passing, up.  
Scene/backdrop: genuinely transparent background across the full canvas.  
Composition/framing: one `1536 × 1024` canvas divided conceptually into exactly four equal `384 × 1024` cells; one complete full-body character per cell; identical scale and shared baseline; transparent padding; no overlap.  
Style/medium: polished high-detail plush-toy render matching the supplied character artwork, with tactile fur and accessory textures.  
Constraints: exactly four poses only; preserve identity and signature accessories; no text, labels, watermark, divider lines, borders, floor, cast shadow, extra objects, cropped limbs, or costume changes. Export with real alpha transparency.

The built-in image generation output may show a checkerboard in the rendered preview. Each final PNG is checked and cleaned so pixels outside the character are actually alpha `0`.
