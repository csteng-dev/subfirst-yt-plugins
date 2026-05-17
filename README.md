# 🛡️ YT Subscription Guard (YouTube 訂閱防線) — 演算法救星

這是一款基於 **Chrome Extension Manifest V3** 規範打造的瀏覽器擴充功能。
它的核心目標是**徹底繞過 YouTube 的推薦演算法**，通過 YouTube 公開的 RSS Feed 直接拉取您設定的**「核心關注頻道」**最新影片，並將這些影片**強制置頂注入到您的 YouTube 首頁網格最頂端與播放頁面側邊欄**，並在第一時間發送系統桌面通知，守護您的訂閱自由！

---

## 🌟 核心特色

1. **零設定門檻 (No API Key Required)**：
   - 貼上任何頻道網址或 `@username`，背景服務將自動解析其 HTML 取得真實的 `channelId` 並對接 RSS Feed，不需要申請任何 Google Cloud Developer API 金鑰！
2. **訂閱優先級分流與一網打盡 (Tiering & Unified Home Feed)**：
   - **核心關注 (Tier 1)**：置頂首頁最上方、置頂播放頁右側欄第一位、新影片發布時發送系統通知（可自訂開啟/關閉）。
   - **次要關注 (Tier 2)**：無縫收納展示於首頁防線下方（排列在 Tier 1 之後）以及右上角 Popup HUD 面板中，不打擾播放頁側邊欄。
3. **優雅的 UI 注入與 Dismiss 機制 (Scrollable Bento Shelf)**：
   - **黃金固定長度與滾動**：首頁防線容器設有極緻典雅的 `480px` 固定最大高度與垂直滾動條，當有很多影片未讀時，能流暢地在面板內滾動瀏覽，絕不霸屏或影響下方 YouTube 原生網格。
   - **高階毛玻璃滾動條**：具備與套件 UI 風格一體化的極細 `6px` 智慧滾動條，滑鼠懸停時亮起霓虹深紅光，極具科幻美感。
   - **創作者 Shelf 聚合與階級徽章**：融合 YouTube 原生風格，具備精緻的毛玻璃底層與發光霓虹邊框，並在 Shelf 標頭加上 **⭐ 核心** / **次要** 的專屬精緻向量徽章。
   - **卡片 Dismiss 卡滑出動畫**：卡片右上角有「✔️ 已讀」按鈕，點擊時伴隨平滑的淡出與縮小動畫，大功告成後顯示「🛡️ 防線防禦成功」的榮譽勳章。
4. **極低資源佔用**：
   - 採用 Service Worker背景定時定點同步，無痛運作，不佔用任何額外記憶體。
5. **備份與還原**：
   - 支援將關注名單與設定一鍵匯出為 JSON 檔，輕鬆在不同設備間遷移。
6. **聚合分組與自訂展示策略 (Grouping & Custom Limits) 🔥 [New]**：
   - **創作者展示架 (Shelf Grouping)**：首頁防線與右上角 Popup HUD 面板全面改裝為「以訂閱頻道為單位進行聚合分組」的高階排版，提供創作者專屬頭像、名稱及未讀數量，徹底解決縱向洗版。
   - **自訂影片天數跨度**：在設定中心可自訂天數限制（如 7 天），只看指定天數內的新片，完美過濾過期推薦。
   - **單一頻道影片上限**：在設定中心可自訂每個頻道最多展示的新影片數量（如 3 部），防止高產出創作者洗版。
   - **頻道一鍵已讀**：展示架右側備有「已讀」的微交互按鈕，一鍵 Dismiss 整排影片，動畫流暢。

---

## 🛠️ 安裝步驟 (Chrome / Edge 瀏覽器)

請按照以下簡單步驟將此擴充功能安裝至您的瀏覽器：

1. **開啟擴充功能管理頁面**：
   - 在 Chrome 網址列輸入 `chrome://extensions/` 並按下 Enter。
   - （如果是 Edge，輸入 `edge://extensions/`）。
2. **啟用「開發者模式」**：
   - 在頁面右上角，找到 **「開發者模式 (Developer mode)」** 開關，將其**開啟**。
3. **載入開發者擴充功能**：
   - 點擊左上角的 **「載入未封裝項目 (Load unpacked)」** 按鈕。
   - 在彈出的檔案選擇器中，導向並選取您的專案目錄：
     `K:\yt-plugins` (或者是您存放此專案的絕對路徑)。
   - 點擊「選擇資料夾」。
4. **安裝成功**：
   - 您會在清單中看到 **「YT Subscription Guard — 訂閱防線與演算法救星」**！
   - 點擊瀏覽器右上角的「拼圖圖示」，將此擴充功能釘選（Pin）到工具列，方便隨時開啟。

---

## 🎯 測試與使用指南

1. **新增關注頻道**：
   - 在 Chrome 擴充功能列表上，對該擴充功能按右鍵選擇 **「選項 (Options)」**，或在 Popup 點擊右上角齒輪 ⚙️，進入「設定中心」。
   - 在「頻道關注管理」中，貼上幾位您愛看的主播頻道網址（例如 `https://www.youtube.com/@MrBeast`），點擊 **「解析並新增」**。
   - 新增的頻道會預設出現在 **「⭐ 核心關注 (Tier 1)」** 列表中，您可以一鍵將其降低至 Tier 2 或刪除。
