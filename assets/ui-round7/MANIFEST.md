# UI round 7 asset manifest

- Worktree: D:/mobby/mobidou-ui-assets7
- Branch: codex/ui-assets-round7
- Base: claude/ui-navigation-overhaul / 5243d63
- Brief: docs/codex-ui-asset-prompts-round7.md
- Inventory: 18 explicitly named files in N-1 through N-13. The brief says 21 but does not specify the remaining three; no extra assets were invented.
- Generator: built-in image_gen. WebP quality 90, method 6, preserved alpha. No PNG originals in this worktree.
- Code and existing assets are unchanged. Each asset is committed separately with its manifest row.
- All slice widths below are SOURCE pixels. Horizontal 3-slice: preserve left/right ends, stretch only the center. No vertical slices.
- Avatar opening: 154px (192 x 80% = 153.6px, rounded to integer pixels); center transparent.
- Review files: assets/ui-round7/_review/ (UNCOMMITTED). Light/dark previews for each asset, actual-size-contact-sheet.webp, actual-size-dark-contact-sheet.webp, slice-width-check.webp, sheet-at-390x844.webp.
- Preview sizes use specified 38px notification icons, 10px dot, 28px gift, 64px avatar, and representative 390px sheet / 350px content width. They verify assets at display scale; application code integration is outside this task.

## Prompt set

Common: Production Mobidou raster UI assets. Match existing ivory washi, muted vermilion around #A54E42, indigo ink, soft hand-drawn outlines, handmade torn edges, natural paper/wood/lacquer textures, soft upper-left natural light. Where specified, use a thin contour contact shadow to the lower right. No text, numbers, logos, watermark, people, or characters. Transparent assets have genuine alpha; opaque assets fill the canvas. Stretchable centers remain quiet and nearly plain. The per-asset prompt details are recorded in the last column.

## Files

| File (relative to assets/ui-round7/) | Dimensions px | Bytes | Alpha | Use | Slice source px (L/R) | Review display px | Per-asset prompt details |
|---|---:|---:|---|---|---|---:|---|
| sheet/sheet-bg-v1.webp | 1170 x 2532 | 223092 | opaque | シート背景 | none | 390 x 844 | 明るい中央と少し濃い左右縁の静かな和紙面。 |
| sheet/sheet-header-v1.webp | 1536 x 192 | 33902 | opaque | ヘッダー | 96/96 (3-slice) | 390 x 76 | 全面生成り和紙、まっすぐな上端、下端に細い墨のかすれ線。 |
| sheet/section-plate-v1.webp | 480 x 72 | 15810 | transparent | 見出し | 36/36 (3-slice) | 240 x 36 | 淡い和紙短冊と左端の小さい朱点。 |
| empty/empty-notices-v1.webp | 256 x 192 | 12496 | transparent | 空状態・通知 | none | 128 x 96 | 静かな鈴、右下方向の薄い輪郭接地影。 |
| empty/empty-gifts-v1.webp | 256 x 192 | 12426 | transparent | 空状態・プレゼント | none | 128 x 96 | 閉じた包み紙の贈り物と結び紐、右下方向の接地影。 |
| empty/empty-friends-v1.webp | 256 x 192 | 12990 | transparent | 空状態・フレンド | none | 128 x 96 | 並ぶ小さい二つの足跡と遠くの灯。人物なし。 |
| ui/notice-strip-v1.webp | 960 x 120 | 30280 | transparent | オフライン案内 | 48/48 (3-slice) | 350 x 44 | 少し黄みのあるちぎり和紙、左端に小さい麻ひもの結び跡。 |
| notice/notice-todo-v1.webp | 128 x 128 | 6512 | transparent | やること | none | 38 x 38 | 朱漆の丸と白い短い筆のはね。文字に見える曲線を避ける。 |
| notice/notice-status-v1.webp | 128 x 128 | 7232 | transparent | いまの旅 | none | 38 x 38 | 藍墨の丸と白い小さい足跡。 |
| notice/notice-event-v1.webp | 128 x 128 | 7366 | transparent | できごと | none | 38 x 38 | 生成り和紙の丸と小さい朱の花。 |
| notice/unread-dot-v1.webp | 64 x 64 | 2770 | transparent | 未読点 | none | 10 x 10 | 少し輪郭が揺れる朱の墨点。 |
| ui/button-small-v1.webp | 320 x 96 | 12706 | transparent | 小ボタン・通常 | 40/40 (3-slice) | 107 x 32 | 淡い和紙と細い朱の縁。中央は文字を重ねられる空白。 |
