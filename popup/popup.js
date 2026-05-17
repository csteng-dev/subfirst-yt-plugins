// YT Subscription Guard - Popup Script

document.addEventListener("DOMContentLoaded", () => {
  // 安全的 HTML 轉義過濾器，預防任何 Stored XSS 與屬性突破攻擊
  function escapeHTML(str) {
    if (!str) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const goOptionsBtn = document.getElementById("go-to-options");
  const navButtons = document.querySelectorAll(".nav-btn");
  const videoFeedContainer = document.getElementById("video-feed-container");
  const feedPlaceholder = document.getElementById("feed-placeholder");
  const unreadBadge = document.getElementById("unread-badge");
  
  const popupSyncBtn = document.getElementById("popup-sync-btn");
  const pulseDot = document.querySelector(".pulse-dot");
  const syncStatusText = document.getElementById("sync-status-text");

  let activeTab = "focus"; // focus, secondary, unread

  // 1. 點擊齒輪跳轉設定中心 (雙重相容性降級保證)
  goOptionsBtn.addEventListener("click", () => {
    try {
      chrome.runtime.openOptionsPage((err) => {
        if (chrome.runtime.lastError || err) {
          chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") });
        }
      });
    } catch (e) {
      chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") });
    }
  });

  // 2. 分頁按鈕事件監聽
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      activeTab = btn.getAttribute("data-tab");
      loadAndRenderVideos();
    });
  });

  // 3. 初始化載入
  loadAndRenderVideos();

  // 定期載入與渲染影片
  function loadAndRenderVideos() {
    chrome.storage.local.get(["videos", "channels", "settings"], (data) => {
      const allVideos = Object.values(data.videos || {});
      const channels = data.channels || [];
      const settings = data.settings || {};
      
      const maxVideoAgeDays = settings.maxVideoAgeDays !== undefined ? settings.maxVideoAgeDays : 7;
      const maxVideosPerChannel = settings.maxVideosPerChannel !== undefined ? settings.maxVideosPerChannel : 3;

      const now = Date.now();
      const maxAgeMs = maxVideoAgeDays * 24 * 60 * 60 * 1000;

      // 依照發布時間排序 (倒序 - 最新發布在最上面)
      allVideos.sort((a, b) => new Date(b.published) - new Date(a.published));
      
      // 計算所有未讀數
      const totalUnread = allVideos.filter(v => !v.isRead).length;
      updateUnreadBadge(totalUnread);

      // 根據當前 activeTab 過濾並套用天數限制
      let filteredVideos = [];
      if (activeTab === "focus") {
        filteredVideos = allVideos.filter(v => v.tier === 1 && (now - new Date(v.published).getTime()) <= maxAgeMs);
      } else if (activeTab === "secondary") {
        filteredVideos = allVideos.filter(v => v.tier === 2 && (now - new Date(v.published).getTime()) <= maxAgeMs);
      } else if (activeTab === "unread") {
        filteredVideos = allVideos.filter(v => !v.isRead && (now - new Date(v.published).getTime()) <= maxAgeMs);
      }

      // 進行頻道分組聚合
      const groups = {};
      filteredVideos.forEach(v => {
        if (!groups[v.channelId]) {
          groups[v.channelId] = [];
        }
        groups[v.channelId].push(v);
      });

      const groupArray = [];
      Object.entries(groups).forEach(([channelId, channelVideos]) => {
        channelVideos.sort((a, b) => new Date(b.published) - new Date(a.published));
        const visibleVideos = channelVideos.slice(0, maxVideosPerChannel);
        
        if (visibleVideos.length > 0) {
          const channelInfo = channels.find(c => c.id === channelId) || {
            id: channelId,
            title: visibleVideos[0].channelTitle || "未知頻道",
            avatar: visibleVideos[0].channelAvatar || "https://www.youtube.com/img/desktop/yt_128.png"
          };
          groupArray.push({
            channel: channelInfo,
            videos: visibleVideos,
            totalCount: channelVideos.length
          });
        }
      });

      // 排序分組：依據各分組最新影片發布時間
      groupArray.sort((a, b) => new Date(b.videos[0].published) - new Date(a.videos[0].published));

      renderFeed(groupArray, maxVideoAgeDays);
    });
  }

  // 更新未讀角標
  function updateUnreadBadge(count) {
    if (count > 0) {
      unreadBadge.textContent = count;
      unreadBadge.style.display = "inline-block";
    } else {
      unreadBadge.style.display = "none";
    }
  }

  // 渲染影片列表
  function renderFeed(groupArray, maxVideoAgeDays) {
    // 保留 Placeholder，清除舊卡片與舊展示架
    const oldElements = videoFeedContainer.querySelectorAll(".video-card, .popup-shelf");
    oldElements.forEach(el => el.remove());

    if (groupArray.length === 0) {
      feedPlaceholder.style.display = "flex";
      
      // 根據分頁客製化 Placeholder 提示
      const p = feedPlaceholder.querySelector("p");
      const span = feedPlaceholder.querySelector("span");
      const icon = feedPlaceholder.querySelector(".placeholder-icon");
      
      if (activeTab === "focus") {
        icon.innerHTML = '<svg class="icon" viewBox="0 0 24 24" style="width: 42px; height: 42px; color: #eab308; fill: #eab308; stroke: #eab308;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        p.textContent = "無核心頻道影片";
        span.textContent = `核心關注 (Tier 1) 在 ${maxVideoAgeDays} 天內無影片`;
      } else if (activeTab === "secondary") {
        icon.innerHTML = '<svg class="icon" viewBox="0 0 24 24" style="width: 42px; height: 42px;"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
        p.textContent = "無次要關注影片";
        span.textContent = `次要關注 (Tier 2) 在 ${maxVideoAgeDays} 天內無影片`;
      } else if (activeTab === "unread") {
        icon.innerHTML = '<svg class="icon" viewBox="0 0 24 24" style="width: 42px; height: 42px; color: var(--success);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        p.textContent = "太棒了！所有影片已讀";
        span.textContent = `您目前已經追完 ${maxVideoAgeDays} 天內的所有關注影片！`;
      }
      return;
    }

    feedPlaceholder.style.display = "none";

    groupArray.forEach(group => {
      const channel = group.channel;
      const channelAvatarUrl = channel.avatar || "https://www.youtube.com/img/desktop/yt_128.png";
      
      const shelf = document.createElement("div");
      shelf.className = "popup-shelf";
      
      // Shelf Header
      const shelfHeader = document.createElement("div");
      shelfHeader.className = "popup-shelf-header";
      shelfHeader.innerHTML = `
        <div class="popup-shelf-channel">
          <img class="popup-shelf-avatar" src="${escapeHTML(channelAvatarUrl)}" onerror="this.src='https://www.youtube.com/img/desktop/yt_128.png';">
          <span class="popup-shelf-name" title="${escapeHTML(channel.title || channel.name || "未知頻道")}">${escapeHTML(channel.title || channel.name || "未知頻道")}</span>
          <span class="popup-shelf-count">${group.totalCount > group.videos.length ? `(${group.videos.length}/${group.totalCount}未讀)` : `(${group.totalCount}未讀)`}</span>
        </div>
        <button class="popup-shelf-dismiss-btn" title="將該頻道此處所有展示影片標記為已讀"><svg class="icon" viewBox="0 0 24 24" style="width: 10px; height: 10px; vertical-align: -1px; margin-right: 2px;"><polyline points="20 6 9 17 4 12"/></svg> 已讀</button>
      `;
      
      shelf.appendChild(shelfHeader);
      
      group.videos.forEach(video => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.dataset.id = video.id;
        
        // 未讀紅點
        if (!video.isRead) {
          const dot = document.createElement("div");
          dot.className = "unread-dot";
          card.appendChild(dot);
        }
        
        // 左側縮圖包裝
        const thumbWrapper = document.createElement("div");
        thumbWrapper.className = "thumbnail-wrapper";
        const thumbImg = document.createElement("img");
        thumbImg.src = video.thumbnail;
        thumbImg.alt = "影片縮圖";
        thumbImg.loading = "lazy";
        thumbImg.onerror = () => { thumbImg.src = "https://i.ytimg.com/vi/placeholder/hqdefault.jpg"; };
        thumbWrapper.appendChild(thumbImg);
        
        // 右側詳情
        const detailsWrapper = document.createElement("div");
        detailsWrapper.className = "details-wrapper";
        
        const title = document.createElement("div");
        title.className = "video-title";
        title.textContent = video.title;
        title.title = video.title;
        
        const metaRow = document.createElement("div");
        metaRow.className = "meta-row";
        
        const timeBadge = document.createElement("span");
        timeBadge.className = "time-badge";
        timeBadge.textContent = getRelativeTime(video.published);
        metaRow.appendChild(timeBadge);
        
        // 如果未讀，加入已讀按鈕
        if (!video.isRead) {
          const markBtn = document.createElement("button");
          markBtn.className = "mark-read-btn";
          markBtn.textContent = "✔️ 已讀";
          markBtn.title = "標記為已讀";
          
          markBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            markVideoAsRead(video.id);
          });
          metaRow.appendChild(markBtn);
        }
        
        detailsWrapper.appendChild(title);
        detailsWrapper.appendChild(metaRow);
        
        card.appendChild(thumbWrapper);
        card.appendChild(detailsWrapper);
        
        // 點擊卡片跳轉播放並標記已讀
        card.addEventListener("click", () => {
          chrome.tabs.create({ url: video.url });
          markVideoAsRead(video.id);
        });
        
        shelf.appendChild(card);
      });
      
      // Shelf 一鍵已讀點擊事件
      const shelfDismissBtn = shelfHeader.querySelector(".popup-shelf-dismiss-btn");
      shelfDismissBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const videoIds = group.videos.map(v => v.id);
        
        chrome.storage.local.get("videos", (data) => {
          const videosObj = data.videos || {};
          videoIds.forEach(vid => {
            if (videosObj[vid]) {
              videosObj[vid].isRead = true;
            }
          });
          chrome.storage.local.set({ videos: videosObj }, () => {
            loadAndRenderVideos();
          });
        });
      });
      
      videoFeedContainer.appendChild(shelf);
    });
  }

  // 標記影片為已讀
  function markVideoAsRead(videoId) {
    chrome.storage.local.get("videos", (data) => {
      const videos = data.videos || {};
      if (videos[videoId]) {
        videos[videoId].isRead = true;
        chrome.storage.local.set({ videos }, () => {
          // 即時刷新
          loadAndRenderVideos();
        });
      }
    });
  }

  // 4. 手動同步按鈕
  popupSyncBtn.addEventListener("click", () => {
    popupSyncBtn.disabled = true;
    popupSyncBtn.textContent = "🔄 同步中...";
    pulseDot.className = "pulse-dot syncing";
    syncStatusText.textContent = "正在同步 RSS...";

    chrome.runtime.sendMessage({ action: "syncNow" }, (response) => {
      popupSyncBtn.disabled = false;
      popupSyncBtn.textContent = "🔄 同步";
      pulseDot.className = "pulse-dot";
      syncStatusText.textContent = "防線守護中";

      if (response && response.success) {
        loadAndRenderVideos();
      } else {
        alert("同步失敗，請確認網路或稍後再試！");
      }
    });
  });

  // 繁體中文相對時間轉換輔助函數
  function getRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    
    // 如果未來時間（可能是系統時差），當成剛剛
    if (diffMs < 0) return "剛剛";
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "剛剛";
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays} 天前`;
    
    // 超過一週顯示完整日期
    return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  }
});
