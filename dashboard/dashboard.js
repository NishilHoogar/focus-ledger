document.addEventListener("DOMContentLoaded", () => {
  const dateSelector = document.getElementById("dateSelector");
  
  // Initial Load
  loadDashboard("today");

  dateSelector.addEventListener("change", (e) => {
    loadDashboard(e.target.value);
  });
});

function loadDashboard(range) {
  const dateObj = new Date();
  if (range === "yesterday") {
    dateObj.setDate(dateObj.getDate() - 1);
  }
  
  const dateKey = dateObj.toISOString().slice(0, 10);
  const displayDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  
  document.getElementById("dateDisplay").textContent = displayDate;

  chrome.storage.local.get([dateKey], (result) => {
    const data = result[dateKey] || {};
    render(data);
  });
}

function render(data) {
  const domains = Object.entries(data).map(([domain, stats]) => {
    const active = stats.activeMs || 0;
    const passive = stats.passiveMs || 0;
    return {
      domain,
      active,
      passive,
      total: active + passive
    };
  });

  // Sort by total time descending
  domains.sort((a, b) => b.total - a.total);

  // Calculate Totals
  const totalActiveMs = domains.reduce((sum, d) => sum + d.active, 0);
  const totalPassiveMs = domains.reduce((sum, d) => sum + d.passive, 0);
  const totalMs = totalActiveMs + totalPassiveMs;

  // Update Cards
  document.getElementById("totalActive").textContent = formatTime(totalActiveMs);
  document.getElementById("totalPassive").textContent = formatTime(totalPassiveMs);
  document.getElementById("totalScreen").textContent = formatTime(totalMs);

  // Update Insight
  updateInsight(totalActiveMs, totalPassiveMs, domains);

  // Render Breakdown
  const container = document.getElementById("breakdown");
  container.innerHTML = "";

  if (domains.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No activity recorded for this date.</div>';
    return;
  }

  domains.forEach(d => {
    if (d.total < 1000) return; // Skip < 1s

    const activePct = (d.active / d.total) * 100;
    const passivePct = (d.passive / d.total) * 100;

    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="domain" title="${d.domain}">${d.domain}</div>
      <div class="bar-track">
        <div class="bar-active" style="width: ${activePct}%"></div>
        <div class="bar-passive" style="width: ${passivePct}%"></div>
      </div>
      <div class="time-label">${formatTime(d.total)}</div>
    `;
    container.appendChild(row);
  });
}

function updateInsight(activeMs, passiveMs, domains) {
  const insightEl = document.getElementById("insight");
  const totalMs = activeMs + passiveMs;

  if (totalMs === 0) {
    insightEl.style.display = "none";
    return;
  }
  insightEl.style.display = "block";

  const activeRatio = activeMs / totalMs;
  let text = "";

  if (activeRatio > 0.75) {
    text = "<strong>High Focus:</strong> You spent most of your time actively engaged. Great work!";
  } else if (activeRatio < 0.25) {
    text = "<strong>Passive Mode:</strong> A lot of background activity today. Maybe close some unused tabs?";
  } else {
    text = "<strong>Balanced Day:</strong> You have a healthy mix of active work and reference/passive time.";
  }

  if (domains.length > 0) {
    const top = domains[0];
    const pct = Math.round((top.total / totalMs) * 100);
    text += ` Your top site, <strong>${top.domain}</strong>, accounted for ${pct}% of your screen time.`;
  }

  insightEl.innerHTML = text;
}

function formatTime(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}