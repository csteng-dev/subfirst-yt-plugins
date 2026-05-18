# 🛡️ SubFirst (YouTube 訂閱優先) — GitHub 發佈與打包指南

本文件旨在指導如何使用專案附帶的一鍵打包工具，並以最專業的姿態將 **SubFirst** 發佈到 GitHub Releases 中，供廣大開源社群與使用者下載使用。

---

## 📦 第一步：一鍵本機打包 (One-Click Local Packaging)

我們已在根目錄為您建立好了 `package.bat` 打包工具：
1. 本機雙擊執行 **[package.bat](file:///k:/yt-plugins/package.bat)**。
2. 壓縮引擎會自動收集 `manifest.json`、`assets`、`background`、`content`、`options`、`popup` 等核心發行檔案。
3. 自動排除 `.git`、`.vscode` 等本機開發雜物。
4. 於根目錄下生成純淨的發行壓縮包：**`subfirst.zip`**。

---

## 🚀 第二步：推送代碼至 GitHub 倉庫

在您的 GitHub 帳號下建立一個新的 Repository（建議命名為 `subfirst`），然後在終端機中依序執行以下指令推送代碼：

```bash
# 1. 初始化 Git 倉庫
git init

# 2. 暫存所有檔案 (.gitignore 已自動為您屏蔽開發雜物與 zip 檔)
git add .

# 3. 提交第一個版本
git commit -m "feat: initial open source release of SubFirst v1.0.0"

# 4. 重新命名主分支為 main
git branch -M main

# 5. 連結您 GitHub 的遠端倉庫 (請將下方網址替換為您的真實 GitHub 網址)
git remote add origin https://github.com/csteng-dev/subfirst-yt-plugins.git

# 6. 強力推送代碼至 GitHub
git push -u origin main
```

---

## 🎨 第三步：建立 GitHub Release ＆ 發佈

1. 開啟您的 GitHub 專案網頁，在右側欄尋找並點擊 **「Create a new release」**（或進入 `Releases` 分頁點選 `Draft a new release`）。
2. **設定 Tag 版本號**：點選 `Choose a tag`，輸入 **`v1.0.0`** 並點選建立。
3. **設定標題 (Release Title)**：輸入 **`v1.0.0 — 🛡️ SubFirst 訂閱優先正式開源！`**。
4. **撰寫發佈日誌 (Release Notes)**：您可以直接複製下方我們為您編寫的 **「發佈日誌豪華 Markdown 模板」**。
5. **上傳發行 ZIP 包**：將本機剛剛生成的 **`subfirst.zip`** 滑鼠拖拽丟進下方 `Attach binaries by dropping them here` 上傳區域中。
6. 點擊最下方的 **「Publish release」** 大綠色按鈕，大功告成！🎉

---

## 📄 附錄：發佈日誌豪華 Markdown 模板 (可直接複製使用)

```markdown
# 🛡️ SubFirst v1.0.0 — 重塑您的 YouTube 純淨首頁，徹底終結演算法支配！

我們非常興奮地宣布，**SubFirst (YouTube 訂閱優先)** 版本 1.0.0 正式對外開源！

SubFirst 是一款專為「奪回注意力控制權」而設計的 Chrome 瀏覽器高效擴充功能。它繞過 YouTube 複雜繁瑣的推薦演算法，直接將您「核心關注」與「次要關注」頻道的最新影片，以高雅精緻的 Bento 展示架形式，注入到 YouTube 首頁的最頂端！

---

## ✨ 核心特色亮點 (Key Features)

### 1. 🔑 零門檻免 API Key
* 貼上任何頻道網址即可自動背景對接 RSS Feed，**不需要**向 Google Cloud 申請任何繁瑣的 Developer API Key，普通用戶開箱即用！

### 🛡️ 2. 訂閱優先級分流 (Tier 1 & Tier 2)
* **⭐ 核心關注 (Tier 1)**：置頂首頁最上方、置頂播放頁右側欄第一位，新影片發布時發送系統通知。
* **次要關注 (Tier 2)**：無縫收納展示於首頁防線下方（排列在 Tier 1 之後）以及右上角 Popup HUD 面板中，不打擾播放頁側邊欄。

### 📜 3. 黃金比例固定高度與優雅滾動條 (Scrollable Bento Feed)
* 首頁防線容器設有極緻典雅的 `480px` 固定最大高度，當有大量未讀影片時，能流暢地在面板內滾動瀏覽，**絕不霸屏洗版**，不影響下方原生推薦！
* 搭載專屬極細 `6px` 智慧型滾動條，滑鼠懸停時亮起發光霓虹紅條，極具科幻美感。

### 🔒 4. 儲存型 XSS 漏洞主動防禦大加固 (Stored XSS Hardening)
* 代碼部署了高強度 `escapeHTML` 轉義防護，所有拼裝 `innerHTML` 的遠端 RSS 變數（影片標題、頭像、縮圖等）皆經過 100% 安全過濾，保障 Chrome Web Store 審查安全過關，無懼公開代碼審計！

---

## 📦 本次發佈附帶資產 (Assets)

* **`subfirst.zip`**：開箱即用發行包（下載後解壓縮，依據下方指南安裝即可使用）。

---

## 🏁 30 秒手動安裝指南 (How to Install)

1. 下載下方的 **`subfirst.zip`** 並將其解壓縮到您電腦的任意資料夾中。
2. 打開您的 Google Chrome 瀏覽器，在網址列輸入 **`chrome://extensions/`** 進入擴充功能管理頁。
3. 在右上角開啟 **「開發人員模式 (Developer mode)」** 開關。
4. 點擊左上角的 **「載入未封裝項目 (Load unpacked)」** 按鈕。
5. 選擇您剛剛解壓縮出來的資料夾（內含 `manifest.json` 的那一層資料夾），完成安裝！
6. 開啟 [YouTube 首頁](https://www.youtube.com/)，開啟您的注意力守護防線！
```

---

## 🏁 第四步：使用者端 30 秒手動安裝指南 (教學)

當使用者下載了您在 GitHub 發佈的 `subfirst.zip` 後，他們只需按照上述 **「30 秒手動安裝指南」** 進行操作，即可立刻在他們的電腦上享受您開發的終極演算法防線！
