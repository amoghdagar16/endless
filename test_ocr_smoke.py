import os
import re
import sys
import shutil
from typing import Optional, Tuple

try:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
except Exception as e:
    print("[error] Pillow not installed or failed to import:", e)
    sys.exit(2)

try:
    import pytesseract
except Exception as e:
    print("[error] pytesseract not installed or failed to import:", e)
    sys.exit(2)


def ensure_tesseract_path() -> Optional[str]:
    """Ensure pytesseract can find the tesseract binary on macOS/Homebrew.

    Returns the path used, or None if system PATH resolution worked.
    """
    cmd = shutil.which("tesseract")
    if cmd:
        return None
    # Common Homebrew path on Apple Silicon
    hb = "/opt/homebrew/bin/tesseract"
    if os.path.exists(hb):
        pytesseract.pytesseract.tesseract_cmd = hb
        return hb
    return None


def pick_font(size: int = 80) -> Tuple[ImageFont.ImageFont, bool]:
    """Pick a reasonably legible TrueType font on macOS; fallback to default.

    Returns (font, upscale_needed) where upscale_needed indicates we should
    upscale the base image if using the default bitmap font.
    """
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Verdana.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Menlo.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size), False
            except Exception:
                pass
    return ImageFont.load_default(), True


def make_image(text: str = "TOTAL $12.34") -> Image.Image:
    w, h = 800, 200
    img = Image.new("L", (w, h), 255)  # grayscale white
    draw = ImageDraw.Draw(img)
    font, need_upscale = pick_font(80)
    draw.text((20, 50), text, font=font, fill=0)
    if need_upscale:
        img = img.resize((w * 3, h * 3), Image.LANCZOS)
    img = ImageOps.autocontrast(img)
    return img


def try_ocr(img: Image.Image) -> Tuple[bool, str, str]:
    """Try a few Tesseract configs; return (success, config, text)."""
    configs = [
        "--oem 1 --psm 7 --dpi 300 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.$",
        "--oem 1 --psm 6 --dpi 300 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.$",
        "--oem 1 --psm 7 --dpi 300",
        "--oem 1 --psm 6 --dpi 300",
    ]
    for cfg in configs:
        out = pytesseract.image_to_string(img, lang="eng", config=cfg)
        if is_success(out):
            return True, cfg, out
    # If not successful, return the last attempt's text for debugging
    return False, configs[-1], pytesseract.image_to_string(img, lang="eng", config=configs[-1])


def is_success(text: str) -> bool:
    up = text.upper()
    has_total = bool(re.search(r"\bTOTAL\b", up))
    has_amount = bool(re.search(r"\$\s*12[.,]34\b", text))
    return has_total and has_amount


def main() -> int:
    used = ensure_tesseract_path()
    try:
        ver = pytesseract.get_tesseract_version()
        print(f"[ok] Tesseract version: {ver}")
        if used:
            print(f"[ok] Using tesseract binary at: {used}")
    except Exception as e:
        print("[error] Could not invoke tesseract via pytesseract:", e)
        print("       Ensure Homebrew tesseract is installed and on PATH.")
        return 2

    img = make_image()
    success, cfg, out = try_ocr(img)
    print("[info] OCR output:\n" + out.strip())
    print(f"[info] Last/Winning config: {cfg}")

    if success:
        print("[PASS] Detected 'TOTAL $12.34' with decimal.")
        return 0
    else:
        # Save the test image to help debugging
        out_path = os.path.join(os.getcwd(), "ocr_smoke_test.png")
        try:
            img.save(out_path)
            print(f"[debug] Saved test image to: {out_path}")
        except Exception:
            pass
        print("[FAIL] Did not detect exact amount with decimal.")
        print("       Tips: try a different font size, or adjust --psm 6/7.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
