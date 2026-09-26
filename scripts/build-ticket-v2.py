"""Bake the fixed Japanese ticket copy into the generated washi artwork."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TICKETS = ROOT / "assets" / "tickets"
FONT_DIR = ROOT / "node_modules" / "@expo-google-fonts" / "shippori-mincho"
REGULAR = FONT_DIR / "400Regular" / "ShipporiMincho_400Regular.ttf"
BOLD = FONT_DIR / "700Bold" / "ShipporiMincho_700Bold.ttf"


def draw_center(draw, text, x, y, size, max_width, color, bold=False):
    font_path = BOLD if bold else REGULAR
    font = ImageFont.truetype(font_path, size)
    while draw.textbbox((0, 0), text, font=font)[2] > max_width:
        size -= 1
        font = ImageFont.truetype(font_path, size)
    draw.text((x, y), text, font=font, fill=color, anchor="mm")


def build_ticket(source, destination, *, center, color, accent, eyebrow, title, caption, title_sizes, caption_center=None):
    ticket = Image.open(TICKETS / "sources-v2" / source).convert("RGBA")
    draw = ImageDraw.Draw(ticket)
    x = center
    draw_center(draw, "MOBIDOU", x, 505, 36, 390, accent, bold=True)
    draw_center(draw, eyebrow, x, 558, 39, 390, color)
    draw.line((x - 167, 606, x + 167, 606), fill=accent, width=3)
    for line, y, size in zip(title, (700, 816, 932), title_sizes):
        draw_center(draw, line, x, y, size, 470, color, bold=True)
    draw_center(draw, caption, caption_center or x, 1061, 50, 490, accent)
    ticket.save(TICKETS / destination, optimize=True)


build_ticket(
    "ticket-cover-change-base.png",
    "ticket-cover-change-v2.png",
    center=555,
    color="#213b4a",
    accent="#a94331",
    eyebrow="旅の引換札",
    title=("御朱印帳", "表紙替え", "引換券"),
    caption="巡礼の装いを新たに",
    title_sizes=(88, 88, 96),
)

build_ticket(
    "ticket-keychain-drop-base.png",
    "ticket-keychain-drop-v2.png",
    center=480,
    color="#1f4648",
    accent="#945631",
    eyebrow="旅の授与札",
    title=("ミニチュア", "キーホルダー", "引換券"),
    caption="ご縁を手元に",
    title_sizes=(75, 68, 96),
    caption_center=390,
)
