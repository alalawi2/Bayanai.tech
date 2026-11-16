"""Generate the printable QR code for the Bayan AI links page.

Usage:  python scripts/generate-links-qr.py
Writes links/qr/bayan-links-qr.svg (vector, for print) and .png (2000 px, for screens/docs).
Requires: pip install qrcode pillow
"""
from pathlib import Path

import qrcode
import qrcode.image.svg

URL = "https://www.bayanai.tech/links"
OUT = Path(__file__).resolve().parent.parent / "links" / "qr"
INK = "#0b1a28"  # brand --night; dark-on-white scans most reliably


def build():
    # Error correction "H" keeps the code readable even if partly damaged or covered.
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=4, box_size=10)
    qr.add_data(URL)
    qr.make(fit=True)
    return qr


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    qr = build()
    svg = qr.make_image(image_factory=qrcode.image.svg.SvgPathFillImage).to_string(encoding="unicode")
    svg_path = OUT / "bayan-links-qr.svg"
    svg_path.write_text(svg.replace('fill="#000000"', f'fill="{INK}"'), encoding="utf-8")

    qr = build()
    qr.box_size = max(1, 2000 // (qr.modules_count + 2 * qr.border))
    png = qr.make_image(fill_color=INK, back_color="white")
    png_path = OUT / "bayan-links-qr.png"
    png.save(png_path)

    print(f"QR for {URL}\n  {svg_path}\n  {png_path}  ({png.size[0]} px)")


if __name__ == "__main__":
    main()
