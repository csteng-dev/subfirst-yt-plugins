// YT Subscription Guard - Background Service Worker

// 預設設定
const DEFAULT_SETTINGS = {
  syncInterval: 30, // 分鐘
  enableNotifications: true,
  enableHomepageInjection: true,
  enableSidebarInjection: true,
  maxVideoAgeDays: 7, // 影片時間跨度天數，預設 7 天
  maxVideosPerChannel: 3 // 單一頻道影片最多展示數，預設 3 部
};

// 初始化設定與鬧鐘
chrome.runtime.onInstalled.addListener(async () => {
  console.log("YT Subscription Guard Installed.");
  
  // 寫入預設設定
  const data = await chrome.storage.local.get(["settings", "channels", "videos"]);
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!data.channels) {
    await chrome.storage.local.set({ channels: [] });
  }
  if (!data.videos) {
    await chrome.storage.local.set({ videos: {} });
  }
  
  // 建立定時背景同步鬧鐘 (預設 30 分鐘)
  const interval = data.settings?.syncInterval || DEFAULT_SETTINGS.syncInterval;
  chrome.alarms.create("sync-feeds", { periodInMinutes: interval });
  
  // 立即執行一次同步
  syncFeeds();
});

// 監聽鬧鐘觸發
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync-feeds") {
    syncFeeds();
  }
});

