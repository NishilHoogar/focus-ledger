document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

function loadData() {
  chrome.storage.local.get(['dailyActivity'], (result) => {
    const data = result.dailyActivity || {};
    renderDashboard(data);
  });
}

function renderDashboard(data) {
  const listContainer = document.getElementById('activity-list');
  const insightContainer = document.getElementById('insight');
  
  // Transform and Filter Data
  // Rule: If totalMs === 0 -> don't render
  const items = Object.entries(data)
    .map(([domain, stats]) => {
      const active = stats.activeMs || 0;
      const passive = stats.passiveMs || 0;
      return {
        domain,
        active,
        passive,
        total: active + passive
      };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  // Empty State
  if (items.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <h3>No activity recorded yet.</h3>
        <p>Focus Ledger starts tracking once you browse.</p>
      </div>
    `;
    insightContainer.textContent = '';
    return;
  }

  // Insight Logic
  const globalTotal = items.reduce((sum, item) => sum + item.total, 0);
  const topItem = items[0];
  const topRatio = topItem.total / globalTotal;

  let insightMsg = '';
  
  if (items.length === 1) {
    // Single site case
    insightMsg = "You spent focused time on a single site today.";
  } else if (topRatio > 0.6) {
    // Dominant site case
    const pct = Math.round(topRatio * 100);
    insightMsg = `${topItem.domain} = ${pct}% of your attention.`;
  }
  // Else: No insight text (cleaner than forcing a message)

  insightContainer.textContent = insightMsg;

  // Render List
  listContainer.innerHTML = items.map(item => {
    const activePct = (item.active / item.total) * 100;
    const passivePct = (item.passive / item.total) * 100;
    
    // Calculate width relative to the longest bar (optional) or full width (100%)
    // Request asked for "full-width stacked bars", so we fill 100% of the container
    // representing the ratio of active vs passive for that specific site.
    // However, usually "comparison" implies width relative to max time. 
    // Let's stick to the visual request: "Active 5m . Passive 2m" inside a bar.
    // To make comparison effortless, the bar width usually represents total time relative to max.
    // But the prompt example shows a long bar. I will make the bar width 100% of the container,
    // but split by active/passive ratio. This is cleaner for a "Ledger".
    
    return `
      <div class="item">
        <span class="domain-name">${item.domain}</span>
        
        <div class="bar-track">
          <div class="bar-segment bar-active" style="width: ${activePct}%"></div>
          <div class="bar-segment bar-passive" style="width: ${passivePct}%"></div>
        </div>
        
        <div class="stats-text">
          ${formatTime(item.total)}
          <span class="stats-detail">
            (Active ${formatTime(item.active)} · Passive ${formatTime(item.passive)})
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}