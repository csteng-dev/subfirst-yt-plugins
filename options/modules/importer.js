// YT Subscription Guard - Subscription Autoscanning & Bulk Import Module

import { showCustomAlert } from "./dialogs.js";

const autoImportBtn = document.getElementById("auto-import-btn");
const importModal = document.getElementById("import-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelImportBtn = document.getElementById("cancel-import-btn");
const confirmImportBtn = document.getElementById("confirm-import-btn");

const selectAllImportBtn = document.getElementById("select-all-import-btn");
const deselectAllImportBtn = document.getElementById("deselect-all-import-btn");
const importSearchInput = document.getElementById("import-search-input");
const importChannelsList = document.getElementById("import-channels-list");
const selectedImportCount = document.getElementById("selected-import-count");

/**
 * 初始化一鍵訂閱自動匯入邏輯
 * @param {function} loadDataCallback - 匯入成功後重新加載名單的函式
 * @param {function} triggerSyncCallback - 匯入成功後觸發影片同步的函式
 * @param {function} showToastCallback - 顯示 Toast 提示的函式
 */
export function initImporter(loadDataCallback, triggerSyncCallback, showToastCallback) {
  const selectedImportIds = new Set();
  let scannedChannels = [];

  if (!autoImportBtn || !importModal) return;

  // 1. 點擊開始一鍵掃描訂閱
  autoImportBtn.addEventListener("click", () => {
    autoImportBtn.disabled = true;
    autoImportBtn.textContent = "🌐 正在掃描中...";
    
    chrome.runtime.sendMessage({ action: "importSubscriptions" }, (response) => {
      autoImportBtn.disabled = false;
      autoImportBtn.textContent = "🌐 一鍵自動匯入";
      
      if (!response || !response.success) {
        showCustomAlert(response?.error || "掃描失敗：請確認您已登入 YouTube 並且開啟了 YouTube 頁面。", "掃描失敗");
        return;
      }
      
      scannedChannels = response.channels || [];
      if (scannedChannels.length === 0) {
        showCustomAlert("在您的帳號中未發現任何訂閱頻道，或您尚未登入 YouTube。", "未發現頻道");
        return;
      }
      
      // 開啟 Modal，並預設全選
      selectedImportIds.clear();
      scannedChannels.forEach(c => selectedImportIds.add(c.id));
      
      importModal.classList.add("show");
      if (importSearchInput) importSearchInput.value = "";
      renderScannedChannels("");
      updateImportSelectionCount();
    });
  });

  // 2. 渲染被掃描到的頻道卡片 (支援即時關鍵字篩選)
  function renderScannedChannels(filterText = "") {
    if (!importChannelsList) return;
    importChannelsList.innerHTML = "";
    
    const query = filterText.toLowerCase().trim();
    const filtered = scannedChannels.filter(c => c.title.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
      importChannelsList.innerHTML = `<div class="empty-placeholder">無匹配的頻道</div>`;
      return;
    }
    
    filtered.forEach(channel => {
      const item = document.createElement("div");
      item.className = `import-channel-item ${selectedImportIds.has(channel.id) ? "selected" : ""}`;
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedImportIds.has(channel.id);
      
      // 點選卡片或 checkbox 來勾選/取消勾選
      const toggleSelection = (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        
        if (checkbox.checked) {
          selectedImportIds.add(channel.id);
          item.classList.add("selected");
        } else {
          selectedImportIds.delete(channel.id);
          item.classList.remove("selected");
        }
        updateImportSelectionCount();
      };
      
      item.addEventListener("click", toggleSelection);
      
      const avatar = document.createElement("img");
      avatar.className = "import-channel-avatar";
      avatar.src = channel.avatar || "https://www.youtube.com/img/desktop/yt_128.png";
      avatar.onerror = () => { avatar.src = "https://www.youtube.com/img/desktop/yt_128.png"; };
      
      const name = document.createElement("span");
      name.className = "import-channel-name";
      name.textContent = channel.title;
      
      item.appendChild(checkbox);
      item.appendChild(avatar);
      item.appendChild(name);
      importChannelsList.appendChild(item);
    });
  }

  // 3. 更新被勾選的計數器
  function updateImportSelectionCount() {
    if (selectedImportCount) {
      selectedImportCount.textContent = selectedImportIds.size;
    }
  }

  // 4. 即時關鍵字過濾監聽
  if (importSearchInput) {
    importSearchInput.addEventListener("input", (e) => {
      renderScannedChannels(e.target.value);
    });
  }

  // 5. 全選按鈕監聽
  if (selectAllImportBtn) {
    selectAllImportBtn.addEventListener("click", () => {
      scannedChannels.forEach(c => selectedImportIds.add(c.id));
      renderScannedChannels(importSearchInput ? importSearchInput.value : "");
      updateImportSelectionCount();
    });
  }

  // 6. 取消全選按鈕監聽
  if (deselectAllImportBtn) {
    deselectAllImportBtn.addEventListener("click", () => {
      selectedImportIds.clear();
      renderScannedChannels(importSearchInput ? importSearchInput.value : "");
      updateImportSelectionCount();
    });
  }

  // 7. 關閉 Modal 函式
  const closeModal = () => {
    importModal.classList.remove("show");
  };
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelImportBtn) cancelImportBtn.addEventListener("click", closeModal);

  // 8. 確認批次匯入關注頻道
  if (confirmImportBtn) {
    confirmImportBtn.addEventListener("click", () => {
      if (selectedImportIds.size === 0) {
        showCustomAlert("請至少選擇一個頻道進行匯入！", "提示");
        return;
      }
      
      confirmImportBtn.disabled = true;
      confirmImportBtn.textContent = "📥 正在匯入...";
      
      chrome.storage.local.get("channels", (data) => {
        const existingChannels = data.channels || [];
        const newChannelsToAdd = [];
        
        scannedChannels.forEach(scanned => {
          if (selectedImportIds.has(scanned.id)) {
            // 檢查是否已經存在於現有名單中
            if (!existingChannels.some(ex => ex.id === scanned.id)) {
              newChannelsToAdd.push({
                id: scanned.id,
                title: scanned.title,
                avatar: scanned.avatar,
                tier: 2, // 預設匯入為次要關注 (避免干擾)
                addedAt: Date.now()
              });
            }
          }
        });
        
        const mergedChannels = [...existingChannels, ...newChannelsToAdd];
        
        chrome.storage.local.set({ channels: mergedChannels }, () => {
          confirmImportBtn.disabled = false;
          confirmImportBtn.textContent = "📥 確認批量匯入";
          closeModal();
          
          loadDataCallback();
          triggerSyncCallback();
          
          showToastCallback(`📥 成功匯入 ${newChannelsToAdd.length} 個頻道！`);
          if (existingChannels.length > 0 && newChannelsToAdd.length < selectedImportIds.size) {
            showCustomAlert(`匯入完成！成功新增 ${newChannelsToAdd.length} 個頻道，其餘 ${selectedImportIds.size - newChannelsToAdd.length} 個已在您的關注名單中。`, "批量匯入結果");
          }
        });
      });
    });
  }
}
