// YT Subscription Guard - YouTube DOM Injector Content Script

(function () {
  let lastUrl = location.href;
  let isProcessing = false;

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

  // 定期檢測，防止 late-load 漏失
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      cleanupInjectedElements();
      handlePageChange();
    } else {
      // 確保如果元素被 YouTube SPA 刷新沖掉，能自動補注入
      handlePageChange();
    }
  }, 1000);

  // 清除所有已注入元素
  function cleanupInjectedElements() {
    const homeFeed = document.getElementById("yt-guard-home-feed");
    if (homeFeed) homeFeed.remove();

    const sidebarFeed = document.getElementById("yt-guard-sidebar-feed");
    if (sidebarFeed) sidebarFeed.remove();
  }

  // 偵測當前頁面類型並分流注入
  function handlePageChange() {
    if (isProcessing) return;
    
    const isHome = location.pathname === "/" || location.pathname === "/index.html";
    const isWatch = location.pathname.startsWith("/watch");

    if (isHome) {
      injectHomepageFeed();
    } else if (isWatch) {
      injectSidebarFeed();
    }
  }

  // ==========================================================================
  // 1. YouTube 首頁注入邏輯
  // ==========================================================================
  function injectHomepageFeed() {
    // 尋找首頁影片網格容器 (多重備援降級選擇器，確保 100% 成功定位首頁原生推薦區塊)
    const gridRenderer = document.querySelector('ytd-browse[page-type="home"] ytd-rich-grid-renderer') ||
                         document.querySelector('ytd-rich-grid-renderer') ||
                         document.querySelector('#primary ytd-rich-grid-renderer') ||
                         document.querySelector('#primary');
    if (!gridRenderer) return;

    // 如果已經注入過，則不重複注入
    if (document.getElementById("yt-guard-home-feed")) return;

    isProcessing = true;

    chrome.storage.local.get(["videos", "channels", "settings", "homeFeedCollapsed"], (data) => {
      isProcessing = false;
      const settings = data.settings || {};
      
      // 如果關閉首頁注入
      if (settings.enableHomepageInjection === false) return;

      const channels = data.channels || [];
      const collapsed = data.homeFeedCollapsed || false;

      // 讀取展示策略設定 (時間天數限制與單頻道影片上限，未設定則套用預設值 7 天與 3 部)
      const maxVideoAgeDays = settings.maxVideoAgeDays !== undefined ? settings.maxVideoAgeDays : 7;
      const maxVideosPerChannel = settings.maxVideosPerChannel !== undefined ? settings.maxVideosPerChannel : 3;

      const now = Date.now();
      const maxAgeMs = maxVideoAgeDays * 24 * 60 * 60 * 1000;

      // 1. 篩選出：Tier 1 + Tier 2 + 未讀 + 指定天數時間跨度內 的影片
      const allVideos = Object.values(data.videos || {})
        .filter(v => {
          const isTargetTier = v.tier === 1 || v.tier === 2;
          const isUnread = !v.isRead;
          const pubTime = new Date(v.published).getTime();
          const isWithinTimeSpan = (now - pubTime) <= maxAgeMs;
          return isTargetTier && isUnread && isWithinTimeSpan;
        });

      // 2. 進行頻道聚合分組
      const groups = {};
      allVideos.forEach(v => {
        if (!groups[v.channelId]) {
          groups[v.channelId] = [];
        }
        groups[v.channelId].push(v);
      });

      // 3. 處理每個分組的影片（排序、裁剪）並轉為陣列
      const groupArray = [];
      Object.entries(groups).forEach(([channelId, channelVideos]) => {
        // 從新到舊排序
        channelVideos.sort((a, b) => new Date(b.published) - new Date(a.published));
        
        // 限制單個頻道顯示的影片數
        const visibleVideos = channelVideos.slice(0, maxVideosPerChannel);
        
        if (visibleVideos.length > 0) {
          const channelInfo = channels.find(c => c.id === channelId) || {
            id: channelId,
            title: visibleVideos[0].channelTitle || "未知頻道",
            avatar: visibleVideos[0].channelAvatar || "https://www.youtube.com/img/desktop/yt_128.png",
            tier: visibleVideos[0].tier || 1
          };
          if (channelInfo.tier === undefined) {
            channelInfo.tier = visibleVideos[0].tier || 1;
          }
          
          groupArray.push({
            channel: channelInfo,
            videos: visibleVideos,
            totalCount: channelVideos.length
          });
        }
      });

      // 優先依照 Tier (1 優先於 2，因此升序) 排序，同一階級內再依照最新發佈影片的時間降序排序
      groupArray.sort((a, b) => {
        const tierA = a.channel.tier !== undefined ? a.channel.tier : 1;
        const tierB = b.channel.tier !== undefined ? b.channel.tier : 1;
        if (tierA !== tierB) {
          return tierA - tierB;
        }
        return new Date(b.videos[0].published) - new Date(a.videos[0].published);
      });

      // 建立防線主容器
      const feedContainer = document.createElement("div");
      feedContainer.id = "yt-guard-home-feed";
      if (collapsed) {
        feedContainer.classList.add("collapsed");
      }

      // 建立頭像 Map
      const avatarMap = {};
      channels.forEach(c => { avatarMap[c.id] = c.avatar; });

      // 1. 建立 Header 區塊
      const header = document.createElement("div");
      header.className = "yt-guard-header";
      
      header.innerHTML = `
        <div class="yt-guard-title-area">
          <span class="yt-guard-title-logo"><svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/></svg></span>
          <div class="yt-guard-title-text">
            <h2>訂閱優先 <span class="yt-guard-live-dot" title="安全防護中"></span></h2>
            <span>已成功為您屏蔽演算法，優先展示關注頻道的最新影片 ${allVideos.length > 0 ? `(共 ${allVideos.length} 部未讀)` : ""}</span>
          </div>
        </div>
        <div class="yt-guard-actions">
          <button class="yt-guard-btn" id="yt-guard-home-collapse-btn">
            ${collapsed ? `<svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 展開` : `<svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> 摺疊`}
          </button>
          <button class="yt-guard-btn" id="yt-guard-home-sync-btn"><svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> 同步</button>
        </div>
      `;

      feedContainer.appendChild(header);

      // 2. 建立聚合分組展示架容器
      const grid = document.createElement("div");
      grid.className = "yt-guard-groups-container";

      if (groupArray.length === 0) {
        // 如果沒有新影片，顯示極致心理防線獎勵卡
        const victoryCard = document.createElement("div");
        victoryCard.className = "yt-guard-victory-card";
        victoryCard.innerHTML = `
          <div class="yt-guard-victory-icon">🎉</div>
          <div class="yt-guard-victory-title">訂閱防線守備成功！</div>
          <div class="yt-guard-victory-desc">目前關注頻道在最近 ${maxVideoAgeDays} 天內沒有未讀影片。您已成功抵禦演算法的無效推薦！</div>
        `;
        grid.appendChild(victoryCard);
      } else {
        // 渲染頻道展示架 (Shelves)
        groupArray.forEach(group => {
          const channel = group.channel;
          const channelAvatar = channel.avatar || "https://www.youtube.com/img/desktop/yt_128.png";
          
          const shelf = document.createElement("div");
          shelf.className = "yt-guard-shelf";
          
          // 2a. 頻道展示架標頭列 (Shelf Header)
          const shelfHeader = document.createElement("div");
          shelfHeader.className = "yt-guard-shelf-header";
          
          const tier = channel.tier !== undefined ? channel.tier : 1;
          const tierBadge = tier === 1 
            ? `<span class="yt-guard-shelf-tier-badge tier-1"><svg class="yt-guard-icon" viewBox="0 0 24 24" style="width: 10px; height: 10px; fill: #eab308; stroke: #eab308; vertical-align: -1px; margin-right: 2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> 核心</span>`
            : `<span class="yt-guard-shelf-tier-badge tier-2"><svg class="yt-guard-icon" viewBox="0 0 24 24" style="width: 10px; height: 10px; vertical-align: -1px; margin-right: 2px;"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> 次要</span>`;

          shelfHeader.innerHTML = `
            <div class="yt-guard-shelf-channel">
              <img class="yt-guard-shelf-avatar" src="${escapeHTML(channelAvatar)}" onerror="this.src='https://www.youtube.com/img/desktop/yt_128.png';">
              <span class="yt-guard-shelf-name">${escapeHTML(channel.title || channel.name || "未知頻道")}</span>
              ${tierBadge}
              <span class="yt-guard-shelf-count">${group.totalCount > group.videos.length ? `(展示最新 ${group.videos.length} / 共 ${group.totalCount} 部未讀)` : `(${group.totalCount} 部未讀)`}</span>
            </div>
            <button class="yt-guard-shelf-dismiss-btn" title="將該頻道此處所有展示影片標記為已讀"><svg class="yt-guard-icon" viewBox="0 0 24 24" style="width: 10px; height: 10px; vertical-align: -1px; margin-right: 2px;"><polyline points="20 6 9 17 4 12"/></svg> 已讀</button>
          `;
          
          // 2b. 影片卡片子網格 (Shelf Grid, 寬度自適應)
          const shelfGrid = document.createElement("div");
          shelfGrid.className = "yt-guard-shelf-grid";
          
          group.videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "yt-guard-card";
            card.dataset.id = video.id;

            card.innerHTML = `
              <button class="yt-guard-dismiss-btn" title="標記為已讀"><svg class="yt-guard-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
              <div class="yt-guard-thumb-wrapper">
                <img src="${escapeHTML(video.thumbnail)}" alt="縮圖" onerror="this.src='https://i.ytimg.com/vi/placeholder/hqdefault.jpg';">
              </div>
              <div class="yt-guard-details">
                <div class="yt-guard-title" title="${escapeHTML(video.title)}">${escapeHTML(video.title)}</div>
                <div class="yt-guard-meta">
                  <span class="yt-guard-time">${escapeHTML(getRelativeTime(video.published))}</span>
                </div>
              </div>
            `;

            // 卡片點擊事件：跳轉並標記為已讀
            card.addEventListener("click", (e) => {
              if (e.target.closest(".yt-guard-dismiss-btn")) return;
              chrome.runtime.sendMessage({ action: "syncNow" }); // 喚醒 background
              markAsReadInStorage(video.id);
              window.location.href = video.url; // 跳轉影片頁
            });

            // 單一影片一鍵已讀按鈕事件 (Dismiss)
            const dismissBtn = card.querySelector(".yt-guard-dismiss-btn");
            dismissBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              e.preventDefault();
              
              markAsReadInStorage(video.id, () => {
                // 卡片滑出動畫
                card.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
                card.style.opacity = "0";
                card.style.transform = "scale(0.85) translateY(10px)";
                
                setTimeout(() => {
                  card.remove();
                  
                  // 檢查該頻道展示架是否沒有剩餘顯示影片了，如果是，移除整個展示架
                  if (shelfGrid.querySelectorAll(".yt-guard-card").length === 0) {
                    shelf.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
                    shelf.style.opacity = "0";
                    shelf.style.transform = "scale(0.95)";
                    setTimeout(() => {
                      shelf.remove();
                      // 檢查整個大容器是否沒有任何卡片了，若是則顯示守備成功 Victory Card
                      checkAndInsertVictoryCard(grid);
                    }, 300);
                  }
                }, 300);
              });
            });

            shelfGrid.appendChild(card);
          });
          
          // 2c. 頻道整排一鍵已讀動作
          const shelfDismissBtn = shelfHeader.querySelector(".yt-guard-shelf-dismiss-btn");
          shelfDismissBtn.addEventListener("click", () => {
            const videoIds = group.videos.map(v => v.id);
            let processed = 0;
            
            videoIds.forEach(vid => {
              markAsReadInStorage(vid, () => {
                processed++;
                if (processed === videoIds.length) {
                  // 展示架整列淡出動畫
                  shelf.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
                  shelf.style.opacity = "0";
                  shelf.style.transform = "scale(0.95)";
                  setTimeout(() => {
                    shelf.remove();
                    checkAndInsertVictoryCard(grid);
                  }, 300);
                }
              });
            });
          });

          shelf.appendChild(shelfHeader);
          shelf.appendChild(shelfGrid);
          grid.appendChild(shelf);
        });
      }

      feedContainer.appendChild(grid);

      // 3. 綁定按鈕動作
      const collapseBtn = header.querySelector("#yt-guard-home-collapse-btn");
      collapseBtn.addEventListener("click", () => {
        const isCollapsed = feedContainer.classList.contains("collapsed");
        if (isCollapsed) {
          feedContainer.classList.remove("collapsed");
          collapseBtn.innerHTML = `<svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> 摺疊`;
          chrome.storage.local.set({ homeFeedCollapsed: false });
        } else {
          feedContainer.classList.add("collapsed");
          collapseBtn.innerHTML = `<svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 展開`;
          chrome.storage.local.set({ homeFeedCollapsed: true });
        }
      });

      const syncBtn = header.querySelector("#yt-guard-home-sync-btn");
      syncBtn.addEventListener("click", () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = "🔄 同步中...";
        chrome.runtime.sendMessage({ action: "syncNow" }, (response) => {
          syncBtn.disabled = false;
          syncBtn.innerHTML = `<svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg> 同步`;
          if (response && response.success) {
            cleanupInjectedElements();
            handlePageChange();
          }
        });
      });

      // 4. 插入到 YouTube 原生首頁中 (精準插在 contents row 的最前面，優先置頂)
      const contents = gridRenderer.querySelector("#contents") || 
                       gridRenderer.querySelector("ytd-rich-grid-renderer") ||
                       gridRenderer.firstElementChild;
      if (contents) {
        gridRenderer.insertBefore(feedContainer, contents);
      } else {
        gridRenderer.prepend(feedContainer);
      }
    });
  }

  // 輔助檢查首頁卡片是否全部被 Dismiss 了，若是則填入 Victory Card
  function checkAndInsertVictoryCard(gridElement) {
    const activeCards = gridElement.querySelectorAll(".yt-guard-card");
    if (activeCards.length === 0) {
      gridElement.innerHTML = `
        <div class="yt-guard-victory-card">
          <div class="yt-guard-victory-icon">🎉</div>
          <div class="yt-guard-victory-title">訂閱防線守備成功！</div>
          <div class="yt-guard-victory-desc">目前核心關注頻道中沒有未讀影片。您已成功抵禦演算法的無效推薦！</div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // 2. YouTube 播放頁 (Watch Page) 側邊欄注入邏輯
  // ==========================================================================
  function injectSidebarFeed() {
    // 尋找推薦影片容器
    const relatedItems = document.querySelector("#related ytd-watch-next-secondary-results-renderer #items");
    if (!relatedItems) return;

    // 若已注入則跳過
    if (document.getElementById("yt-guard-sidebar-feed")) return;

    isProcessing = true;

    chrome.storage.local.get(["videos", "settings"], (data) => {
      isProcessing = false;
      const settings = data.settings || {};

      // 若關閉側邊欄注入
      if (settings.enableSidebarInjection === false) return;

      const videos = Object.values(data.videos || {})
        .filter(v => v.tier === 1 && !v.isRead) // 核心關注且未讀
        .sort((a, b) => new Date(b.published) - new Date(a.published))
        .slice(0, 3); // 側邊欄空間有限，只顯示最新的 3 支影片

      // 如果無核心未讀影片，側邊欄保持清爽不注入
      if (videos.length === 0) return;

      // 建立側邊欄容器
      const sidebarContainer = document.createElement("div");
      sidebarContainer.id = "yt-guard-sidebar-feed";

      // 建立 Header
      const header = document.createElement("div");
      header.className = "yt-guard-sidebar-header";
      header.innerHTML = `
        <span class="yt-guard-sidebar-title"><svg class="yt-guard-icon" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/></svg> 訂閱優先</span>
        <span class="yt-guard-sidebar-badge"><svg class="yt-guard-icon" viewBox="0 0 24 24" style="width: 11px; height: 11px; fill: #ff3e55; stroke: #ff3e55; vertical-align: -1.5px; margin-right: 2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> 核心未讀 (${videos.length})</span>
      `;
      sidebarContainer.appendChild(header);

      // 建立影片清單
      const list = document.createElement("div");
      list.className = "yt-guard-sidebar-list";

      videos.forEach(video => {
        const item = document.createElement("div");
        item.className = "yt-guard-sidebar-item";
        item.dataset.id = video.id;

        item.innerHTML = `
          <div class="yt-guard-sidebar-thumb">
            <img src="${escapeHTML(video.thumbnail)}" onerror="this.src='https://i.ytimg.com/vi/placeholder/hqdefault.jpg';">
          </div>
          <div class="yt-guard-sidebar-details">
            <span class="yt-guard-sidebar-item-title" title="${escapeHTML(video.title)}">${escapeHTML(video.title)}</span>
            <span class="yt-guard-sidebar-channel-name" title="${escapeHTML(video.channelTitle)}">${escapeHTML(video.channelTitle)}</span>
          </div>
        `;

        // 點擊側邊卡片：跳轉並標記已讀
        item.addEventListener("click", () => {
          markAsReadInStorage(video.id);
          window.location.href = video.url; // YouTube SPA 機制跳轉
        });

        list.appendChild(item);
      });

      sidebarContainer.appendChild(list);

      // 置頂插入在側邊欄第一順位
      relatedItems.prepend(sidebarContainer);
    });
  }

  // ==========================================================================
  // 通用輔助函數
  // ==========================================================================

  // 將影片在 Storage 中標記為已讀
  function markAsReadInStorage(videoId, callback) {
    chrome.storage.local.get("videos", (data) => {
      const videos = data.videos || {};
      if (videos[videoId]) {
        videos[videoId].isRead = true;
        chrome.storage.local.set({ videos }, () => {
          if (callback) callback();
        });
      } else {
        if (callback) callback();
      }
    });
  }

  // 繁體中文相對時間轉換
  function getRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    
    if (diffMs < 0) return "剛剛";
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "剛剛";
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  }

  // 監聽來自 background 的訂閱 HTML 代理抓取請求 (以 YouTube 網站同源身份，100% 自動攜帶 Cookie 獲取資料)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "grabSubscriptionJSON") {
      fetch("https://www.youtube.com/feed/channels")
        .then(res => {
          if (!res.ok) throw new Error("YouTube 訂閱網頁請求失敗，請確認是否登入。");
          return res.text();
        })
        .then(htmlText => {
          const jsonMatch = htmlText.match(/ytInitialData\s*=\s*({[\s\S]*?});/) || 
                            htmlText.match(/ytInitialData\s*=\s*({[\s\S]*?})\s*<\/script>/) ||
                            htmlText.match(/window\["ytInitialData"\]\s*=\s*({[\s\S]*?});/);
          if (jsonMatch) {
            sendResponse({ success: true, jsonStr: jsonMatch[1] });
          } else {
            sendResponse({ success: false, error: "無法在頁面中定位 ytInitialData 結構" });
          }
        })
        .catch(err => {
          console.error("Proxy Subscriptions Fetch Error:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // 異步回應
    }
  });
})();
