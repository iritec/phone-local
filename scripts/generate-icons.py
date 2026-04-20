#!/usr/bin/env python3

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parent.parent
BUILD_DIR = ROOT / "build"
SOURCE_PATH = BUILD_DIR / "icon-source.png"
MASTER_ICON_PATH = BUILD_DIR / "icon.png"
ICNS_PATH = BUILD_DIR / "icon.icns"
ICONSET_DIR = BUILD_DIR / "icon.iconset"


def average_corner_color(image: Image.Image) -> tuple[int, int, int]:
    points = (
        (0, 0),
        (image.width - 1, 0),
        (0, image.height - 1),
        (image.width - 1, image.height - 1),
    )
    samples: list[tuple[int, int, int]] = []
    for x, y in points:
        samples.append(image.getpixel((x, y))[:3])
    return tuple(round(sum(values) / len(values)) for values in zip(*samples))


def centered_canvas(source: Image.Image, size: int, inset_ratio: float) -> Image.Image:
    bg = average_corner_color(source)
    canvas = Image.new("RGBA", (size, size), (*bg, 255))
    fitted = ImageOps.contain(
        source,
        (round(size * inset_ratio), round(size * inset_ratio)),
        method=Image.Resampling.LANCZOS,
    )
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted)
    return canvas


def export_png(image: Image.Image, path: Path, size: int) -> None:
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path)


def build_master_icon() -> Image.Image:
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(f"Missing source image: {SOURCE_PATH}")
    source = Image.open(SOURCE_PATH).convert("RGBA")
    master = centered_canvas(source, 1024, inset_ratio=0.91)
    master.save(MASTER_ICON_PATH)
    return master


def build_iconset(master: Image.Image) -> None:
    if ICONSET_DIR.exists():
        shutil.rmtree(ICONSET_DIR)
    ICONSET_DIR.mkdir(parents=True, exist_ok=True)

    for base_size in (16, 32, 128, 256, 512):
        export_png(master, ICONSET_DIR / f"icon_{base_size}x{base_size}.png", base_size)
        export_png(master, ICONSET_DIR / f"icon_{base_size}x{base_size}@2x.png", base_size * 2)

    subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(ICNS_PATH)],
        check=True,
    )


def draw_tray_base(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    pad = round(size * 0.16)
    body_left = pad + 6
    body_top = pad + 4
    body_right = size - pad - 6
    body_bottom = size - pad
    radius = round(size * 0.12)

    draw.polygon(
        [
            (body_left + 4, body_top + 2),
            (body_left + 12, pad - 4),
            (body_left + 18, body_top + 6),
        ],
        fill=(0, 0, 0, 255),
    )
    draw.polygon(
        [
            (body_right - 18, body_top + 6),
            (body_right - 12, pad - 4),
            (body_right - 4, body_top + 2),
        ],
        fill=(0, 0, 0, 255),
    )
    draw.rounded_rectangle(
        (body_left, body_top, body_right, body_bottom),
        radius=radius,
        fill=(0, 0, 0, 255),
    )

    inset = round(size * 0.1)
    draw.rounded_rectangle(
        (body_left + inset, body_top + inset + 2, body_right - inset, body_bottom - inset - 8),
        radius=round(radius * 0.55),
        fill=(0, 0, 0, 0),
    )

    bubble_top = body_top + inset + 12
    bubble_bottom = bubble_top + 12
    bubble_left = body_left + inset + 7
    bubble_right = body_right - inset - 7
    draw.rounded_rectangle(
        (bubble_left, bubble_top, bubble_right, bubble_bottom),
        radius=6,
        fill=(0, 0, 0, 0),
    )
    draw.polygon(
        [
            (bubble_left + 12, bubble_bottom - 1),
            (bubble_left + 18, bubble_bottom + 5),
            (bubble_left + 20, bubble_bottom - 1),
        ],
        fill=(0, 0, 0, 0),
    )

    speaker_width = round(size * 0.12)
    draw.rounded_rectangle(
        (
            size // 2 - speaker_width // 2,
            body_top + 8,
            size // 2 + speaker_width // 2,
            body_top + 12,
        ),
        radius=2,
        fill=(0, 0, 0, 0),
    )
    draw.ellipse(
        (
            size // 2 - 4,
            body_bottom - 10,
            size // 2 + 4,
            body_bottom - 2,
        ),
        fill=(0, 0, 0, 0),
    )
    return image


def build_tray_icons() -> None:
    tray_base = draw_tray_base(88)
    for name, size in (("trayTemplate.png", 18), ("trayTemplate@2x.png", 36)):
        export_png(tray_base, BUILD_DIR / name, size)


def main() -> None:
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    master = build_master_icon()
    build_iconset(master)
    build_tray_icons()
    print("Generated app and tray icons in build/")


if __name__ == "__main__":
    main()