// 監聽來自 Popup 或 Options 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "syncNow") {
    syncFeeds()
      .then(result => sendResponse({ success: true, count: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 非同步響應
  }
  
  if (request.action === "resolveChannel") {
    resolveChannelId(request.url)
      .then(channelData => sendResponse({ success: true, data: channelData }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === "updateSyncAlarm") {
    chrome.storage.local.get("settings", (data) => {
      const interval = data.settings?.syncInterval || DEFAULT_SETTINGS.syncInterval;
      chrome.alarms.clear("sync-feeds", () => {
        chrome.alarms.create("sync-feeds", { periodInMinutes: interval });
        console.log(`Sync alarm updated to every ${interval} minutes.`);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === "importSubscriptions") {
    // 優先尋找目前瀏覽器中開啟的任何 YouTube 分頁進行同源代理抓取
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
      // 優先選擇目前活躍分頁，否則選擇第一個 YouTube 分頁
      const activeTab = (tabs && tabs.find(t => t.active)) || (tabs && tabs[0]);
      
      if (activeTab) {
        console.log(`Found active YouTube tab (ID: ${activeTab.id}), delegating same-origin fetch...`);
        chrome.tabs.sendMessage(activeTab.id, { action: "grabSubscriptionJSON" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            console.warn("Delegated fetch failed, falling back to background fetch...", chrome.runtime.lastError);
            runBackgroundFetchFallback(sendResponse);
          } else {
            try {
              const ytData = JSON.parse(response.jsonStr);
              const foundChannels = [];
              findChannelsInObject(ytData, foundChannels);
              
              if (foundChannels.length === 0) {
                console.warn("Delegated fetch parsed 0 channels, trying background fallback...");
                runBackgroundFetchFallback(sendResponse);
              } else {
                console.log(`Delegated fetch successfully parsed ${foundChannels.length} channels.`);
                sendResponse({ success: true, channels: foundChannels });
              }
            } catch (e) {
              console.error("Failed to parse delegated JSON, trying background fallback...", e);
              runBackgroundFetchFallback(sendResponse);
            }
          }
        });
      } else {
        console.log("No active YouTube tab found, trying background fetch directly...");
        runBackgroundFetchFallback(sendResponse);
      }
    });
    return true; // 非同步響應
  }
});

// 監聽桌面通知點擊事件
chrome.notifications.onClicked.addListener((videoId) => {
  chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${videoId}` });
  
  // 標記為已讀
  chrome.storage.local.get("videos", (data) => {
    const videos = data.videos || {};
    if (videos[videoId]) {
      videos[videoId].isRead = true;
      chrome.storage.local.set({ videos });
    }
  });
});

/**
 * 解析 YouTube 網址或 Handle，獲取真實的 Channel ID 與名稱
 */
async function resolveChannelId(inputUrl) {
  let url = inputUrl.trim();
  
  // 如果已經是 Channel ID
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(url)) {
    return await fetchChannelInfoById(url);
  }
  
  // 補足網址協定
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.startsWith("@")) {
      url = "https://www.youtube.com/" + url;
    } else {
      url = "https://www.youtube.com/@" + url;
    }
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("無法連接 YouTube 頻道網址");
    const htmlText = await response.text();
    
    // 1. 從 meta 標籤提取 Channel ID
    let channelId = null;
    const metaMatch = htmlText.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})">/);
    if (metaMatch) {
      channelId = metaMatch[1];
    }
    
    // 2. 若沒找到，從頁面 JSON 資料提取
    if (!channelId) {
      const jsonMatch = htmlText.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (jsonMatch) channelId = jsonMatch[1];
    }

    if (!channelId) {
      const browseIdMatch = htmlText.match(/"browseId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (browseIdMatch) channelId = browseIdMatch[1];
    }
    
    if (!channelId) {
      throw new Error("無法解析頻道 ID，請確認是否為正確的 YouTube 頻道網址或 Handle");
    }
    
    // 提取頻道名稱
    let title = "未命名頻道";
    const titleMatch = htmlText.match(/<meta itemprop="name" content="([^"]+)">/) || 
                       htmlText.match(/<title>([^<]+) - YouTube<\/title>/);
    if (titleMatch) {
      title = decodeEntities(titleMatch[1]);
    }
    
    // 提取頭像 (Avatar)
    let avatarUrl = "";
    const avatarMatch = htmlText.match(/"avatar":{"thumbnails":\[{"url":"([^"]+)"/);
    if (avatarMatch) {
      avatarUrl = avatarMatch[1].replace(/\\u0026/g, "&");
    } else {
      const ogImageMatch = htmlText.match(/<meta property="og:image" content="([^"]+)">/);
      if (ogImageMatch) avatarUrl = ogImageMatch[1];
    }
    
    return {
      id: channelId,
      title: title.trim(),
      avatar: avatarUrl || "https://www.youtube.com/img/desktop/yt_128.png",
      url: url
    };
  } catch (error) {
    console.error("Resolve Error:", error);
    throw new Error("解析頻道失敗：" + error.message);
  }
}

/**
 * 透過 Channel ID 直接獲取頻道基本資訊
 */
async function fetchChannelInfoById(channelId) {
  const url = `https://www.youtube.com/channel/${channelId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("無法連接 YouTube");
    const htmlText = await response.text();
    
    let title = "YouTube 頻道";
    const titleMatch = htmlText.match(/<meta itemprop="name" content="([^"]+)">/) || 
                       htmlText.match(/<title>([^<]+) - YouTube<\/title>/);
    if (titleMatch) {
      title = decodeEntities(titleMatch[1]);
    }
    
    let avatarUrl = "";
    const ogImageMatch = htmlText.match(/<meta property="og:image" content="([^"]+)">/);
    if (ogImageMatch) avatarUrl = ogImageMatch[1];
    
    return {
      id: channelId,
      title: title.trim(),
      avatar: avatarUrl || "https://www.youtube.com/img/desktop/yt_128.png",
      url: url
    };
  } catch (e) {
    return {
      id: channelId,
      title: "YouTube 頻道",
      avatar: "https://www.youtube.com/img/desktop/yt_128.png",
      url: url
    };
  }
}

/**
 * 背景同步所有頻道的影片
 */
async function syncFeeds() {
  console.log("Syncing subscription feeds...");
  const data = await chrome.storage.local.get(["channels", "videos", "settings"]);
  const channels = data.channels || [];
  const oldVideos = data.videos || {};
  const settings = data.settings || DEFAULT_SETTINGS;
  
  if (channels.length === 0) {
    console.log("No channels configured.");
    return 0;
  }
  
  const newVideosMap = { ...oldVideos };
  let newVideoCount = 0;
  
  // 逐一抓取每個頻道的 RSS
  for (const channel of channels) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
      const response = await fetch(rssUrl);
      if (!response.ok) {
        console.warn(`Failed to fetch RSS for channel ${channel.title} (${channel.id})`);
        continue;
      }
      const xmlText = await response.text();
      const parsedVideos = parseYoutubeRSS(xmlText, channel);
      
      parsedVideos.forEach(video => {
        // 如果是新影片
        if (!newVideosMap[video.id]) {
          newVideosMap[video.id] = {
            ...video,
            isRead: false,
            detectedAt: Date.now()
          };
          
          // 如果是 Focus (Tier 1) 頻道，且開啟推播通知
          if (channel.tier === 1) {
            newVideoCount++;
            if (settings.enableNotifications) {
              triggerDesktopNotification(video);
            }
          }
        } else {
          // 更新基本欄位以防有修改，但保留已讀/偵測狀態，並且同步更新 Tier 與頭像防止不同步
          newVideosMap[video.id] = {
            ...newVideosMap[video.id],
            title: video.title,
            published: video.published,
            thumbnail: video.thumbnail,
            tier: video.tier,
            channelAvatar: video.channelAvatar
          };
        }
      });
    } catch (error) {
      console.error(`Error syncing channel ${channel.title}:`, error);
    }
  }
  
  // 清理舊影片快取，防止儲存庫爆量 (保留最新 200 支影片)
  const sortedVideos = Object.values(newVideosMap).sort((a, b) => b.detectedAt - a.detectedAt);
  const cappedVideos = {};
  sortedVideos.slice(0, 200).forEach(v => {
    cappedVideos[v.id] = v;
  });
  
  await chrome.storage.local.set({ 
    videos: cappedVideos,
    lastSyncTime: Date.now()
  });
  
  console.log(`Feed sync completed. Detected ${newVideoCount} new Focus videos.`);
  return newVideoCount;
}

