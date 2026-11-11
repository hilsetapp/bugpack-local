"""Generate the legible, editorial-style README artwork for Bugpack Local."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "assets"
OUT.mkdir(exist_ok=True)

BG = "#f2f0e9"
PAPER = "#fffef9"
INK = "#1f2b26"
MUTED = "#59645d"
LINE = "#d8d7ce"
DARK = "#20332b"
DARK2 = "#31473b"
RED = "#d54c35"
OLIVE = "#72866b"
PALE = "#e6e9df"
WHITE = "#fbfaf5"
GOLD = "#d7bd76"

FONT_PATHS = {
    "regular": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ],
    "bold": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ],
    "mono": [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "C:/Windows/Fonts/cour.ttf",
    ],
}
FONT_PATHS = {kind: next((p for p in paths if Path(p).is_file()), None) for kind, paths in FONT_PATHS.items()}


def font(size, bold=False, mono=False):
    path = FONT_PATHS["mono" if mono else "bold" if bold else "regular"] or FONT_PATHS["regular"]
    if path:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def rr(draw, box, radius=12, fill=PAPER, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def txt(draw, xy, value, size, color=INK, bold=False, mono=False, anchor=None, spacing=8):
    draw.multiline_text(xy, value, font=font(size, bold, mono), fill=color, anchor=anchor, spacing=spacing)


def mark(draw, x, y, size=38):
    rr(draw, (x, y, x + size, y + size), 9, DARK)
    rr(draw, (x + 8, y + 8, x + size - 8, y + size - 8), 4, BG)
    rr(draw, (x + 13, y + 14, x + 25, y + 18), 2, OLIVE)
    rr(draw, (x + 13, y + 22, x + 28, y + 26), 2, "#b8bdb2")
    draw.ellipse((x + 25, y + 25, x + 33, y + 33), fill=RED)


def label(draw, x, y, value, size=15, color=MUTED):
    txt(draw, (x, y), value, size, color, bold=True, mono=True)


def draw_cover():
    w, h = 1600, 1000
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    mark(d, 72, 54, 40)
    txt(d, (126, 75), "BUGPACK LOCAL", 17, INK, bold=True, anchor="lm")
    txt(d, (1528, 75), "CHROME EXTENSION  /  LOCAL MCP", 15, MUTED, bold=True, mono=True, anchor="rm")

    txt(d, (72, 155), "Browser bugs,\nkept as a local file.", 60, INK, bold=True, spacing=10)
    txt(d, (76, 330), "Screen video and browser events in one report,\nready to review before export.", 26, MUTED, spacing=10)

    # The three product facts are kept large and plain.
    d.line((76, 466, 664, 466), fill=LINE, width=2)
    facts = [(76, "30 SEC", "SCREEN BUFFER"), (278, "LOCAL", "NO UPLOAD"), (470, "MCP", "READ REPORTS")]
    for x, head, sub in facts:
        txt(d, (x, 493), head, 25, RED if head == "30 SEC" else INK, bold=True)
        txt(d, (x, 530), sub, 15, MUTED, bold=True, mono=True)

    # One clear report illustration, with only readable labels.
    x, y, cw, ch = 724, 132, 804, 660
    rr(d, (x, y, x + cw, y + ch), 18, PAPER, LINE, 2)
    rr(d, (x + 1, y + 1, x + cw - 1, y + 72), 17, DARK)
    d.rectangle((x + 1, y + 47, x + cw - 1, y + 72), fill=DARK)
    txt(d, (x + 34, y + 37), "BUGPACK  /  REPORT REVIEW", 17, WHITE, bold=True, mono=True, anchor="lm")
    rr(d, (x + cw - 194, y + 20, x + cw - 32, y + 53), 16, DARK2)
    txt(d, (x + cw - 113, y + 36), "LOCAL FILE", 13, WHITE, bold=True, mono=True, anchor="mm")

    # Video panel
    vx, vy, vw, vh = x + 30, y + 105, 420, 330
    rr(d, (vx, vy, vx + vw, vy + vh), 12, DARK)
    txt(d, (vx + 22, vy + 23), "SCREEN BUFFER", 15, "#c4cec2", bold=True, mono=True)
    txt(d, (vx + vw - 23, vy + 23), "30 SEC", 17, WHITE, bold=True, mono=True, anchor="ra")
    rr(d, (vx + 22, vy + 66, vx + vw - 22, vy + 245), 8, DARK2)
    # Simple screen/play icon, not tiny interface copy.
    rr(d, (vx + 58, vy + 91, vx + 196, vy + 196), 8, "#415a49")
    d.ellipse((vx + 111, vy + 121, vx + 151, vy + 161), fill=RED)
    d.polygon([(vx + 126, vy + 131), (vx + 126, vy + 151), (vx + 141, vy + 141)], fill=WHITE)
    txt(d, (vx + 220, vy + 106), "LAST MOMENTS", 18, WHITE, bold=True)
    txt(d, (vx + 220, vy + 145), "Saved locally", 17, "#c4cec2")
    # Timeline bars, decorative only.
    for i, height in enumerate([14, 23, 18, 30, 19, 26, 14, 32, 20, 27, 15, 24, 31, 17, 25, 13]):
        bx = vx + 25 + i * 23
        rr(d, (bx, vy + 285 - height, bx + 11, vy + 285), 5, RED if i in (9, 10) else "#85947d")
    d.line((vx + 23, vy + 300, vx + vw - 23, vy + 300), fill="#526459", width=2)
    txt(d, (vx + 23, vy + 310), "0:00", 13, "#c4cec2", mono=True)
    txt(d, (vx + vw - 23, vy + 310), "0:30", 13, "#c4cec2", mono=True, anchor="ra")

    # Event panel with readable sample rows.
    ex, ey, ew = x + 478, y + 105, 296
    txt(d, (ex, ey + 6), "EXAMPLE EVENTS", 15, OLIVE, bold=True, mono=True)
    rows = [("0:04", "Click · Place order", False), ("0:11", "POST /orders · 500", True), ("0:12", "Console · request failed", True)]
    for i, (timecode, event, failed) in enumerate(rows):
        ry = ey + 56 + i * 76
        d.line((ex, ry + 60, ex + ew, ry + 60), fill=LINE, width=1)
        txt(d, (ex, ry), timecode, 14, MUTED, mono=True)
        txt(d, (ex, ry + 27), event, 17, RED if failed else INK, bold=failed)
    rr(d, (ex, ey + 298, ex + ew, ey + 330), 7, PALE)
    txt(d, (ex + 12, ey + 314), "REVIEW STORAGE VALUES", 14, INK, bold=True, mono=True, anchor="lm")

    # Export bar
    rr(d, (x + 30, y + 474, x + cw - 30, y + 570), 11, "#f0eee6", LINE)
    txt(d, (x + 54, y + 522), ".BUGPACK", 25, INK, bold=True, mono=True, anchor="lm")
    txt(d, (x + 245, y + 522), "Review before sharing", 18, MUTED, anchor="lm")
    rr(d, (x + cw - 223, y + 493, x + cw - 52, y + 552), 9, RED)
    txt(d, (x + cw - 137, y + 522), "DOWNLOAD", 15, WHITE, bold=True, mono=True, anchor="mm")

    # Clear workflow footer.
    d.line((72, 866, 1528, 866), fill=LINE, width=2)
    steps = [(76, "01", "CAPTURE"), (452, "02", "REVIEW"), (820, "03", "EXPORT .BUGPACK"), (1210, "04", "READ LOCALLY")]
    for xx, number, name in steps:
        txt(d, (xx, 914), number, 17, RED, bold=True, mono=True, anchor="lm")
        txt(d, (xx + 42, 914), name, 17, INK, bold=True, mono=True, anchor="lm")
    return im


def draw_popup_preview():
    w, h = 760, 860
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    x, y, cw, ch = 130, 35, 500, 790
    rr(d, (x, y, x + cw, y + ch), 20, PAPER, LINE, 2)
    mark(d, x + 28, y + 28, 40)
    txt(d, (x + 82, y + 49), "Bugpack Local", 23, INK, bold=True, anchor="lm")
    txt(d, (x + cw - 28, y + 49), "LOCAL", 15, OLIVE, bold=True, mono=True, anchor="rm")
    txt(d, (x + 30, y + 116), "Catch the bug.\nKeep the context.", 34, INK, bold=True, spacing=8)
    txt(d, (x + 31, y + 208), "Screen video and browser events in one local report.", 17, MUTED)

    rr(d, (x + 28, y + 270, x + cw - 28, y + 455), 12, "#eeece4")
    txt(d, (x + 50, y + 302), "SCREEN BUFFER", 15, MUTED, bold=True, mono=True)
    txt(d, (x + cw - 49, y + 302), "30 SEC", 20, INK, bold=True, mono=True, anchor="ra")
    for i, height in enumerate([19, 27, 22, 35, 25, 31, 20, 37, 28, 33, 21, 30, 36, 23, 33, 20]):
        bx = x + 52 + i * 24
        rr(d, (bx, y + 399 - height, bx + 13, y + 399), 5, RED if i in (10, 11) else OLIVE)
    d.line((x + 50, y + 417, x + cw - 50, y + 417), fill="#cfcec4", width=2)
    txt(d, (x + 50, y + 430), "Rolling capture stays on this device", 16, MUTED)

    txt(d, (x + 30, y + 510), "Choose what to record", 20, INK, bold=True)
    txt(d, (x + 30, y + 544), "Tab, window, or screen", 17, MUTED)
    rr(d, (x + 28, y + 590, x + cw - 28, y + 656), 10, DARK)
    txt(d, (x + cw / 2, y + 623), "Choose source and start", 19, WHITE, bold=True, anchor="mm")
    rr(d, (x + 28, y + 682, x + cw - 28, y + 752), 9, PALE)
    txt(d, (x + 48, y + 717), "Review the file before sharing", 16, INK, anchor="lm")
    return im


def draw_report_preview():
    w, h = 1320, 820
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    x, y, cw, ch = 34, 30, 1252, 760
    rr(d, (x, y, x + cw, y + ch), 18, PAPER, LINE, 2)
    label(d, x + 35, y + 32, "BUGPACK LOCAL  /  REPORT REVIEW", 15, RED)
    txt(d, (x + 34, y + 73), "Review before export", 34, INK, bold=True)
    txt(d, (x + 36, y + 123), "Check the timeline and included data before the file leaves this device.", 19, MUTED)

    left, top, leftw = x + 34, y + 175, 720
    rr(d, (left, top, left + leftw, top + 278), 12, DARK)
    txt(d, (left + 25, top + 23), "SCREEN BUFFER  /  30 SEC", 16, "#c4cec2", bold=True, mono=True)
    rr(d, (left + 26, top + 68, left + 245, top + 230), 9, DARK2)
    d.ellipse((left + 106, top + 112, left + 164, top + 170), fill=RED)
    d.polygon([(left + 128, top + 126), (left + 128, top + 157), (left + 150, top + 141)], fill=WHITE)
    txt(d, (left + 274, top + 100), "Last moments", 25, WHITE, bold=True)
    txt(d, (left + 274, top + 141), "Short video parts play in order", 18, "#c4cec2")
    for i, height in enumerate([14, 24, 18, 31, 20, 28, 15, 34, 24, 29, 16, 32, 23, 30, 15, 25, 34, 21, 27, 17]):
        bx = left + 26 + i * 32
        rr(d, (bx, top + 226 - height, bx + 15, top + 226), 5, RED if i in (12, 13) else "#85947d")
    txt(d, (left + 28, top + 252), "0:00", 14, "#c4cec2", mono=True)
    txt(d, (left + leftw - 28, top + 252), "0:30", 14, "#c4cec2", mono=True, anchor="ra")

    # Readable event rows
    txt(d, (left + 1, top + 315), "EXAMPLE EVENTS", 15, RED, bold=True, mono=True)
    events = [("0:04", "CLICK", "Place order", False), ("0:11", "NETWORK", "POST /orders returned 500", True), ("0:12", "CONSOLE", "Request failed", True)]
    for i, (timecode, kind, detail, failed) in enumerate(events):
        yy = top + 355 + i * 66
        d.line((left, yy + 49, left + leftw, yy + 49), fill=LINE, width=1)
        txt(d, (left + 2, yy + 10), timecode, 16, MUTED, mono=True)
        txt(d, (left + 105, yy + 10), kind, 15, RED if failed else OLIVE, bold=True, mono=True)
        txt(d, (left + 245, yy + 10), detail, 18, INK, bold=failed)

    sx, sw = x + 796, 420
    rr(d, (sx, top, sx + sw, top + 130), 11, "#fff3ed", "#e8bcae", 1)
    txt(d, (sx + 22, top + 24), "BEFORE SHARING", 15, RED, bold=True, mono=True)
    txt(d, (sx + 22, top + 57), "Video is not blurred.", 20, INK, bold=True)
    txt(d, (sx + 22, top + 91), "Review the file on this device.", 17, MUTED)

    rr(d, (sx, top + 150, sx + sw, top + 310), 11, PAPER, LINE)
    txt(d, (sx + 22, top + 173), "STORAGE VALUES", 15, OLIVE, bold=True, mono=True)
    txt(d, (sx + 22, top + 212), "access_token", 16, MUTED, mono=True)
    txt(d, (sx + sw - 22, top + 212), "[REDACTED]", 16, RED, bold=True, mono=True, anchor="ra")
    d.line((sx + 20, top + 239, sx + sw - 20, top + 239), fill=LINE, width=1)
    txt(d, (sx + 22, top + 270), "Common patterns only", 16, MUTED)

    rr(d, (sx, top + 330, sx + sw, top + 390), 10, RED)
    txt(d, (sx + sw / 2, top + 360), "Download .bugpack", 19, WHITE, bold=True, anchor="mm")
    txt(d, (sx + 3, top + 426), "REPORT  ·  TIMELINE  ·  HAR  ·  OPTIONAL VIDEO", 14, MUTED, bold=True, mono=True)
    return im


def draw_flow_frame(step):
    w, h = 1320, 760
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    mark(d, 48, 34, 38)
    txt(d, (100, 53), "BUGPACK LOCAL", 16, INK, bold=True, anchor="lm")
    stages = ["CAPTURE", "REVIEW", "READ LOCALLY"]
    txt(d, (1270, 53), f"0{step + 1}  /  03   {stages[step]}", 15, RED, bold=True, mono=True, anchor="rm")
    titles = ["Keep the moment.", "Check before export.", "Read the bundle locally."]
    subtitles = [
        "A rolling screen buffer with nearby browser events.",
        "Review the timeline and data before sharing the file.",
        "Open the .bugpack with a local MCP reader.",
    ]
    txt(d, (52, 112), titles[step], 42, INK, bold=True)
    txt(d, (54, 171), subtitles[step], 23, MUTED)

    panel = (52, 226, 1268, 642)
    rr(d, panel, 16, PAPER, LINE, 2)
    if step == 0:
        # Large browser source illustration.
        bx, by = 82, 258
        rr(d, (bx, by, bx + 600, by + 330), 11, DARK)
        rr(d, (bx + 1, by + 1, bx + 599, by + 55), 10, DARK2)
        d.rectangle((bx + 1, by + 38, bx + 599, by + 55), fill=DARK2)
        for i, c in enumerate([RED, GOLD, OLIVE]):
            d.ellipse((bx + 22 + i * 20, by + 19, bx + 34 + i * 20, by + 31), fill=c)
        txt(d, (bx + 94, by + 27), "checkout.example", 17, WHITE, anchor="lm")
        rr(d, (bx + 30, by + 88, bx + 570, by + 260), 9, "#f5f3ec")
        txt(d, (bx + 60, by + 119), "Place your order", 26, INK, bold=True)
        rr(d, (bx + 60, by + 179, bx + 244, by + 224), 8, RED)
        txt(d, (bx + 152, by + 202), "PLACE ORDER", 15, WHITE, bold=True, mono=True, anchor="mm")
        # Side text
        tx0 = 750
        label(d, tx0, 285, "30 SECOND BUFFER", 16, RED)
        txt(d, (tx0, 330), "Screen video\n+ browser events", 34, INK, bold=True, spacing=10)
        txt(d, (tx0, 442), "The browser controls which\ntab, window, or screen is shared.", 21, MUTED, spacing=9)
        rr(d, (tx0, 548, tx0 + 408, 605), 9, PALE)
        txt(d, (tx0 + 20, 577), "SAVED ON THIS DEVICE", 15, INK, bold=True, mono=True, anchor="lm")
    elif step == 1:
        ex, ey, ew = 82, 265, 600
        txt(d, (ex, ey), "EXAMPLE EVENTS", 16, OLIVE, bold=True, mono=True)
        event_rows = [("0:04", "CLICK", "Place order", False), ("0:11", "NETWORK", "POST /orders  ·  500", True), ("0:12", "CONSOLE", "Request failed", True)]
        for i, (timecode, kind, event, failed) in enumerate(event_rows):
            yy = ey + 58 + i * 82
            d.line((ex, yy + 59, ex + ew, yy + 59), fill=LINE, width=1)
            txt(d, (ex, yy + 10), timecode, 17, MUTED, mono=True)
            txt(d, (ex + 102, yy + 10), kind, 15, RED if failed else OLIVE, bold=True, mono=True)
            txt(d, (ex + 235, yy + 10), event, 20, INK, bold=failed)
        tx0 = 750
        label(d, tx0, 285, "REVIEW", 16, RED)
        txt(d, (tx0, 330), "See what the\nbundle contains.", 33, INK, bold=True, spacing=10)
        txt(d, (tx0, 442), "Storage patterns are masked.\nVideo is not blurred.", 21, MUTED, spacing=10)
        rr(d, (tx0, 548, tx0 + 408, 605), 9, "#fff0e9")
        txt(d, (tx0 + 20, 577), "CHECK BEFORE YOU SHARE", 15, RED, bold=True, mono=True, anchor="lm")
    else:
        # File and local reader, with large, legible command/output.
        fx, fy = 84, 275
        rr(d, (fx, fy, fx + 360, fy + 285), 12, "#eeece4", LINE, 1)
        rr(d, (fx + 115, fy + 38, fx + 245, fy + 170), 12, RED)
        txt(d, (fx + 180, fy + 105), ".B", 40, WHITE, bold=True, mono=True, anchor="mm")
        txt(d, (fx + 180, fy + 214), "bug-report.bugpack", 18, INK, bold=True, mono=True, anchor="mm")
        txt(d, (fx + 180, fy + 250), "ONE LOCAL FILE", 14, MUTED, bold=True, mono=True, anchor="mm")

        tx0 = 500
        label(d, tx0, 268, "LOCAL MCP READER", 16, OLIVE)
        rr(d, (tx0, 307, 1218, 526), 12, DARK)
        txt(d, (tx0 + 25, 342), "$ bugpack mcp ~/Downloads/Bugpack", 19, WHITE, mono=True)
        txt(d, (tx0 + 25, 391), "get_bug_context({ id: 'checkout-04' })", 18, "#d0d8ce", mono=True)
        txt(d, (tx0 + 25, 447), "POST /orders  ·  HTTP 500", 20, "#f08a70", bold=True, mono=True)
        txt(d, (tx0, 562), "The reader only opens the folder supplied to it.", 18, MUTED)

    # Progress footer uses plain text, not tiny badges.
    d.line((54, 684, 1266, 684), fill=LINE, width=2)
    steps = ["01  CAPTURE", "02  REVIEW", "03  READ LOCALLY"]
    xs = [56, 460, 870]
    for i, (xx, value) in enumerate(zip(xs, steps)):
        txt(d, (xx, 720), value, 16, RED if i == step else MUTED, bold=True, mono=True)
    return im


def draw_profile_card():
    w, h = 1600, 500
    im = Image.new("RGB", (w, h), DARK)
    d = ImageDraw.Draw(im)
    # crisp panel dividers instead of miniature faux app content
    mark(d, 66, 52, 42)
    txt(d, (124, 73), "BUGPACK LOCAL", 17, WHITE, bold=True, anchor="lm")
    txt(d, (1532, 74), "PREVIEW  0.1.2", 16, "#c6d0c5", bold=True, mono=True, anchor="rm")
    txt(d, (66, 146), "Browser bugs,\nkept local.", 46, WHITE, bold=True, spacing=8)
    txt(d, (68, 266), "A 30-second screen buffer, browser events,\nand one reviewable .bugpack file.", 23, "#c5cec4", spacing=10)

    # Single readable record strip
    d.line((68, 365, 805, 365), fill="#53645a", width=2)
    txt(d, (68, 410), "30 SEC", 20, "#f18a70", bold=True, mono=True)
    txt(d, (190, 410), "LOCAL FILE", 20, "#d7dfd4", bold=True, mono=True)
    txt(d, (380, 410), "MCP READER", 20, "#d7dfd4", bold=True, mono=True)

    # Large report pane with text intended to remain readable on a profile page.
    x, y = 900, 112
    rr(d, (x, y, 1532, y + 312), 14, PAPER)
    txt(d, (x + 30, y + 28), "EXAMPLE TIMELINE", 16, OLIVE, bold=True, mono=True)
    rows = [("0:04", "CLICK  Place order", INK), ("0:11", "POST /orders  ·  500", RED), ("0:12", "Request failed", MUTED)]
    for i, (timecode, event, color) in enumerate(rows):
        yy = y + 66 + i * 59
        d.line((x + 30, yy + 46, 1500, yy + 46), fill=LINE, width=1)
        txt(d, (x + 30, yy + 6), timecode, 17, MUTED, mono=True)
        txt(d, (x + 145, yy + 6), event, 21, color, bold=(color == RED))
    rr(d, (x + 30, y + 260, 1500, y + 292), 7, PALE)
    txt(d, (x + 45, y + 276), "REVIEW BEFORE EXPORT", 14, INK, bold=True, mono=True, anchor="lm")
    return im


cover = draw_cover()
cover.save(OUT / "bugpack-cover.png", optimize=True)
draw_popup_preview().save(OUT / "popup-preview.png", optimize=True)
draw_report_preview().save(OUT / "report-review.png", optimize=True)
draw_profile_card().save(OUT / "profile-card.png", optimize=True)
frames = [draw_flow_frame(i) for i in range(3)]
frames[0].save(
    OUT / "bugpack-flow.gif",
    save_all=True,
    append_images=frames[1:],
    duration=[1900, 1900, 2100],
    loop=0,
    disposal=2,
    optimize=True,
)
print("Wrote the simplified Bugpack Local artwork to assets/.")
