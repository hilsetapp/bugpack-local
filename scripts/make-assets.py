from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path(__file__).resolve().parents[1] / 'assets'
OUT.mkdir(exist_ok=True)
BG = '#f1efe8'
PAPER = '#fffefa'
INK = '#202b26'
MUTED = '#727a72'
LINE = '#e1dfd6'
GREEN = '#24372f'
GREEN2 = '#33493e'
RED = '#d94d36'
OLIVE = '#788c6d'
SOFT = '#e8ece4'
CREAM = '#f7f5ee'
GOLD = '#d8c17d'
FONT_CANDIDATES = {
    'regular': [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        'C:/Windows/Fonts/arial.ttf',
    ],
    'bold': [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
    ],
    'mono': [
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
        '/System/Library/Fonts/Supplemental/Courier New.ttf',
        'C:/Windows/Fonts/cour.ttf',
    ],
}
FONT_PATHS = {key: next((path for path in paths if Path(path).is_file()), None) for key, paths in FONT_CANDIDATES.items()}


def font(size, bold=False, mono=False):
    path = FONT_PATHS['mono' if mono else 'bold' if bold else 'regular'] or FONT_PATHS['regular']
    if path:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, size=14, color=INK, bold=False, mono=False, anchor=None):
    draw.text(xy, value, font=font(size, bold, mono), fill=color, anchor=anchor)


