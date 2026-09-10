# Opening time-of-day cycle

The opening screen uses these 16 generated raster frames in order. Every frame was generated from the same `summer-green.png` location reference so the mountain path, lake, torii, lantern, railing, trees, camera, crop, and scale stay fixed; only time-of-day color, sky, and lighting change.

| Frame | Time | Atmosphere |
| ---: | :--- | :--- |
| 01 | 05:00 | 明け方 |
| 02 | 06:00 | 朝焼け |
| 03 | 07:00 | 朝 |
| 04 | 08:30 | 朝 |
| 05 | 10:00 | 午前 |
| 06 | 11:30 | 昼前 |
| 07 | 13:00 | 正午 |
| 08 | 14:30 | 午後 |
| 09 | 16:00 | 昼下がり |
| 10 | 17:30 | 黄金時間 |
| 11 | 18:30 | 夕陽 |
| 12 | 19:30 | 宵 |
| 13 | 21:00 | 夜 |
| 14 | 23:00 | 月夜 |
| 15 | 02:00 | 深夜 |
| 16 | 04:30 | 夜明け前 |

`App.tsx` cross-fades the 16 images in place after a single left swipe. The generated frames already contain the lighting, so the opening screen does not add a synthetic color wash over them or expose a moving image seam.
