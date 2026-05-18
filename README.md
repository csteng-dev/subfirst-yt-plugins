# 🛡️ SubFirst (YouTube 訂閱優先) — 徹底終結演算法，奪回專注主權

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: Chrome / Edge](https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge-blue.svg)](#)

這是一款專為「奪回注意力控制權」而生、基於 **Chrome Extension Manifest V3** 規範打造的頂級瀏覽器擴充功能。

**SubFirst** 徹底繞過 YouTube 複雜繁瑣的推薦演算法。它藉由 YouTube 公開的 RSS Feed 機制，直接拉取您訂閱頻道的最新影片，以極致精美的 Bento 展示架形式，**強制置頂注入到您的 YouTube 首頁網格最上方與影片播放頁右側推薦欄**，守護您的專注力與訂閱自由！

---

## ✨ 核心特色亮點 (Key Features)

### 1. 🔑 零設定門檻 (No API Key Required)
* **開箱即用**：貼上任何 YouTube 頻道網址或 `@username`，背景服務將自動解析其 HTML 取得真實的 `channelId` 並對接 RSS Feed，**完全不需要**向 Google Cloud 申請任何繁瑣的 Developer API 金鑰！

### 🛡️ 2. 訂閱優先級分流與一網打盡 (Tiering & Unified Home Feed)
* **⭐ 核心關注 (Tier 1)**：置頂首頁最上方、置頂播放頁右側欄第一位。當有新影片發布時，第一時間發送系統桌面推播通知。
* **次要關注 (Tier 2)**：無縫收納展示於首頁防線下方（排列在 Tier 1 之後）以及右上角 Popup HUD 面板中，不打擾播放頁側邊欄。

### 🎨 3. 創作者分組聚合展示架 (Bento Shelf Grouping)
* **告別縱向洗版**：首頁防線與右上角 Popup HUD 面板採用「以訂閱頻道為單位進行聚合分組」的高階排版。
* 具備精緻的毛玻璃底層與發光霓虹邊框，並融合創作者專屬頭像、名稱及未讀數量標記，視覺效果極具現代感。

### 📜 4. 黃金比例固定高度與發光滾動條 (Scrollable Bento Feed)
* **防霸屏設計**：首頁防線容器設有極緻典雅的 `480px` 固定最大高度。當有大量影片未讀時，能流暢地在面板內滾動瀏覽，絕不霸屏或影響下方 YouTube 原生推薦。
* **智慧滾動條**：具備與套件風格一體化的極細 `6px` 智慧滾動條，滑鼠懸停時亮起發光霓虹紅條，極具科幻美感。

### ⚙️ 5. 自訂展示策略與數據掌控 (Custom Limits & Backup)
* **自訂時間跨度**：可自由限制展示最近 N 天內（如 7 天）發布的影片，過期影片自動隱藏。
* **單一頻道上限**：自訂每個頻道最多展示的最新影片數量（如 3 部），防止高產出創作者洗版。
* **一鍵已讀 Dismiss**：卡片與展示架右側備有「✔️ 已讀」的微交互按鈕，一鍵 Dismiss，動畫極致流暢。
* **備份與還原**：支援將關注清單與系統設定一鍵匯出/匯入為 JSON 檔案，更換電腦無痛移轉。

### 🔒 6. 儲存型 XSS 漏洞主動防禦大加固 (Stored XSS Hardening)
* 代碼部署了高強度 `escapeHTML` 轉義防護，所有拼裝 `innerHTML` 的遠端 RSS 變數（影片標題、頭像、縮圖等）皆經過 100% 安全過濾，保障 Chrome Web Store 審查安全過關，無懼公開代碼審計！

---

## 🛠️ 快速安裝步驟 (Chrome / Edge 瀏覽器)

請按照以下簡單步驟將此擴充功能安裝至您的瀏覽器：

1. **下載專案**：
   * 下載本倉庫代碼（或在 Release 頁面下載最新版 **`subfirst.zip`** 並解壓）。
2. **開啟擴充功能管理頁面**：
   * 在 Chrome 網址列輸入 `chrome://extensions/` 並按下 Enter。（Edge 輸入 `edge://extensions/`）。
3. **啟用開發者模式**：
   * 在頁面右上角，將 **「開發者模式 (Developer mode)」** 開關開啟。
4. **載入擴充功能**：
   * 點擊左上角的 **「載入未封裝項目 (Load unpacked)」** 按鈕。
   * 選擇您解壓出來的專案資料夾（即內含 `manifest.json` 的那一層資料夾），完成安裝！
5. **釘選套件**：
   * 點擊瀏覽器右上角的「拼圖圖示」，將 **「SubFirst — YouTube 訂閱優先」** 釘選到工具列，方便隨時開啟！

---

## 🎯 測試與使用指南

1. **新增關注頻道**：
   * 開啟設定頁面，在「頻道關注管理」中貼上您愛看的頻道網址（例如 `https://www.youtube.com/@MrBeast`），點擊 **「解析並新增」**。
   * 新增的頻道會預設出現在 **「⭐ 核心關注 (Tier 1)」** 列表中，您可以自由拖曳、批量操作或降低至 Tier 2。
2. **手動影片同步**：
   * 在設定頁面左側或 Popup 底部，點擊 **「🔄 同步」**，背景會立即拉取您所設定頻道的最新 RSS 影片。
3. **驗證置頂效果**：
   * 開啟或重新整理 [YouTube 首頁](https://www.youtube.com/)。您會驚喜地發現，在原生影片列表上方，強行浮現了一個具有毛玻璃發光特效的 **「訂閱優先」專區**，展示您最愛主播的所有未讀新影片！
4. **驗證側邊欄置頂**：
   * 隨意點開任何一部 YouTube 影片。在右側推薦影片欄的最上方，會置頂出現一個 **「🛡️ 訂閱優先」** 模組，杜絕原生演算法的無限推薦干擾！

---

## 📂 專案目錄結構

```text
subfirst/
├── assets/                   # 套件圖示、美術資源與截圖
├── background/               # Service Worker 定時後台同步引擎 (background.js)
├── content/                  # YouTube UI 注入腳本 (content.js) 與樣式表 (content.css)
├── options/                  # 設定中心網頁 (options.html, options.js, options.css)
├── popup/                    # 右上角懸停面板網頁 (popup.html, popup.js, popup.css)
├── manifest.json             # 擴充功能設定檔 (Manifest V3)
├── LICENSE                   # MIT 授權條款
└── README.md                 # 專案說明書 (您目前的位置)
```

---

## 📜 開源授權協議 (License)

本專案採用 **[MIT License](file:///k:/yt-plugins/LICENSE)** 自由開源授權協議。

這意味著您可以自由下載、修改、分發此專案，甚至將其用於商業用途。唯一的要求是在衍生產品中保留原始版權聲明與許可證。

---

> **守護您的專注力，免受演算法奴役。歡迎點擊 Stars 🌟 關注本專案！**