def pill(draw, x, y, value, fill='#e7ebe3', color='#64755f', size=10, pad=9, height=25):
    width = int(draw.textlength(value, font=font(size, True))) + pad * 2
    rounded(draw, (x, y, x + width, y + height), height // 2, fill)
    text(draw, (x + width / 2, y + height / 2), value, size, color, True, anchor='mm')
    return width


def mark(draw, x, y, size=36):
    rounded(draw, (x, y, x + size, y + size), 9, GREEN)
    rounded(draw, (x + 7, y + 7, x + size - 7, y + size - 7), 5, CREAM)
    rounded(draw, (x + 12, y + 13, x + 22, y + 16), 2, OLIVE)
    rounded(draw, (x + 12, y + 20, x + 26, y + 23), 2, '#c5c8be')
    draw.ellipse((x + 23, y + 22, x + 31, y + 30), fill=RED)
    draw.ellipse((x + 26, y + 25, x + 28, y + 27), fill=CREAM)


def draw_popup(image, x, y, width=420, height=620, active=False, phase=0):
    shadow = Image.new('RGBA', image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((x + 8, y + 12, x + width + 8, y + height + 12), radius=22, fill=(28, 39, 33, 30))
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
    draw = ImageDraw.Draw(image)
    rounded(draw, (x, y, x + width, y + height), 22, PAPER, LINE, 2)
    mark(draw, x + 22, y + 20, 34)
    text(draw, (x + 66, y + 39), 'bugpack', 17, INK, True, anchor='lm')
    text(draw, (x + 148, y + 39), 'local', 15, MUTED, False, anchor='lm')
    pill(draw, x + width - 112, y + 26, 'LOCAL', SOFT, '#667a5c', 9, 8, 23)
    text(draw, (x + 24, y + 83), 'KEEP THE MOMENT', 9, RED, True)
    text(draw, (x + 24, y + 118), 'Catch the bug.', 26, INK, True)
    text(draw, (x + 24, y + 149), 'Keep the context.', 26, INK, True)
    text(draw, (x + 24, y + 182), 'Screen, browser events and state in one local bundle.', 11, MUTED)
    rounded(draw, (x + 22, y + 204, x + width - 22, y + 280), 11, '#ebe9e0', LINE)
    rounded(draw, (x + 34, y + 216, x + 130, y + 269), 7, '#faf9f4', '#d7d5ca')
    for i, color in enumerate([RED, GOLD, OLIVE]):
        draw.ellipse((x + 43 + i * 10, y + 225, x + 49 + i * 10, y + 231), fill=color)
    rounded(draw, (x + 48, y + 241, x + 116, y + 245), 2, '#b8bdb2')
    rounded(draw, (x + 48, y + 250, x + 104, y + 254), 2, '#d0d1c9')
    text(draw, (x + 145, y + 222), '30 SEC BUFFER', 8, '#82877d', True)
    for i in range(12):
        height_bar = [7, 10, 5, 12, 8, 14, 6, 11, 5, 13, 8, 10][(i + phase) % 12]
        color = RED if active and i >= 8 else '#bbc0b5'
        rounded(draw, (x + 145 + i * 15, y + 253 - height_bar, x + 153 + i * 15, y + 253), 4, color)
    draw.ellipse((x + 145, y + 261, x + 152, y + 268), fill=RED if active else OLIVE)
    text(draw, (x + 160, y + 261), 'LOCAL CAPTURE', 8, '#74806e', True, anchor='lm')
    text(draw, (x + width - 46, y + 261), '00:30', 9, MUTED, False, True, anchor='rm')
    rounded(draw, (x + 22, y + 300, x + width - 22, y + 379), 11, PAPER, LINE)
    rounded(draw, (x + 34, y + 315, x + 62, y + 343), 7, '#eeeee6')
    text(draw, (x + 48, y + 329), '01', 10, '#7b8178', True, anchor='mm')
    text(draw, (x + 74, y + 323), 'Choose what to record', 12, INK, True)
    text(draw, (x + 74, y + 346), 'Tab, window or screen', 10, MUTED)
    rounded(draw, (x + 22, y + 395, x + width - 22, y + 445), 10, RED if active else GREEN)
    text(draw, (x + 43, y + 420), '!', 16, CREAM, True, anchor='mm')
    text(draw, (x + 65, y + 420), 'Save bug report' if active else 'Choose source and start', 12, CREAM, True, anchor='lm')
    text(draw, (x + width - 42, y + 420), 'ALT ⇧ B' if active else '↗', 9, '#f2d9a0', True, anchor='rm')
    text(draw, (x + 26, y + height - 31), 'No account   ·   No upload   ·   Review before sharing', 8, '#858a81')


def draw_report_base(phase=0):
    width, height = 1010, 545
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    rounded(draw, (0, 0, width - 1, height - 1), 20, PAPER, LINE, 2)
    text(draw, (28, 28), 'BUGPACK LOCAL     /     REPORT REVIEW', 9, RED, True)
    text(draw, (28, 53), 'Review the bugpack', 23, INK, True)
    text(draw, (28, 83), 'A quick check before this file leaves the device.', 10, MUTED)
    main_width = 625
    side_x = main_width + 46
    rounded(draw, (24, 110, main_width, 290), 11, '#1e2824')
    rounded(draw, (44, 128, 145, 204), 7, '#34483e')
    rounded(draw, (61, 147, 126, 155), 3, '#839579')
    rounded(draw, (61, 164, 117, 170), 3, '#687a69')
    draw.ellipse((83, 175, 105, 197), fill=RED)
    draw.polygon([(92, 180), (92, 192), (101, 186)], fill=CREAM)
    text(draw, (165, 145), 'Last moments', 15, CREAM, True)
    text(draw, (165, 172), 'Short WebM parts play in sequence', 10, '#bac2b9')
    text(draw, (165, 205), '00:00', 9, '#d8d9d2', False, True)
    for i in range(36):
        xx = 166 + i * 10
        bar_height = 5 + ((i * 7 + phase * 3) % 15)
        rounded(draw, (xx, 244 - bar_height, xx + 5, 244), 2, RED if i in (19, 20, 21) else '#718273')
    text(draw, (165, 264), '0:00', 8, '#aab1a8', False, True)
    text(draw, (516, 264), '0:30', 8, '#aab1a8', False, True, anchor='rm')
    text(draw, (28, 322), 'CAPTURED CONTEXT', 8, RED, True)
    text(draw, (28, 344), 'Browser timeline', 14, INK, True)
    rows = [('0:04', 'CLICK', 'Place order', False), ('0:11', 'NETWORK', 'POST /api/orders  ·  500', True), ('0:12', 'CONSOLE', 'Request failed: 500 Internal Server Error', True)]
    for i, (time, kind, label, failed) in enumerate(rows):
        yy = 373 + i * 39
        if i:
            draw.line((28, yy - 12, main_width - 3, yy - 12), fill='#eeede7', width=1)
        text(draw, (30, yy), time, 9, MUTED, False, True)
        text(draw, (94, yy), kind, 8, RED if failed else OLIVE, True)
        text(draw, (182, yy), label, 10, INK)
    rounded(draw, (side_x, 110, width - 24, 206), 11, '#fff4ee', '#edc5b7')
    draw.ellipse((side_x + 14, 128, side_x + 35, 149), fill=RED)
    text(draw, (side_x + 24, 138), '!', 11, CREAM, True, anchor='mm')
    text(draw, (side_x + 46, 132), 'Review before sharing', 10, INK, True)
    text(draw, (side_x + 46, 152), 'Local data stays here.', 9, '#835c52')
    text(draw, (side_x + 16, 180), 'Video is not blurred.', 9, '#835c52')
    rounded(draw, (side_x, 219, width - 24, 357), 11, PAPER, LINE)
    text(draw, (side_x + 15, 243), 'STORAGE INCLUDED', 8, OLIVE, True)
    text(draw, (side_x + 15, 267), 'access_token', 9, MUTED, False, True)
    text(draw, (width - 40, 267), '[REDACTED]', 9, RED, True, True, anchor='rm')
    draw.line((side_x + 14, 278, width - 39, 278), fill=LINE, width=1)
    text(draw, (side_x + 15, 300), 'theme', 9, MUTED, False, True)
    text(draw, (width - 40, 300), 'dark', 9, INK, False, True, anchor='rm')
    draw.line((side_x + 14, 312, width - 39, 312), fill=LINE, width=1)
    pill(draw, side_x + 14, 325, 'REDACTION IS NOT COMPLETE', '#f4eee0', '#786846', 7, 7, 18)
    rounded(draw, (side_x, 375, width - 24, 426), 9, RED)
    text(draw, (side_x + 18, 400), 'Download .bugpack', 11, CREAM, True, anchor='lm')
    text(draw, (width - 43, 400), '↓', 17, CREAM, True, anchor='rm')
    text(draw, (side_x + 2, 450), 'report.md    prompt.md    network.har', 8, MUTED, False, True)
    return image


def draw_cover():
    width, height = 1600, 1020
    image = Image.new('RGBA', (width, height), BG)
    draw = ImageDraw.Draw(image)
    draw.ellipse((1240, -330, 1740, 170), fill='#e8e5db')
    draw.ellipse((1350, -220, 1650, 80), fill='#ebe8de')
    mark(draw, 70, 54, 38)
    text(draw, (122, 73), 'BUGPACK LOCAL', 12, INK, True, anchor='lm')
    pill(draw, 1272, 58, 'CHROMIUM EXTENSION', PAPER, '#70786e', 9, 12, 27)
    text(draw, (70, 145), 'Browser bug reports,', 46, INK, True)
    text(draw, (70, 197), 'kept on your device.', 46, INK, True)
    text(draw, (72, 269), 'Screen buffer   ·   Console and network   ·   Local MCP', 15, MUTED)
    draw_popup(image, 70, 340, 410, 500, True, 2)
    image.alpha_composite(draw_report_base(1), (515, 330))
    draw = ImageDraw.Draw(image)
    text(draw, (70, 955), 'SCREEN BUFFER', 9, OLIVE, True)
    text(draw, (190, 955), '→', 13, RED, True)
    text(draw, (218, 955), 'REVIEW', 9, OLIVE, True)
    text(draw, (300, 955), '→', 13, RED, True)
    text(draw, (328, 955), '.BUGPACK', 9, OLIVE, True)
    text(draw, (450, 955), '→', 13, RED, True)
    text(draw, (480, 955), 'LOCAL MCP', 9, OLIVE, True)
    return image.convert('RGB')


def draw_flow_frame(step):
    width, height = 1320, 760
    image = Image.new('RGBA', (width, height), BG)
    draw = ImageDraw.Draw(image)
    mark(draw, 48, 36, 34)
    text(draw, (96, 53), 'BUGPACK LOCAL', 11, INK, True, anchor='lm')
    labels = [('01', 'PICK A SOURCE'), ('02', 'RECORD THE MOMENT'), ('03', 'REVIEW THE BUNDLE'), ('04', 'READ IT LOCALLY')]
    number, label = labels[step]
    text(draw, (width - 50, 53), f'{number}  /  {label}', 10, RED, True, anchor='rm')
    if step == 0:
        draw_popup(image, 54, 112, 375, 520, False, 0)
        draw = ImageDraw.Draw(image)
        x, y, w, h = 462, 155, 790, 410
        rounded(draw, (x, y, x + w, y + h), 18, PAPER, LINE, 2)
        text(draw, (x + 30, y + 38), 'Choose a capture source', 21, INK, True)
        text(draw, (x + 30, y + 68), 'The browser controls screen access.', 11, MUTED)
        options = [('TAB', 'Current tab', 'Browser view'), ('WINDOW', 'App window', 'One window'), ('SCREEN', 'Entire screen', 'All visible content')]
        for i, (heading, sub, foot) in enumerate(options):
            xx = x + 30 + i * 245
            rounded(draw, (xx, y + 115, xx + 220, y + 320), 14, '#f8f7f1', RED if i == 0 else LINE, 2 if i == 0 else 1)
            rounded(draw, (xx + 16, y + 131, xx + 204, y + 245), 8, '#e9e8e0')
            rounded(draw, (xx + 29, y + 144, xx + 192, y + 233), 5, PAPER)
            rounded(draw, (xx + 46, y + 160, xx + 144, y + 167), 3, '#8a9c7a')
            rounded(draw, (xx + 46, y + 178, xx + 176, y + 184), 3, '#d0d1c8')
            rounded(draw, (xx + 46, y + 194, xx + 151, y + 200), 3, '#d0d1c8')
            text(draw, (xx + 17, y + 267), heading, 9, RED if i == 0 else OLIVE, True)
            text(draw, (xx + 17, y + 288), sub, 14, INK, True)
            text(draw, (xx + 17, y + 309), foot, 9, MUTED)
        text(draw, (x + 30, y + 370), 'Page events come from the active tab.', 10, MUTED)
    elif step == 1:
        draw_popup(image, 54, 112, 375, 520, True, step)
        draw = ImageDraw.Draw(image)
        x, y, w, h = 462, 155, 790, 410
        rounded(draw, (x, y, x + w, y + h), 18, PAPER, LINE, 2)
        text(draw, (x + 30, y + 38), 'Rolling capture', 21, INK, True)
        text(draw, (x + 30, y + 68), 'Last 30 seconds stay in a local buffer.', 11, MUTED)
        for i in range(30):
            xx = x + 30 + i * 23
            bar_height = 35 + ((i * 13 + step * 9) % 90)
            rounded(draw, (xx, y + 240 - bar_height, xx + 11, y + 240), 5, RED if i > 24 else '#9baa91')
        draw.line((x + 30, y + 251, x + w - 29, y + 251), fill=LINE, width=2)
        text(draw, (x + 30, y + 274), '00:00', 9, MUTED, False, True)
        text(draw, (x + w - 30, y + 274), '00:30', 9, MUTED, False, True, anchor='rm')
        pill(draw, x + 30, y + 320, 'NO AUDIO', '#eeeee6', '#6e766c', 8, 8, 22)
        pill(draw, x + 140, y + 320, 'NO UPLOAD', '#eeeee6', '#6e766c', 8, 8, 22)
        pill(draw, x + 260, y + 320, 'LOCAL BUFFER', SOFT, '#637658', 8, 8, 22)
    else:
        draw_popup(image, 54, 112, 375, 520, True, step)
        report = draw_report_base(step).resize((790, 426), Image.Resampling.LANCZOS)
        image.alpha_composite(report, (462, 112))
        if step == 3:
            draw_terminal(image, 628, 474, 610, 245)
    draw = ImageDraw.Draw(image)
    text(draw, (52, 714), 'SCREEN', 9, OLIVE, True)
    text(draw, (112, 714), '→', 12, RED, True)
    text(draw, (138, 714), 'EVENTS', 9, OLIVE, True)
    text(draw, (201, 714), '→', 12, RED, True)
    text(draw, (229, 714), 'BUGPACK', 9, OLIVE, True)
    text(draw, (304, 714), '→', 12, RED, True)
    text(draw, (332, 714), 'MCP', 9, OLIVE, True)
    return image.convert('RGB')


def draw_terminal(image, x, y, width=700, height=300):
    draw = ImageDraw.Draw(image)
    rounded(draw, (x, y, x + width, y + height), 16, '#17231e', '#40574b', 2)
    text(draw, (x + 20, y + 24), 'LOCAL MCP   /   stdio', 9, '#a8b9a5', True, True)
    draw.ellipse((x + width - 62, y + 18, x + width - 52, y + 28), fill='#78916d')
    draw.ellipse((x + width - 42, y + 18, x + width - 32, y + 28), fill=GOLD)
    text(draw, (x + 22, y + 69), '$ bugpack mcp ~/Downloads/Bugpack', 16, '#e9e8df', False, True)
    text(draw, (x + 22, y + 114), 'get_bug_context({ id: "checkout-04" })', 14, '#b5c4ae', False, True)
    text(draw, (x + 22, y + 156), 'POST /api/orders  ·  HTTP 500', 13, '#f18e76', True, True)
    text(draw, (x + 22, y + 189), 'Click “Place order” at 0:11.', 13, '#e4e7df', False, True)
    text(draw, (x + 22, y + 238), 'report, console, network, storage', 11, '#8f9f8b', False, True)


def draw_profile_card():
    width, height = 1440, 420
    image = Image.new('RGBA', (width, height), GREEN)
    draw = ImageDraw.Draw(image)
    draw.ellipse((1120, -160, 1530, 250), fill=GREEN2)
    draw.ellipse((1230, -80, 1460, 150), fill='#405546')
    mark(draw, 64, 54, 42)
    text(draw, (122, 75), 'BUGPACK LOCAL', 12, CREAM, True, anchor='lm')
    pill(draw, 1130, 59, '0.1.1 PREVIEW', '#3b5146', '#dbe2d5', 9, 11, 26)
    text(draw, (64, 151), 'Browser bug capture', 37, CREAM, True)
    text(draw, (64, 197), 'to a local .bugpack file.', 37, CREAM, True)
    text(draw, (66, 247), 'Screen buffer, browser events, storage review and a local MCP reader.', 14, '#bdc7bc')
    for x, label in [(66, '30 SEC BUFFER'), (250, 'REVIEW BEFORE EXPORT'), (500, 'NO UPLOAD')]:
        pill(draw, x, 296, label, '#34493e', '#dbe2d5', 9, 12, 29)
    rounded(draw, (910, 125, 1377, 354), 18, '#f8f7f2')
    rounded(draw, (930, 144, 1155, 322), 10, '#202a26')
    rounded(draw, (951, 165, 1031, 225), 6, '#384d41')
    draw.ellipse((981, 183, 1003, 205), fill=RED)
    draw.polygon([(989, 188), (989, 201), (998, 195)], fill=CREAM)
    text(draw, (1048, 173), 'REVIEW', 9, '#e9ece4', True)
    for i in range(5):
        yy = 244 + i * 12
        rounded(draw, (952, yy, 1127 - (i % 2) * 26, yy + 4), 2, '#718475' if i == 2 else '#4d6054')
    rounded(draw, (1172, 144, 1358, 322), 10, PAPER, LINE)
    text(draw, (1187, 166), 'BROWSER EVENTS', 8, OLIVE, True)
    text(draw, (1187, 194), '0:04  click', 9, INK, False, True)
    text(draw, (1187, 218), '0:11  POST 500', 9, RED, True, True)
    text(draw, (1187, 253), 'storage', 8, MUTED, False, True)
    text(draw, (1187, 274), 'token [REDACTED]', 8, RED, True, True)
    rounded(draw, (64, 364, 1378, 366), 1, '#42584c')
    text(draw, (65, 390), 'LOCAL FILE', 8, '#aebbae', True)
    text(draw, (1377, 390), 'CHROME EXTENSION  ·  MCP / STDIO', 8, '#aebbae', True, anchor='rm')
    return image.convert('RGB')


cover = draw_cover()
cover.save(OUT / 'bugpack-cover.png', optimize=True)
popup = Image.new('RGBA', (760, 620), BG)
draw_popup(popup, 170, 60, 420, 500, True, 2)
popup.convert('RGB').save(OUT / 'popup-preview.png', optimize=True)
report = Image.new('RGBA', (1320, 710), BG)
report.alpha_composite(draw_report_base(2).resize((1230, 663), Image.Resampling.LANCZOS), (45, 24))
report.convert('RGB').save(OUT / 'report-review.png', optimize=True)
draw_profile_card().save(OUT / 'profile-card.png', optimize=True)
frames = [draw_flow_frame(i) for i in range(4)]
frames[0].save(OUT / 'bugpack-flow.gif', save_all=True, append_images=frames[1:], duration=[1400, 1400, 1600, 1800], loop=0, disposal=2, optimize=True)
print('Wrote Bugpack Local screenshots and animated preview to assets/.')