2. **手動執行影片同步**：
   - 在設定頁面左側或 Popup 底部，點擊 **「🔄 同步」**。
   - 背景會立即拉取您剛剛新增頻道的最新 RSS 影片。
3. **驗證首頁置頂效果**：
   - 開啟或重新整理 [YouTube 首頁](https://www.youtube.com/)。
   - 您會驚喜地發現，在原生影片列表上方，強行浮現了一個具有毛玻璃發光特效的 **「訂閱置頂防線」專區**，展示您最愛主播的所有未讀新影片！
   - 點擊卡片右上角 `✔️` 按鈕，體驗卡片平滑淡出的 Dismiss 爽快感！
4. **驗證播放頁側邊欄效果**：
   - 隨意點開任何一部 YouTube 影片。
   - 在右側推薦影片欄的最上方，會置頂出現一個 **「🛡️ 訂閱置頂防線」** 模組，引導您去觀看關注頻道的其他未讀新片，杜絕演算法無限推薦的干擾！

---

## 🌎 開源專案規劃與 GitHub 配置 (GitHub Open Source Plan)

為了讓本專案在 GitHub 上擁有極高的曝光度、清晰的開源形象與自動化的發布管線，我們在此為您完整規劃專案的開源名稱、開源設定檔配置以及發布流程。

### 🏷️ 1. 專案開源名稱與 GitHub 網址推薦

我們提供三個各具特色、朗朗上口的命名建議：

| 專案名稱 (GitHub Repo Name) | 中文副標題 | 特色與品牌定位 |
| :--- | :--- | :--- |
| **`yt-subscription-guard`** (推薦) | 訂閱防線與演算法救星 | 品牌辨識度極高，對精準關鍵字搜尋（SEO）極佳，使用者一目了然其功能。 |
| **`algoshield-for-youtube`** | 演算法之盾 | 極具科技感、硬核生產力風格，適合想推廣給國外 Product Hunt 或 Hacker News 的極客。 |
| **`focus-tube`** | 聚焦播放 | 簡約現代，主打極簡、抗干擾、高度聚焦的播放環境。 |

> [!TIP]
> 建議 GitHub 專案網址配置：  
> `https://github.com/您的帳號/yt-subscription-guard` 或 `https://github.com/您的帳號/algoshield`

---

### 📂 2. GitHub 專案目錄配置

在開源發布時，請確保您的 GitHub 專案採用以下清晰、規範的目錄配置。這不僅符合開源規範，還能方便開發者協作：

```text
yt-subscription-guard/
├── .github/                  # GitHub 開源專屬配置
│   ├── workflows/            # CI/CD 自動化管線
│   │   └── release.yml       # 自動打包 Chrome Extension 並發布 Release
│   └── ISSUE_TEMPLATE/       # 使用者反饋模板 (Bug/Feature)
├── assets/                   # logo 圖片、動態 GIF 與 Screenshots 媒體庫
├── background/               # 背景 Service Worker，核心定時同步引擎 (background.js)
├── content/                  # YouTube 注入腳本 (content.js) 與樣式表 (content.css)
├── options/                  # 設定中心網頁 (options.html, options.js, options.css)
├── popup/                    # 懸停面板網頁 (popup.html, popup.js, popup.css)
├── manifest.json             # 擴充功能設定檔 (Manifest V3)
├── LICENSE                   # MIT 授權條款 (採用最友善且自由的 MIT 協定)
└── README.md                 # 您正在閱讀的精美專案白皮書
```

---

### 🚀 3. CI/CD 自動化發布管線 (GitHub Actions)

當您想在 GitHub 上發布新版本時，手動打包 Zip 檔案並上傳是非常繁瑣的。  
我們建議在 `.github/workflows/release.yml` 配置文件中加入以下自動化代碼。只要您在 GitHub 上推送一個新 Tag（例如 `v1.1.0`），GitHub Actions 就會**自動為您打包專案、去除多餘測試檔，並自動生成一個全新的 Release 發布頁面，並附帶打包好的 .zip 檔案**！

#### 📄 自動發布設定檔 `.github/workflows/release.yml` 內容：

```yaml
name: Draft Release on Tag Created

on:
  push:
    tags:
      - 'v*' # 當 push tag 如 v1.0.0 時觸發

jobs:
  build:
    name: Build & Package Chrome Extension
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Build Extension Zip
        run: |
          # 排除非生產環境的測試檔案與暫存資料，僅打包核心擴充功能
          zip -r yt-subscription-guard.zip . -x "*.git*" "*.github*" "LICENSE" "README.md" "node_modules/*" "*.py" "*.png" "brain/*" "scratch/*"

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: yt-subscription-guard.zip
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### 📜 4. 開源授權協議 (License Area)

本專案採用 **[MIT License](file:///k:/yt-plugins/LICENSE)** 自由開源授權協議。  
這意味著：
- **完全免費**：任何人皆可自由地下載、複製、修改本專案。
- **商業友好**：任何人均可將本代碼用於商業產品，甚至打包重新發售，只需在衍生產品中保留原始版權聲明即可。
- **無責任擔保**：本軟體按「原樣」提供，作者不承擔因使用此軟體導致的任何連帶責任。

> **守護您的注意力，免受演算法奴役。歡迎點擊 Stars 🌟 關注本專案！**
