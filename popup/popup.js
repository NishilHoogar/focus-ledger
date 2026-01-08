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
    list.textContent = "No data yet.";
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

    const activeMin = (activeMs / 60000).toFixed(2);
    const passiveMin = (passiveMs / 60000).toFixed(2);

    const activeWidth = ((activeMs / totalMs) * 100).toFixed(1);
    const passiveWidth = ((passiveMs / totalMs) * 100).toFixed(1);

    const row = document.createElement("div");
    row.className = "item";

    const domainSpan = document.createElement("span");
    domainSpan.textContent = domain;

    const statsSmall = document.createElement("small");
    statsSmall.textContent = `Active: ${activeMin} min | Passive: ${passiveMin} min`;

    const barContainer = document.createElement("div");
    barContainer.className = "bar-container";
    barContainer.innerHTML = `
      <div class="bar-active" style="width:${activeWidth}%"></div>
      <div class="bar-passive" style="width:${passiveWidth}%"></div>
    `;

    row.appendChild(domainSpan);
    row.appendChild(document.createElement("br"));
    row.appendChild(statsSmall);
    row.appendChild(barContainer);

    list.appendChild(row);
  });
});
