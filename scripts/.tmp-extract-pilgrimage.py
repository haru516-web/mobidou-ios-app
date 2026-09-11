from collections import deque
from pathlib import Path

from PIL import Image
import numpy as np


def extract(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image, dtype=np.int16)
    height, width, _ = rgb.shape
    cell_width = width // 4
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = maximum - minimum
    luminance = rgb.mean(axis=2)
    # The generated canvas uses a grayscale checkerboard. Colored/dark pixels
    # form the character core; flood-fill only the connected grayscale canvas.
    sat_threshold = int(__import__('os').environ.get('SAT_THRESHOLD', '9'))
    luma_threshold = int(__import__('os').environ.get('LUMA_THRESHOLD', '175'))
    core = (saturation > sat_threshold) | (luminance < luma_threshold)
    keep = np.zeros((height, width), dtype=bool)
    for cell in range(4):
        x0, x1 = cell * cell_width, (cell + 1) * cell_width
        core_cell = core[:, x0:x1]
        background_candidate = ~core_cell & (luminance[:, x0:x1] > 165)
        reachable = np.zeros_like(background_candidate)
        queue = deque()
        for x in range(cell_width):
            for y in (0, height - 1):
                if background_candidate[y, x] and not reachable[y, x]:
                    reachable[y, x] = True
                    queue.append((y, x))
        for y in range(height):
            for x in (0, cell_width - 1):
                if background_candidate[y, x] and not reachable[y, x]:
                    reachable[y, x] = True
                    queue.append((y, x))
        while queue:
            y, x = queue.popleft()
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < height and 0 <= xx < cell_width and background_candidate[yy, xx] and not reachable[yy, xx]:
                    reachable[yy, xx] = True
                    queue.append((yy, xx))
        keep[:, x0:x1] = ~reachable
        ys, xs = np.where(keep[:, x0:x1])
        if len(xs):
            print(source.name, cell, int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()), int(len(xs)))
    rgba = np.dstack([rgb.astype(np.uint8), np.where(keep, 255, 0).astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(target)


if __name__ == "__main__":
    import sys

    extract(Path(sys.argv[1]), Path(sys.argv[2]))
