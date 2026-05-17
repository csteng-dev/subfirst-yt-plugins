# 🛡️ YT Subscription Guard — 模組化解耦重構藍圖 (Refactoring Blueprint)

本專案目前已具備完整的商業級功能。為了避免代碼隨著後續迭代「肥大化（Bloating）」、降低維護成本，並符合現代前端工程學的 **單一職責原則 (Single Responsibility Principle)**，我們在此盤點當前 codebase 中需要重構、拆分獨立維護的檔案與具體模組化方案。

---

## 📊 1. 核心檔案肥大化評估

| 檔案路徑 | 當前行數 (Lines) | 複雜度評級 | 重構優先級 | 肥大原因與混合職責 |
| :--- | :--- | :--- | :--- | :--- |
| **`options/options.js`** | **928 行** | 🔴 非常高 | ⭐⭐⭐ (極高) | 混合了 UI 導航、新增解析、智慧匯入 Modal 控制、備份還原、批次選擇器狀態機、以及全域自訂對話框引擎。 |
| **`background/background.js`** | **520 行** | 🟡 中等 | ⭐⭐ (中等) | 混合了定時器(Alarm)調度、YouTube RSS XML 請求與解析、桌面推播通知管理、同源分頁代理通訊。 |
| **`content/content.js`** | **364 行** | 🟢 低 | ⭐ (低) | 職責單一，全權負責 YouTube 首頁/播放頁的 Bento Grid 與側邊欄 UI 渲染與注入。 |

---

## 🛠️ 2. 最迫切的重構核心：`options.js` 拆分計畫

建議將目前接近 1,000 行的 `options.js` 拆解為以下 **4 個高內聚、低耦合的獨立 ES 模組**：

```text
options/
├── options.html
├── options.css
├── options.js            # 主協調器 (Orchestrator) - 只負責載入與初始化各子模組
├── modules/
│   ├── dialogs.js        # [新] 全域自訂對話框模組 (Alert / Confirm 控制器)
│   ├── importer.js       # [新] 一鍵自動匯入 (Scanned Modal 與分頁搜尋引擎)
│   └── storage-hub.js    # [新] 設定存取、JSON 備份匯出與還原邏輯
```

### 📦 子模組化具體配置規劃

#### 📄 A. 獨立對話框控制器 (`options/modules/dialogs.js`)
將全域高級自訂對話框的 DOM 宣告、非同步 Alert/Confirm 控制邏輯抽離：
```javascript
// 負責封裝自訂對話框
export class CustomDialog {
  constructor() {
    this.modal = document.getElementById("custom-dialog-modal");
    // ...選取 DOM 元素
  }
  
  alert(message, title = "系統提示") {
    // ...
  }
  
  confirm(message, callback, title = "確認執行") {
    // ...
  }
}
```

#### 📄 B. 智慧自動匯入模組 (`options/modules/importer.js`)
將獲取 background 掃描資料、Modal 的開啟/關閉、關鍵字過濾搜尋、核取計數等繁複的 DOM 渲染隔離：
```javascript
export class AutoImporter {
  constructor(dialogs, onImportComplete) {
    this.modal = document.getElementById("import-modal");
    this.selectedIds = new Set();
    // ... 綁定全選/取消全選/搜尋監聽
  }
  
  open(scannedChannels) {
    // ... 渲染並開啟 Modal
  }
}
```

#### 📄 C. 資料備份與設定管理 (`options/modules/storage-hub.js`)
專門負責跟 `chrome.storage.local` 打交道，並處理 JSON 檔案的 `FileReader` 格式校驗與下載匯出：
```javascript
export const StorageHub = {
  exportBackup() { /* ... */ },
  importBackup(file, onComplete, onError) { /* ... */ }
};
```

---

## 🔄 3. 背景 Service Worker `background.js` 模組化

在 **Manifest V3** 中，我們可以直接將背景腳本設定為 **ES Modules** 載入。

### ⚙️ Manifest V3 模組化宣告設定：
在 [manifest.json](file:///k:/yt-plugins/manifest.json) 中加入 `"type": "module"`：
```json
"background": {
  "service_worker": "background/background.js",
  "type": "module"
}
```

### 📂 背景代碼拆分結構：
```text
background/
├── background.js         # 主背景調度中心 (監聽 OnInstalled、OnAlarm、Message 路由)
└── modules/
    ├── rss-parser.js     # [新] XML 解析、channelId 提取與 URL 正則驗證
    ├── notifier.js       # [新] 桌面 Notification 發送與 icon 裁切
    └── sync-scheduler.js # [新] 定時輪詢邏輯與 7 日舊已讀影片自動 prune 算法
```

*這能讓 `background.js` 縮減至 **150 行以內**，所有 RSS 拉取失敗或 XML 格式變動的維護，都只需要前往 `rss-parser.js` 處理，極大降低改動程式碼造成的 regressions（連帶錯誤）！*

---

## 📝 4. 模組化重構的好處

1. **Bug 隔離（Bug Isolation）**：
   如果 Dialog 彈出框的樣式或動畫出錯，開發者只需要修改 `dialogs.js`，完全不用擔心會破壞 `import` 或者儲存設定的邏輯。
2. **多人協作（Collaborative-Friendly）**：
   多位開發者可以同時開發「智慧匯入優化」與「備份加密還原」，各自在 `importer.js` 與 `storage-hub.js` 工作，**GitHub 合併時 0 衝突 (Merge Conflict)**。
3. **單元測試便利性（Unit Testable）**：
   拆分出的 `rss-parser.js` 等模組可以直接導出，在沒有擴充功能環境的 Node.js/Jest 下單獨編寫單元測試。

*當您準備將專案發布至 GitHub 開源時，這套模組化架構將會是您吸引國際開發者貢獻 (Pull Requests) 最強的護城河！*
