// YT Subscription Guard - Main Options Orchestrator (ES Module)

import { showCustomAlert, showCustomConfirm } from "./modules/dialogs.js";
import { initStorageHub } from "./modules/storage-hub.js";
import { initImporter } from "./modules/importer.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM 元素引用
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");
  
  const addChannelForm = document.getElementById("add-channel-form");
  const channelUrlInput = document.getElementById("channel-url-input");
  const addBtn = document.getElementById("add-btn");
  const addStatus = document.getElementById("add-status");
  
  const focusList = document.getElementById("focus-list");
  const secondaryList = document.getElementById("secondary-list");
  const focusCount = document.getElementById("focus-count");
  const secondaryCount = document.getElementById("secondary-count");
  
  const lastSyncTimeSpan = document.getElementById("last-sync-time");
  const syncNowBtn = document.getElementById("sync-now-btn");
  const statusDot = document.querySelector(".status-dot");
  const statusTitle = document.querySelector(".status-title");
  
  // 設定表單元素
  const syncIntervalSelect = document.getElementById("sync-interval");
  const enableNotificationsCheckbox = document.getElementById("enable-notifications");
  const enableHomepageInjectionCheckbox = document.getElementById("enable-homepage-injection");
  const enableSidebarInjectionCheckbox = document.getElementById("enable-sidebar-injection");
  const maxVideoAgeInput = document.getElementById("settings-max-video-age");
  const maxVideosPerChannelInput = document.getElementById("settings-max-videos-per-channel");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const settingsStatus = document.getElementById("settings-status");
  
  const toast = document.getElementById("toast");

  // 批次管理選取狀態集合與核取方塊
  const selectedFocusIds = new Set();
  const selectedSecondaryIds = new Set();
  
  const focusSelectAll = document.getElementById("focus-select-all");
  const secondarySelectAll = document.getElementById("secondary-select-all");
  const focusBatchBar = document.getElementById("focus-batch-bar");
  const secondaryBatchBar = document.getElementById("secondary-batch-bar");

  // ==========================================================================
  // 1. 初始化引進模組
  // ==========================================================================
  
  // 初始化儲存與還原備份模組
  initStorageHub(loadData, triggerBackgroundSync, showToast);
  
  // 初始化一鍵訂閱自動匯入模組
  initImporter(loadData, triggerBackgroundSync, showToast);

  // ==========================================================================
  // 2. 標籤分頁切換控制
  // ==========================================================================
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      
      navItems.forEach(nav => nav.classList.remove("active"));
      tabContents.forEach(tab => tab.classList.remove("active"));
      
      item.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // ==========================================================================
  // 3. 初始化載入資料
  // ==========================================================================
  loadData();

  async function loadData() {
    chrome.storage.local.get(["channels", "settings", "lastSyncTime"], (data) => {
      const channels = data.channels || [];
      const settings = data.settings || {};
      const lastSyncTime = data.lastSyncTime;
      
      // 渲染頻道清單
      renderChannels(channels);
      
      // 載入系統設定值
      if (settings.syncInterval) syncIntervalSelect.value = settings.syncInterval;
      enableNotificationsCheckbox.checked = settings.enableNotifications !== false;
      enableHomepageInjectionCheckbox.checked = settings.enableHomepageInjection !== false;
      enableSidebarInjectionCheckbox.checked = settings.enableSidebarInjection !== false;
      maxVideoAgeInput.value = settings.maxVideoAgeDays !== undefined ? settings.maxVideoAgeDays : 7;
      maxVideosPerChannelInput.value = settings.maxVideosPerChannel !== undefined ? settings.maxVideosPerChannel : 3;
      
      // 更新同步時間
      updateSyncTimeDisplay(lastSyncTime);
    });
  }

  // 更新上次同步時間文字
  function updateSyncTimeDisplay(timestamp) {
    if (timestamp) {
      const date = new Date(timestamp);
      lastSyncTimeSpan.textContent = date.toLocaleTimeString() + " (" + date.toLocaleDateString() + ")";
    } else {
      lastSyncTimeSpan.textContent = "從未同步";
    }
  }

  // ==========================================================================
  // 4. 渲染雙分流頻道列表
  // ==========================================================================
  function renderChannels(channels) {
    focusList.innerHTML = "";
    secondaryList.innerHTML = "";
    
    // 重設選取狀態與核取方塊
    selectedFocusIds.clear();
    selectedSecondaryIds.clear();
    focusSelectAll.checked = false;
    secondarySelectAll.checked = false;
    
    const focusChannels = channels.filter(c => c.tier === 1);
    const secondaryChannels = channels.filter(c => c.tier === 2);
    
    focusCount.textContent = focusChannels.length;
    secondaryCount.textContent = secondaryChannels.length;
    
    // 渲染核心關注
    if (focusChannels.length === 0) {
      focusList.innerHTML = `<div class="empty-placeholder">目前尚無核心關注頻道，請於上方新增。</div>`;
      focusBatchBar.style.display = "none";
    } else {
      focusBatchBar.style.display = "flex";
      focusChannels.forEach(channel => {
        focusList.appendChild(createChannelElement(channel));
      });
    }
    
    // 渲染次要關注
    if (secondaryChannels.length === 0) {
      secondaryList.innerHTML = `<div class="empty-placeholder">目前尚無次要關注頻道，請於上方新增。</div>`;
      secondaryBatchBar.style.display = "none";
    } else {
      secondaryBatchBar.style.display = "flex";
      secondaryChannels.forEach(channel => {
        secondaryList.appendChild(createChannelElement(channel));
      });
    }
  }

  // 建立單個頻道的 DOM 元素
  function createChannelElement(channel) {
    const item = document.createElement("div");
    item.className = "channel-item";
    item.dataset.id = channel.id;
    
    // 自訂核取方塊 (Sleek Checkbox)
    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "checkbox-container";
    
    const checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    checkboxInput.className = "channel-checkbox";
    checkboxInput.dataset.id = channel.id;
    checkboxInput.dataset.tier = channel.tier;
    
    const checkboxCustom = document.createElement("span");
    checkboxCustom.className = "checkbox-custom";
    
    checkboxLabel.appendChild(checkboxInput);
    checkboxLabel.appendChild(checkboxCustom);
    
    // 綁定核取監聽
    checkboxInput.addEventListener("change", (e) => {
      const id = channel.id;
      const tier = channel.tier;
      if (tier === 1) {
        if (e.target.checked) {
          selectedFocusIds.add(id);
        } else {
          selectedFocusIds.delete(id);
        }
        updateSelectAllState(1);
      } else {
        if (e.target.checked) {
          selectedSecondaryIds.add(id);
        } else {
          selectedSecondaryIds.delete(id);
        }
        updateSelectAllState(2);
      }
    });
    
    // 頻道資訊包裝
    const infoWrapper = document.createElement("div");
    infoWrapper.className = "channel-info-wrapper";
    
    const avatar = document.createElement("img");
    avatar.className = "channel-avatar";
    avatar.src = channel.avatar || "https://www.youtube.com/img/desktop/yt_128.png";
    avatar.onerror = () => { avatar.src = "https://www.youtube.com/img/desktop/yt_128.png"; };
    
    const detail = document.createElement("div");
    detail.className = "channel-detail";
    
    const name = document.createElement("span");
    name.className = "channel-name";
    name.textContent = channel.title;
    
    const handle = document.createElement("span");
    handle.className = "channel-handle";
    handle.textContent = channel.id;
    
    detail.appendChild(name);
    detail.appendChild(handle);
    infoWrapper.appendChild(avatar);
    infoWrapper.appendChild(detail);
    
    // 動作按鈕包裝
    const actions = document.createElement("div");
    actions.className = "channel-actions";
    
    // 1. 切換 Tier 按鈕
    const toggleTierBtn = document.createElement("button");
    toggleTierBtn.className = "btn-icon-only";
    if (channel.tier === 1) {
      toggleTierBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" style="color: var(--text-sub);"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>';
      toggleTierBtn.title = "轉為次要關注 (Tier 2)";
      toggleTierBtn.addEventListener("click", () => changeChannelTier(channel.id, 2));
    } else {
      toggleTierBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" style="color: #eab308; fill: #eab308; stroke: #eab308;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      toggleTierBtn.title = "升為核心關注 (Tier 1)";
      toggleTierBtn.addEventListener("click", () => changeChannelTier(channel.id, 1));
    }
    
    // 2. 開啟連結按鈕
    const openLinkBtn = document.createElement("button");
    openLinkBtn.className = "btn-icon-only";
    openLinkBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
    openLinkBtn.title = "開啟 YouTube 頻道頁面";
    openLinkBtn.addEventListener("click", () => {
      window.open(`https://www.youtube.com/channel/${channel.id}`, "_blank");
    });
    
    // 3. 刪除按鈕
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon-only btn-delete";
    deleteBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    deleteBtn.title = "刪除此關注頻道";
    deleteBtn.addEventListener("click", () => deleteChannel(channel.id));
    
    actions.appendChild(toggleTierBtn);
    actions.appendChild(openLinkBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(checkboxLabel);
    item.appendChild(infoWrapper);
    item.appendChild(actions);
    
    return item;
  }

  // ==========================================================================
  // 5. 新增頻道與背景解析
  // ==========================================================================
  addChannelForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = channelUrlInput.value.trim();
    if (!url) return;
    
    // 更新 UI 狀態為載入中
    addBtn.disabled = true;
    channelUrlInput.disabled = true;
    addStatus.className = "status-message info";
    addStatus.textContent = "🔄 正在連結 YouTube 解析頻道資訊，請稍候...";
    
    chrome.runtime.sendMessage({ action: "resolveChannel", url }, (response) => {
      addBtn.disabled = false;
      channelUrlInput.disabled = false;
      
      if (!response || !response.success) {
        addStatus.className = "status-message error";
        addStatus.textContent = response ? response.error : "解析失敗，背景程式未響應。";
        showToast("❌ 解析失敗");
        return;
      }
      
      const channelData = response.data;
      
      // 讀取現有頻道比對
      chrome.storage.local.get("channels", (data) => {
        const channels = data.channels || [];
        
        // 檢查是否重複新增
        if (channels.some(c => c.id === channelData.id)) {
          addStatus.className = "status-message error";
          addStatus.textContent = `頻道「${channelData.title}」已在您的關注名單中！`;
          showToast("⚠️ 頻道重複");
          return;
        }
        
        // 預設新增為 1 級核心頻道
        const newChannel = {
          id: channelData.id,
          title: channelData.title,
          avatar: channelData.avatar,
          tier: 1,
          addedAt: Date.now()
        };
        
        channels.push(newChannel);
        
        chrome.storage.local.set({ channels }, () => {
          channelUrlInput.value = "";
          addStatus.className = "status-message success";
          addStatus.textContent = `🎉 成功新增核心關注頻道：「${channelData.title}」！`;
          showToast("⭐ 頻道新增成功");
          
          // 重新繪製
          renderChannels(channels);
          
          // 觸發背景定時同步，立即去拉取最新影片
          triggerBackgroundSync();
        });
      });
    });
  });

  // 改變頻道關注等級
  function changeChannelTier(channelId, newTier) {
    chrome.storage.local.get(["channels", "videos"], (data) => {
      let channels = data.channels || [];
      channels = channels.map(c => {
        if (c.id === channelId) {
          return { ...c, tier: newTier };
        }
        return c;
      });
      
      const videos = data.videos || {};
      Object.keys(videos).forEach(vid => {
        if (videos[vid].channelId === channelId) {
          videos[vid].tier = newTier;
        }
      });
      
      chrome.storage.local.set({ channels, videos }, () => {
        renderChannels(channels);
        showToast(`已移動頻道等級至 Tier ${newTier}`);
        triggerBackgroundSync();
      });
    });
  }

  // 刪除單個關注頻道
  function deleteChannel(channelId) {
    chrome.storage.local.get("channels", (data) => {
      let channels = data.channels || [];
      const targetChannel = channels.find(c => c.id === channelId);
      
      if (!targetChannel) return;
      
      showCustomConfirm(`確定要取消關注頻道「${targetChannel.title}」嗎？這將會同步清除該頻道的快取影片！`, () => {
        channels = channels.filter(c => c.id !== channelId);
        
        // 順便清除快取影片中屬於該頻道的影片
        chrome.storage.local.get("videos", (vData) => {
          const videos = vData.videos || {};
          const cleanedVideos = {};
          
          Object.keys(videos).forEach(vid => {
            if (videos[vid].channelId !== channelId) {
              cleanedVideos[vid] = videos[vid];
            }
          });
          
          chrome.storage.local.set({ channels, videos: cleanedVideos }, () => {
            renderChannels(channels);
            showToast("❌ 已取消關注該頻道");
          });
        });
      }, "取消關注確認");
    });
  }

  // ==========================================================================
  // 6. 手動立即同步與定時更新
  // ==========================================================================
  syncNowBtn.addEventListener("click", () => {
    syncNowBtn.disabled = true;
    syncNowBtn.textContent = "🔄 正在同步 RSS 訂閱源...";
    statusDot.className = "status-dot syncing";
    statusTitle.textContent = "正在同步中";
    
    chrome.runtime.sendMessage({ action: "syncNow" }, (response) => {
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = "🔄 立即手動同步";
      statusDot.className = "status-dot green";
      statusTitle.textContent = "守護進行中";
      
      if (response && response.success) {
        showToast(`🔔 同步完成！`);
        chrome.storage.local.get(["lastSyncTime", "channels"], (vData) => {
          updateSyncTimeDisplay(vData.lastSyncTime);
          renderChannels(vData.channels || []);
        });
      } else {
        showToast(`❌ 同步失敗: ${response ? response.error : '未知錯誤'}`);
      }
    });
  });

  // 觸發背景 RSS 同步訊息發送
  function triggerBackgroundSync() {
    chrome.runtime.sendMessage({ action: "syncNow" });
  }

  // ==========================================================================
  // 7. 系統設定自動儲存
  // ==========================================================================
  saveSettingsBtn.addEventListener("click", () => {
    const settings = {
      syncInterval: parseInt(syncIntervalSelect.value, 10),
      enableNotifications: enableNotificationsCheckbox.checked,
      enableHomepageInjection: enableHomepageInjectionCheckbox.checked,
      enableSidebarInjection: enableSidebarInjectionCheckbox.checked,
      maxVideoAgeDays: parseInt(maxVideoAgeInput.value, 10) || 7,
      maxVideosPerChannel: parseInt(maxVideosPerChannelInput.value, 10) || 3
    };
    
    saveSettingsBtn.disabled = true;
    settingsStatus.className = "status-message info";
    settingsStatus.textContent = "正在儲存設定...";
    
    chrome.storage.local.set({ settings }, () => {
      saveSettingsBtn.disabled = false;
      settingsStatus.className = "status-message success";
      settingsStatus.textContent = "💾 設定已成功套用！";
      showToast("⚙️ 設定儲存成功");
      
      // 通知背景 Service Worker 更新定時鬧鐘
      chrome.runtime.sendMessage({ action: "updateSyncAlarm" });
      
      setTimeout(() => {
        settingsStatus.textContent = "";
      }, 3000);
    });
  });

  // ==========================================================================
  // 8. 批次操作事件綁定
  // ==========================================================================

  // 更新「全選」核取狀態
  function updateSelectAllState(tier) {
    if (tier === 1) {
      const currentCheckboxes = focusList.querySelectorAll(".channel-checkbox");
      if (currentCheckboxes.length === 0) {
        focusSelectAll.checked = false;
        return;
      }
      focusSelectAll.checked = Array.from(currentCheckboxes).every(cb => cb.checked);
    } else {
      const currentCheckboxes = secondaryList.querySelectorAll(".channel-checkbox");
      if (currentCheckboxes.length === 0) {
        secondarySelectAll.checked = false;
        return;
      }
      secondarySelectAll.checked = Array.from(currentCheckboxes).every(cb => cb.checked);
    }
  }

  // 核心關注全選監聽
  focusSelectAll.addEventListener("change", (e) => {
    const checked = e.target.checked;
    const checkboxes = focusList.querySelectorAll(".channel-checkbox");
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const id = cb.dataset.id;
      if (checked) {
        selectedFocusIds.add(id);
      } else {
        selectedFocusIds.delete(id);
      }
    });
  });

  // 次要關注全選監聽
  secondarySelectAll.addEventListener("change", (e) => {
    const checked = e.target.checked;
    const checkboxes = secondaryList.querySelectorAll(".channel-checkbox");
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const id = cb.dataset.id;
      if (checked) {
        selectedSecondaryIds.add(id);
      } else {
        selectedSecondaryIds.delete(id);
      }
    });
  });

  // 核心批量移動 (降級移至次要關注)
  document.getElementById("focus-batch-move-btn").addEventListener("click", () => {
    if (selectedFocusIds.size === 0) {
      showCustomAlert("⚠️ 請先勾選要批量移動的頻道！", "提示");
      return;
    }
    showCustomConfirm(`確定要將選取的 ${selectedFocusIds.size} 個頻道降級移至「次要關注 (Tier 2)」嗎？`, () => {
      chrome.storage.local.get(["channels", "videos"], (data) => {
        let channels = data.channels || [];
        channels = channels.map(c => {
          if (selectedFocusIds.has(c.id)) {
            c.tier = 2;
          }
          return c;
        });
        
        const videos = data.videos || {};
        Object.keys(videos).forEach(vid => {
          if (selectedFocusIds.has(videos[vid].channelId)) {
            videos[vid].tier = 2;
          }
        });
        
        chrome.storage.local.set({ channels, videos }, () => {
          selectedFocusIds.clear();
          focusSelectAll.checked = false;
          loadData();
          triggerBackgroundSync();
          showToast("📥 已成功批次移動至次要關注");
        });
      });
    }, "批量移動確認");
  });

  // 核心批量刪除 (取消關注)
  document.getElementById("focus-batch-delete-btn").addEventListener("click", () => {
    if (selectedFocusIds.size === 0) {
      showCustomAlert("⚠️ 請先勾選要批量取消關注的頻道！", "提示");
      return;
    }
    showCustomConfirm(`確定要將選取的 ${selectedFocusIds.size} 個頻道取消關注嗎？這將會同步清除這些頻道的快取影片！`, () => {
      chrome.storage.local.get(["channels", "videos"], (data) => {
        let channels = data.channels || [];
        channels = channels.filter(c => !selectedFocusIds.has(c.id));
        
        const videos = data.videos || {};
        const cleanedVideos = {};
        Object.keys(videos).forEach(vid => {
          if (!selectedFocusIds.has(videos[vid].channelId)) {
            cleanedVideos[vid] = videos[vid];
          }
        });
        
        chrome.storage.local.set({ channels, videos: cleanedVideos }, () => {
          selectedFocusIds.clear();
          focusSelectAll.checked = false;
          loadData();
          triggerBackgroundSync();
          showToast("🗑️ 已成功取消關注所選頻道");
        });
      });
    }, "批量取消關注確認");
  });

  // 次要批量移動 (升級移至核心關注)
  document.getElementById("secondary-batch-move-btn").addEventListener("click", () => {
    if (selectedSecondaryIds.size === 0) {
      showCustomAlert("⚠️ 請先勾選要批量移動的頻道！", "提示");
      return;
    }
    showCustomConfirm(`確定要將選取的 ${selectedSecondaryIds.size} 個頻道升級移至「核心關注 (Tier 1)」嗎？`, () => {
      chrome.storage.local.get(["channels", "videos"], (data) => {
        let channels = data.channels || [];
        channels = channels.map(c => {
          if (selectedSecondaryIds.has(c.id)) {
            c.tier = 1;
          }
          return c;
        });
        
        const videos = data.videos || {};
        Object.keys(videos).forEach(vid => {
          if (selectedSecondaryIds.has(videos[vid].channelId)) {
            videos[vid].tier = 1;
          }
        });
        
        chrome.storage.local.set({ channels, videos }, () => {
          selectedSecondaryIds.clear();
          secondarySelectAll.checked = false;
          loadData();
          triggerBackgroundSync();
          showToast("🌟 已成功批次升級至核心關注");
        });
      });
    }, "批量升級確認");
  });

  // 次要批量刪除 (取消關注)
  document.getElementById("secondary-batch-delete-btn").addEventListener("click", () => {
    if (selectedSecondaryIds.size === 0) {
      showCustomAlert("⚠️ 請先勾選要批量取消關注的頻道！", "提示");
      return;
    }
    showCustomConfirm(`確定要將選取的 ${selectedSecondaryIds.size} 個頻道取消關注嗎？這將會同步清除這些頻道的快取影片！`, () => {
      chrome.storage.local.get(["channels", "videos"], (data) => {
        let channels = data.channels || [];
        channels = channels.filter(c => !selectedSecondaryIds.has(c.id));
        
        const videos = data.videos || {};
        const cleanedVideos = {};
        Object.keys(videos).forEach(vid => {
          if (!selectedSecondaryIds.has(videos[vid].channelId)) {
            cleanedVideos[vid] = videos[vid];
          }
        });
        
        chrome.storage.local.set({ channels, videos: cleanedVideos }, () => {
          selectedSecondaryIds.clear();
          secondarySelectAll.checked = false;
          loadData();
          triggerBackgroundSync();
          showToast("🗑️ 已成功取消關注所選頻道");
        });
      });
    }, "批量取消關注確認");
  });

  // ==========================================================================
  // 9. Toast 輕提示通用函數
  // ==========================================================================
  function showToast(message) {
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.add("show");
    
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }
});
