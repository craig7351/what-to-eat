# -*- coding: utf-8 -*-
"""
圖片去背（邊緣氾濫填色）

把純色／近純色背景的 PNG 去背成透明：從四邊做 flood fill，只清掉「顏色接近
背景且與邊緣相連」的像素，保留主體內部同色區域（吸管、高光、白色描邊）。

用法：
    python remove_bg.py <inputs...> [--thresh 42] [--feather 1.2]
                                    [--backup] [--out DIR] [--check PATH]

<inputs> 可為：資料夾（處理其中 *.png）、檔案路徑、或 glob 字串。
"""
import os
import sys
import glob
import shutil
import argparse
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def collect_files(inputs):
    files = []
    for item in inputs:
        if os.path.isdir(item):
            files += glob.glob(os.path.join(item, "*.png"))
        elif any(ch in item for ch in "*?["):
            files += glob.glob(item)
        elif os.path.isfile(item):
            files.append(item)
        else:
            print(f"[skip] 找不到：{item}", file=sys.stderr)
    # 去重、排序、排除已產生的檢查圖與備份
    seen, out = set(), []
    for f in sorted(files):
        fp = os.path.abspath(f)
        if fp in seen:
            continue
        if os.sep + "_original" + os.sep in fp:
            continue
        seen.add(fp)
        out.append(f)
    return out


def remove_bg(path, thresh, feather, out_dir=None, backup=False):
    if backup:
        bdir = os.path.join(os.path.dirname(path), "_original")
        os.makedirs(bdir, exist_ok=True)
        dest = os.path.join(bdir, os.path.basename(path))
        if not os.path.exists(dest):
            shutil.copy2(path, dest)

    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img).astype(np.int16)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3]

    # 背景基準色 = 四角平均
    corners = np.array(
        [rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]],
        dtype=np.int16,
    )
    bg = corners.mean(axis=0)

    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    near_bg = dist < thresh

    # 從四邊 flood fill：只保留與邊緣相連的近背景像素
    visited = np.zeros((h, w), dtype=bool)
    dq = deque()

    def seed(y, x):
        if near_bg[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while dq:
        y, x = dq.popleft()
        if y > 0 and near_bg[y - 1, x] and not visited[y - 1, x]:
            visited[y - 1, x] = True; dq.append((y - 1, x))
        if y < h - 1 and near_bg[y + 1, x] and not visited[y + 1, x]:
            visited[y + 1, x] = True; dq.append((y + 1, x))
        if x > 0 and near_bg[y, x - 1] and not visited[y, x - 1]:
            visited[y, x - 1] = True; dq.append((y, x - 1))
        if x < w - 1 and near_bg[y, x + 1] and not visited[y, x + 1]:
            visited[y, x + 1] = True; dq.append((y, x + 1))

    alpha = np.where(visited, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L")
    if feather > 0:
        alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(feather))

    out = img.copy()
    out.putalpha(alpha_img)

    target = path
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        target = os.path.join(out_dir, os.path.basename(path))
    out.save(target)

    kept = float((alpha > 0).sum()) / (h * w) * 100
    return kept


def make_check_sheet(files, out_path, cell=300, bg=(120, 200, 150)):
    cols = 3
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * cell), bg + (255,))
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        im.thumbnail((cell - 16, cell - 16))
        x = (i % cols) * cell + 8
        y = (i // cols) * cell + 8
        sheet.alpha_composite(im, (x, y))
    sheet.convert("RGB").save(out_path)


def main():
    ap = argparse.ArgumentParser(description="邊緣氾濫填色去背")
    ap.add_argument("inputs", nargs="+", help="資料夾／檔案／glob")
    ap.add_argument("--thresh", type=float, default=42, help="近背景色容差（越大清越多）")
    ap.add_argument("--feather", type=float, default=1.2, help="邊緣羽化半徑")
    ap.add_argument("--backup", action="store_true", help="覆寫前備份原圖到 _original/")
    ap.add_argument("--out", default=None, help="輸出資料夾（預設就地覆寫）")
    ap.add_argument("--check", default=None, help="產生有色底檢查圖的輸出路徑")
    args = ap.parse_args()

    files = collect_files(args.inputs)
    if not files:
        print("沒有可處理的檔案", file=sys.stderr)
        sys.exit(1)

    for f in files:
        kept = remove_bg(f, args.thresh, args.feather, args.out, args.backup)
        print(f"{os.path.basename(f):16s}  保留 {kept:5.1f}%")

    if args.check:
        processed = (
            [os.path.join(args.out, os.path.basename(f)) for f in files]
            if args.out else files
        )
        make_check_sheet(processed, args.check)
        print(f"檢查圖：{args.check}")


if __name__ == "__main__":
    main()
