# Collection layout correction (build 15 baseline)

- Branch: `codex/ipad-collection-layout-fix`
- Base: `ae439a421175279a4e44bab24735a859abb99b78` (EAS production build 15).
- Preview: `http://localhost:8084/`, served from this worktree.

The old layout reserved a constant 88 points at the bottom. The actual content
ends above the navigation and its padding; fitting the shelf to the window did
not ensure that it fit inside the clipped collection content. It also mixed
window measurements with background coordinates and imposed a 260-point minimum
height on the stage.

The background, exhibits and collection buttons now share one geometry calculated
from the content's measured bounds in the app container. The shelf stays inside
those bounds with 12 points of space below it; the stage uses its actual height.
When necessary, the room image compresses vertically so both the rail and shelf
remain available. Existing artwork and collection data are unchanged.

## Verification (2026-10-30)

- `npm run typecheck`: passed.
- `node --experimental-strip-types --test tests/collectionRoomArt.test.ts`: 2 passed.
- Geometry tests cover six window sizes, three top insets and three navigation
  heights, plus a change in content origin.
- HTTP: 200 on port 8084.
- Browser measurements (CSS pixels, unowned exhibits):

| Viewport | Collection bottom | Exhibit bottom | Navigation tabs top |
| --- | ---: | ---: | ---: |
| 320 x 480 | 380 | 368 | 404 |
| 375 x 568 | 468 | 456 | 492 |
| 820 x 1180 | 1080 | 967.61 | 1104 |
| 1180 x 820 | 720 | 685.53 | 744 |

Screenshots were inspected at all four sizes. The goshuin list opened and reached
page 7/7 at 820 x 1180. The miniature list opened and advanced a page at 320 x 480;
its close control returned to the room.

This is Web validation. Native iPad compatibility-mode rendering and gestures
still require TestFlight/device validation before resubmission. No App Store
build, submission or remote push was performed.
