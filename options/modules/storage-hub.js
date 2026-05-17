// YT Subscription Guard - Data Storage & Backup Restore Module

import { showCustomConfirm } from "./dialogs.js";

const exportBtn = document.getElementById("export-btn");
const importTriggerBtn = document.getElementById("import-trigger-btn");
const importFile = document.getElementById("import-file");
const importStatus = document.getElementById("import-status");
const resetAllBtn = document.getElementById("reset-all-btn");

/**
 * 初始化設定與備份還原邏輯
 * @param {function} loadDataCallback - 資料更新時的主調度重新加載函式
 * @param {function} triggerSyncCallback - 觸發背景影片 RSS 同步的函式
 * @param {function} showToastCallback - 彈出 Toast 提示的函式
 */
export function initStorageHub(loadDataCallback, triggerSyncCallback, showToastCallback) {
  // 1. 導出備份 JSON 檔案
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      chrome.storage.local.get(["channels", "settings"], (data) => {
        const channels = data.channels || [];
        const settings = data.settings || {};
        
        const backupData = {
          app: "YT_SUBSCRIPTION_GUARD",
          version: "1.1.0",
          channels: channels,
          settings: settings,
          exportedAt: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yt_subscription_guard_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToastCallback("💾 備份檔案已成功匯出");
      });
    });
  }

  // 2. 觸發檔案核取選擇器
  if (importTriggerBtn && importFile) {
    importTriggerBtn.addEventListener("click", () => {
      importFile.click();
    });
  }

  // 3. 還原匯入備份 JSON 檔案
  if (importFile) {
    importFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const importedData = JSON.parse(evt.target.result);
          
          // 校驗備份檔 JSON 格式
          if (importedData.app !== "YT_SUBSCRIPTION_GUARD" || !Array.isArray(importedData.channels)) {
            throw new Error("備份檔案格式不正確，無法匯入！");
          }
          
          showCustomConfirm(`這將覆蓋您目前的核心/次要關注名單（共 ${importedData.channels.length} 個頻道），確定要繼續嗎？`, () => {
            chrome.storage.local.set({
              channels: importedData.channels,
              settings: importedData.importedData?.settings || importedData.settings || {},
              videos: {}, // 清空舊影片，待重新同步
              lastSyncTime: null
            }, () => {
              if (importStatus) {
                importStatus.className = "status-message success";
                importStatus.textContent = "📥 設定還原成功！正在拉取最新影片資料...";
              }
              showToastCallback("📥 匯入成功！");
              
              // 重新載入設定與頻道清單
              loadDataCallback();
              
              // 觸發同步
              triggerSyncCallback();
              
              // 清理 Input 選擇器
              importFile.value = "";
            });
          }, "確認還原備份");
        } catch (err) {
          if (importStatus) {
            importStatus.className = "status-message error";
            importStatus.textContent = "匯入失敗：" + err.message;
          }
          showToastCallback("❌ 匯入失敗");
        }
      };
      reader.readAsText(file);
    });
  }

  // 4. 危險重置全部快取與名單
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      showCustomConfirm("🚨 警告：這將會清除您所有的關注頻道名單、快取影片與系統設定，並恢復成剛下載時的初始狀態。此操作無法復原，您確定嗎？", () => {
        showCustomConfirm("⚠️ 最後確認：您真的確定要永久刪除所有關注頻道與影片記錄嗎？此步驟無法復原！", () => {
          chrome.storage.local.clear(() => {
            showToastCallback("🔥 資料已完全清除");
            
            // 重寫基本預設
            chrome.storage.local.set({
              channels: [],
              videos: {},
              settings: {
                syncInterval: 30,
                enableNotifications: true,
                enableHomepageInjection: true,
                enableSidebarInjection: true
              }
            }, () => {
              // 重設同步鬧鐘
              chrome.runtime.sendMessage({ action: "updateSyncAlarm" });
              loadDataCallback();
            });
          });
        }, "終極確認");
      }, "危險重設操作");
    });
  }
}
