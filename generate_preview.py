"""
generate_preview.py - Generates 1200x630 Open Graph preview thumbnail for LinkedIn.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1200, 630

# Load screenshot if available
base_img = None
if os.path.exists("Screenshotjev_brute_force.png"):
    try:
        shot = Image.open("Screenshotjev_brute_force.png")
        # Resize/crop to fill 1200x630
        shot_ratio = shot.width / shot.height
        target_ratio = W / H
        if shot_ratio > target_ratio:
            # wider
            new_h = H
            new_w = int(shot.width * (H / shot.height))
        else:
            new_w = W
            new_h = int(shot.height * (W / shot.width))
        
        resized = shot.resize((new_w, new_h), Image.Resampling.LANCZOS)
        # Center crop
        left = (new_w - W) // 2
        top = (new_h - H) // 2
        base_img = resized.crop((left, top, left + W, top + H))
    except Exception as e:
        print("Error processing screenshot:", e)

if base_img is None:
    # Create dark fluent background
    base_img = Image.new("RGBA", (W, H), (11, 17, 26, 255))

# Apply subtle darkening & vignette for high readability
overlay = Image.new("RGBA", (W, H), (5, 10, 18, 140))
base_img = Image.alpha_composite(base_img.convert("RGBA"), overlay)

draw = ImageDraw.Draw(base_img)

# Try loading standard Windows fonts
def get_font(size, bold=False):
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_title = get_font(44, bold=True)
font_sub = get_font(24, bold=False)
font_badge = get_font(18, bold=True)
font_small = get_font(16, bold=False)

# Draw Top Header Banner card
banner_h = 105
banner_box = [20, 20, W - 20, 20 + banner_h]
draw.rounded_rectangle(banner_box, radius=12, fill=(18, 24, 36, 230), outline=(255, 255, 255, 45), width=1)

# Windows Logo (4 cyan/blue squares)
logo_x, logo_y, sq_size, gap = 45, 42, 26, 5
draw.rectangle([logo_x, logo_y, logo_x + sq_size, logo_y + sq_size], fill=(0, 120, 212))
draw.rectangle([logo_x + sq_size + gap, logo_y, logo_x + 2 * sq_size + gap, logo_y + sq_size], fill=(0, 153, 255))
draw.rectangle([logo_x, logo_y + sq_size + gap, logo_x + sq_size, logo_y + 2 * sq_size + gap], fill=(0, 103, 192))
draw.rectangle([logo_x + sq_size + gap, logo_y + sq_size + gap, logo_x + 2 * sq_size + gap, logo_y + 2 * sq_size + gap], fill=(96, 205, 255))

# Title & Subtitle
draw.text((120, 36), "Windows Login Dual Benchmark", fill=(255, 255, 255), font=font_title)
draw.text((122, 86), "Sequential Brute Force vs. Jev Model (System 1 Calibrated Priors)", fill=(154, 167, 181), font=font_sub)

# Right Badge
badge_w, badge_h = 240, 40
badge_x = W - 45 - badge_w
badge_y = 52
draw.rounded_rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=8, fill=(16, 124, 65, 220), outline=(116, 245, 156, 180), width=1)
draw.text((badge_x + 18, badge_y + 9), "Interactive Live Simulator", fill=(255, 255, 255), font=font_badge)

# Bottom Pill: Hive Systems Reference
bot_w, bot_h = W - 40, 48
bot_x = 20
bot_y = H - 20 - bot_h
draw.rounded_rectangle([bot_x, bot_y, bot_x + bot_w, bot_y + bot_h], radius=10, fill=(12, 18, 28, 235), outline=(255, 255, 255, 35), width=1)
draw.text((bot_x + 24, bot_y + 13), "Target: 9-Digit Numeric PIN (10^9 Combinations)  |  Hive Systems Table Baseline: 2 Hours  |  Zero-Lockout", fill=(210, 248, 223), font=font_badge)
draw.text((W - 320, bot_y + 14), "lauyeehow1986-hub.github.io/win_sim", fill=(96, 205, 255), font=font_badge)

# Convert to RGB and save
final_img = base_img.convert("RGB")
final_img.save("preview.png", "PNG", quality=95)
final_img.save("og-image.png", "PNG", quality=95)

# Also copy to static/
os.makedirs("static", exist_ok=True)
final_img.save("static/preview.png", "PNG", quality=95)
final_img.save("static/og-image.png", "PNG", quality=95)

print("Generated preview.png (1200x630) and og-image.png successfully.")
