import os
import io
import time
import urllib.request
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

# Metadata from dpm.org.cn OpenSeadragon config
BASE_URL = "https://shuziwenwu-1259446244.cos.ap-beijing.myqcloud.com/relic/75589f4b86e04f2bba0831cfc08fa3c5/image-bundle/13/"
WIDTH = 6882
HEIGHT = 2160
TILE_SIZE = 510
OVERLAP = 1
FORMAT = "png"

TILES_DIR = "tiles_level13"
OUTPUT_PNG = "郎世宁_郊原牧马图卷_6882x2160.png"
OUTPUT_JPG = "郎世宁_郊原牧马图卷_6882x2160.jpg"

COLS = (WIDTH + TILE_SIZE - 1) // TILE_SIZE  # 14
ROWS = (HEIGHT + TILE_SIZE - 1) // TILE_SIZE  # 5

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def download_tile(col, row):
    filename = f"{col}_{row}.png"
    filepath = os.path.join(TILES_DIR, filename)
    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        return col, row, filepath

    url = f"{BASE_URL}{filename}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as res:
                data = res.read()
                with open(filepath, "wb") as f:
                    f.write(data)
                return col, row, filepath
        except Exception as e:
            if attempt == 4:
                raise RuntimeError(f"Failed to download tile ({col}, {row}) from {url}: {e}")
            time.sleep(1)

def main():
    os.makedirs(TILES_DIR, exist_ok=True)
    print(f"Total tiles to download: {COLS} x {ROWS} = {COLS * ROWS}")
    
    tasks = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for r in range(ROWS):
            for c in range(COLS):
                tasks.append(executor.submit(download_tile, c, r))
        
        completed = 0
        total = len(tasks)
        for fut in as_completed(tasks):
            col, row, filepath = fut.result()
            completed += 1
            if completed % 10 == 0 or completed == total:
                print(f"Downloaded {completed}/{total} tiles...")

    print("All tiles downloaded. Stitching image...")
    canvas = Image.new("RGB", (WIDTH, HEIGHT))

    for r in range(ROWS):
        target_y0 = r * TILE_SIZE
        target_y1 = min(HEIGHT, (r + 1) * TILE_SIZE)
        h = target_y1 - target_y0
        src_y0 = OVERLAP if r > 0 else 0
        src_y1 = src_y0 + h

        for c in range(COLS):
            target_x0 = c * TILE_SIZE
            target_x1 = min(WIDTH, (c + 1) * TILE_SIZE)
            w = target_x1 - target_x0
            src_x0 = OVERLAP if c > 0 else 0
            src_x1 = src_x0 + w

            tile_path = os.path.join(TILES_DIR, f"{c}_{r}.png")
            tile_img = Image.open(tile_path).convert("RGB")
            cropped = tile_img.crop((src_x0, src_y0, src_x1, src_y1))
            canvas.paste(cropped, (target_x0, target_y0))

    print(f"Saving lossless PNG: {OUTPUT_PNG}...")
    canvas.save(OUTPUT_PNG, format="PNG")
    print(f"Saving high quality JPEG: {OUTPUT_JPG}...")
    canvas.save(OUTPUT_JPG, format="JPEG", quality=95)

    png_size = os.path.getsize(OUTPUT_PNG) / (1024 * 1024)
    jpg_size = os.path.getsize(OUTPUT_JPG) / (1024 * 1024)
    print(f"Done!")
    print(f"Image Resolution: {canvas.size[0]} x {canvas.size[1]}")
    print(f"PNG File Size: {png_size:.2f} MB")
    print(f"JPG File Size: {jpg_size:.2f} MB")

if __name__ == "__main__":
    main()
