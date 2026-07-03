---
name: remove-bg
description: 把貼紙／插圖風 PNG 的純色（白底或單色）背景去掉變成透明，採「從邊緣氾濫填色」法，只清掉與邊緣相連的背景，保留主體內部同色區域（吸管、高光、白色描邊）。當使用者說「去背」「去除背景」「background removal」「讓圖透明」「make PNG transparent」「圖去白底」時使用。
---

# 圖片去背（邊緣氾濫填色）

把純色或近純色背景的 PNG 去背成透明。適用於貼紙／插圖風、去背後仍要保留主體內部同色細節的情況。

## 何時適用 / 不適用

- **適用**：背景是白底或單一顏色；主體有描邊或與背景色有明顯區隔（食物、飲料、圖示貼紙）。
- **不適用**：背景是漸層、照片、複雜紋理，或主體邊緣顏色與背景幾乎相同無描邊。這類請改用 AI 去背（如 `rembg`）。

## 原理

不是「全圖把接近背景色的像素刪掉」（那會把主體內部同色區域也挖掉），而是：

1. 取四個角落平均色當背景基準色。
2. 從**四邊**往內做 flood fill，只把「顏色接近背景 **且** 與邊緣相連」的像素標記為背景。
3. 這些像素設為透明，其餘保留。→ 被主體描邊包住的白（吸管、高光）不受影響。
4. 對 alpha 邊緣做高斯羽化，消除鋸齒與白邊殘留。

## 前置

需要 Pillow + numpy：

```bash
python -m pip install --quiet Pillow numpy
```

## 用法

腳本在本 skill 目錄下的 `remove_bg.py`。

```bash
# 去背整個資料夾（就地覆寫），先自動備份原圖到各檔旁的 _original/
python remove_bg.py "assets/飲料" --backup

# 指定多個檔案 / glob
python remove_bg.py "img/a.png" "img/b.png"
python remove_bg.py "img/*.png"

# 調整參數：thresh 越大清越多（近背景容差）；feather 邊緣羽化半徑
python remove_bg.py "assets/飲料" --thresh 50 --feather 1.5

# 輸出到另一個資料夾，不覆寫原圖
python remove_bg.py "assets/飲料" --out "assets/飲料_去背"

# 產生檢查圖：把結果合成到有色背景，方便肉眼確認透明與主體完整
python remove_bg.py "assets/飲料" --check "check.png"
```

## 建議流程

1. **先備份**（`--backup` 或手動複製），因為就地覆寫不可逆。
2. 跑一次預設參數。
3. 用 `--check` 產生有色底檢查圖並檢視：背景應透出底色、主體與內部細節完整。
4. 若背景殘留 → 調高 `--thresh`；若主體邊緣被啃掉 → 調低 `--thresh`。
5. 確認滿意後刪除備份。

## 注意

- 檔名／尺寸不變，程式引用相對路徑者無需改動。
- 中文檔名在 Windows 下用 UTF-8 處理，腳本已支援。
- 備份資料夾（`_original/`）記得別 commit，或用完刪除／加入 `.gitignore`。
