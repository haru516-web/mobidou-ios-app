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
