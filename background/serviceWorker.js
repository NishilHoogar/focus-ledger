const IDLE_THRESHOLD = 60; // seconds
let isRecording = false;

// Listen for tab switches
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await recordTime();
  const tab = await chrome.tabs.get(tabId);
  await updateState(tab);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    await recordTime();
    updateState(tab);
  }
});

// Listen for idle state changes
chrome.idle.setDetectionInterval(IDLE_THRESHOLD);
chrome.idle.onStateChanged.addListener((state) => {
  recordTime();
  // We don't need to store idleState globally; we query it or rely on the event
});

// Helper to persist current tab info
async function updateState(tab) {
  await chrome.storage.local.set({ 
    lastTimestamp: Date.now(),
    activeTabId: tab.id,
    activeTabUrl: tab.url
  });
}

// Core recording function
async function recordTime() {
  if (isRecording) return;
  isRecording = true;
  try {
  const data = await chrome.storage.local.get(["lastTimestamp", "activeTabUrl"]);
  const lastTimestamp = data.lastTimestamp || Date.now();
  const currentUrl = data.activeTabUrl;

  if (!currentUrl || currentUrl.startsWith("chrome") || currentUrl.startsWith("edge")) return;

  const now = Date.now();
  const delta = now - lastTimestamp;
  
  // Safety: Ignore huge deltas (e.g. system sleep) > 5 minutes if we are running frequently
  if (delta <= 0 || delta > 5 * 60 * 1000) {
    await chrome.storage.local.set({ lastTimestamp: now });
    return;
  }

  const domain = new URL(currentUrl).hostname.replace("www.", "");
  const dateKey = new Date().toISOString().slice(0, 10);

  // Check idle state dynamically
  const idleState = await new Promise(resolve => chrome.idle.queryState(IDLE_THRESHOLD, resolve));

  const stored = await chrome.storage.local.get([dateKey]);
  const dayData = stored[dateKey] || {};

  // Always initialize both activeMs and passiveMs
  if (!dayData[domain]) {
    dayData[domain] = { activeMs: 0, passiveMs: 0 };
  }

  const activeMs = dayData[domain].activeMs ?? 0;
  const passiveMs = dayData[domain].passiveMs ?? 0;

  // Add time based on idle state
  if (idleState === "active") {
    dayData[domain].activeMs = activeMs + delta;
    dayData[domain].passiveMs = passiveMs; // ensure passive stays defined
  } else {
    dayData[domain].passiveMs = passiveMs + delta;
    dayData[domain].activeMs = activeMs; // ensure active stays defined
  }

  await chrome.storage.local.set({ 
    [dateKey]: dayData,
    lastTimestamp: now
  });
  } finally {
    isRecording = false;
  }
}

// Use alarms instead of setInterval for MV3 reliability
chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(() => {
  recordTime();
});