/**
 * 手動 Regex XML 解析器，避免在 Service Worker 環境使用 DOMParser
 */
function parseYoutubeRSS(xmlText, channel) {
  const videos = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryContent = match[1];
    
    const videoIdMatch = entryContent.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || 
                         entryContent.match(/<id>yt:video:(.*?)<\/id>/);
    const titleMatch = entryContent.match(/<title>(.*?)<\/title>/);
    const publishedMatch = entryContent.match(/<published>(.*?)<\/published>/);
    
    if (videoIdMatch && titleMatch) {
      const videoId = videoIdMatch[1].trim();
      videos.push({
        id: videoId,
        channelId: channel.id,
        channelTitle: channel.title,
        channelAvatar: channel.avatar,
        title: decodeEntities(titleMatch[1].trim()),
        published: publishedMatch ? publishedMatch[1].trim() : new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        tier: channel.tier
      });
    }
  }
  return videos;
}

/**
 * 觸發系統桌面通知
 */
function triggerDesktopNotification(video) {
  chrome.notifications.create(video.id, {
    type: "basic",
    iconUrl: "../assets/icon128.png", // 系統預設 Logo，因外網圖片可能會有權限限制
    title: `防線警報：${video.channelTitle} 上傳了新影片`,
    message: video.title,
    contextMessage: "YT Subscription Guard 訂閱置頂通知",
    requireInteraction: true // 使用者必須手動關閉或點擊
  });
}

/**
 * HTML Entities 解碼器
 */
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * 智慧自動抓取使用者已訂閱的所有頻道名單 (多重備援與憑證強制攜帶版)
 */
