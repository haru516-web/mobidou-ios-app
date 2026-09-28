# Asset optimization results (2026-09-28)

## Size and reference audit

- Before: 1,076 images, 1,088.37 MiB under `assets/`.
- Removed 124 statically unreferenced images (180.79 MiB). The pre-deletion inventory is in [asset-reference-audit-before-cleanup-2026-09-28.md](asset-reference-audit-before-cleanup-2026-09-28.md).
- Replaced 612 referenced PNGs with WebP files. The exact path mapping is in [png-to-webp-replacements-before-delete-2026-09-28.md](png-to-webp-replacements-before-delete-2026-09-28.md).
- Final: 952 image files, 290.25 MiB of images and 290.29 MiB across all of `assets/` (73.3% smaller than before).
- Final reference audit: 952 referenced images; zero unused images, dynamic `require()` calls, or unresolved image references.

## Encoding and visual checks

- Converted PNGs to WebP at quality 97 for backgrounds and existing goshuin, and quality 95 for other image groups; kept ICC profiles and preserved alpha exactly.
- The checkout contains 86 goshuin PNGs, rather than the 74 noted in the initial estimate. Converted the 42 larger files; left the 44 already-small PNGs untouched. Largest converted goshuin is 0.93 MiB.
- Converted 28 backgrounds; the largest is 0.75 MiB.
- Compared representative goshuin, backgrounds, keychain, atlas, collection, and pilgrimage images side-by-side. No visible difference was found in those samples. Also inspected the exported opening screen and a route card in the browser.
- Kept `src/data` object keys and surrounding lines intact; only image extensions changed in those files.

## Verification

- `npm run typecheck` — passed.
- `npm test` — 42 passed, 0 failed.
- `npx expo export --platform web` — passed; bundled 1,181 modules.
- `git diff --check` — passed.

The Expo SDK 54 `expo-image` documentation lists WebP support across Android, iOS, and Web: <https://docs.expo.dev/versions/v54.0.0/sdk/image/>.
