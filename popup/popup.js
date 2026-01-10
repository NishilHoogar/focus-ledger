const list = document.getElementById("list");
const today = new Date().toISOString().slice(0, 10);

// 🔹 Open Dashboard button (REGISTER ONCE)
document.getElementById("openDashboard").addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("dashboard/dashboard.html")
  });
});

chrome.storage.local.get([today], (result) => {
  const dayData = result[today];

  if (!dayData) {
    list.innerHTML = '<div class="empty-state">No activity recorded today.</div>';
    return;
  }

  list.innerHTML = "";

  // Sort domains by total time descending
  const sorted = Object.entries(dayData).sort((a, b) => {
    const totalA = (a[1].activeMs || 0) + (a[1].passiveMs || 0);
    const totalB = (b[1].activeMs || 0) + (b[1].passiveMs || 0);
    return totalB - totalA;
  });

  sorted.forEach(([domain, info]) => {
    const activeMs = info.activeMs || 0;
    const passiveMs = info.passiveMs || 0;
    const totalMs = activeMs + passiveMs;

    if (totalMs === 0) return;

    const activeWidth = ((activeMs / totalMs) * 100).toFixed(1);
    const passiveWidth = ((passiveMs / totalMs) * 100).toFixed(1);

    const row = document.createElement("div");
    row.className = "item";

    // 1. Header Row (Icon + Domain + Time)
    const header = document.createElement("div");
    header.className = "item-header";

    const domainGroup = document.createElement("div");
    domainGroup.className = "domain-group";
    domainGroup.innerHTML = `
      <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="">
      <span class="domain-name" title="${domain}">${domain}</span>
    `;

    const timeStat = document.createElement("div");
    timeStat.className = "time-stat";
    timeStat.textContent = formatTime(totalMs);

    header.appendChild(domainGroup);
    header.appendChild(timeStat);

    // 2. Bar Row
    const barContainer = document.createElement("div");
    barContainer.className = "bar-container";
    barContainer.innerHTML = `
      <div class="bar-active" style="width:${activeWidth}%"></div>
      <div class="bar-passive" style="width:${passiveWidth}%"></div>
    `;

    row.appendChild(header);
    row.appendChild(barContainer);

    list.appendChild(row);
  });
});

function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h > 0) return `${h}h ${mins}m`;
  return `${mins}m`;
}