async function autoFetchSubscriptions() {
  const urls = [
    "https://www.youtube.com/feed/channels",
    "https://www.youtube.com/feed/guide_builder",
    "https://www.youtube.com/"
  ];
  
  let lastError = null;
  let foundChannels = [];
  
  for (const url of urls) {
    try {
      console.log(`Attempting to auto-fetch subscriptions from: ${url}`);
      // 強制攜帶 YouTube 登入 Cookie
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) continue;
      
      const htmlText = await response.text();
      
      // 尋找 ytInitialData 變數 (三合一超強相容 Regex)
      const jsonMatch = htmlText.match(/ytInitialData\s*=\s*({[\s\S]*?});/) || 
                        htmlText.match(/ytInitialData\s*=\s*({[\s\S]*?})\s*<\/script>/) ||
                        htmlText.match(/window\["ytInitialData"\]\s*=\s*({[\s\S]*?});/);
                        
      if (!jsonMatch) continue;
      
      const ytData = JSON.parse(jsonMatch[1]);
      findChannelsInObject(ytData, foundChannels);
      
      if (foundChannels.length > 0) {
        console.log(`Successfully fetched ${foundChannels.length} subscription channels from ${url}`);
        return foundChannels;
      }
    } catch (error) {
      console.warn(`Fetch subscription error for ${url}:`, error);
      lastError = error;
    }
  }
  
  if (foundChannels.length === 0) {
    throw new Error(lastError ? lastError.message : "在您的帳號中未發現任何訂閱頻道，請確認您已登入 YouTube 並關閉無痕視窗。");
  }
  
  return foundChannels;
}

/**
 * 遞迴搜尋 JSON 結構中的所有 Channel 物件 (深度優先 - 支援 browseId 辨識)
 */
function findChannelsInObject(obj, found = []) {
  if (!obj || typeof obj !== "object") return found;
  
  // 檢查是否含有 channelId 或 browseId 且開頭為 UC 的頻道物件
  const cid = obj.channelId || obj.browseId;
  if (cid && typeof cid === "string" && cid.startsWith("UC")) {
    let title = "";
    if (obj.title) {
      if (typeof obj.title === "string") title = obj.title;
      else if (obj.title.simpleText) title = obj.title.simpleText;
      else if (obj.title.runs && obj.title.runs[0]) title = obj.title.runs[0].text;
    }
    
    // 過濾掉側邊欄中系統原生功能名稱
    const blacklistedTitles = [
      "首頁", "發燒影片", "短影音", "媒體庫", "歷史紀錄", "你的影片", 
      "稍後觀看", "喜歡的影片", "訂閱內容", "訂閱", "已訂閱", "YouTube Premium",
      "YouTube Music", "YouTube Kids", "設定", "檢舉紀錄", "說明", "傳送意見"
    ];
    
    if (title && !blacklistedTitles.includes(title)) {
      let avatar = "";
      if (obj.thumbnail && obj.thumbnail.thumbnails && obj.thumbnail.thumbnails[0]) {
        avatar = obj.thumbnail.thumbnails[0].url;
      } else if (obj.avatar && obj.avatar.thumbnails && obj.avatar.thumbnails[0]) {
        avatar = obj.avatar.thumbnails[0].url;
      }
      
      // 補足省略的協定前綴
      if (avatar && avatar.startsWith("//")) {
        avatar = "https:" + avatar;
      }
      
      // 去除重複項目
      if (!found.some(c => c.id === cid)) {
        found.push({
          id: cid,
          title: title.trim(),
          avatar: avatar || "https://www.youtube.com/img/desktop/yt_128.png",
          tier: 2 // 預設歸類為次要 (防止通知轟炸)
        });
      }
    }
  }
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      findChannelsInObject(obj[key], found);
    }
  }
  return found;
}

/**
 * 降級方案：當同源分頁代理抓取失敗時，退回使用背景 Service Worker 直接拉取
 */
function runBackgroundFetchFallback(sendResponse) {
  autoFetchSubscriptions()
    .then(channels => sendResponse({ success: true, channels }))
    .catch(err => {
      console.error("All subscription fetch strategies failed:", err);
      sendResponse({ 
        success: false, 
        error: "在瀏覽器中未發現開啟的 YouTube 分頁，或背景直接抓取失敗。為了安全且成功地讀取您的訂閱列表，請在瀏覽器中開啟任意 YouTube 頁面（例如首頁並確認已登入），然後再次點擊匯入！" 
      });
    });
}

