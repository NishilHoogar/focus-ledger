document.addEventListener("DOMContentLoaded", () => {
  const dateSelector = document.getElementById("dateSelector");
  
  // Initial Load
  loadDashboard("today");

  dateSelector.addEventListener("change", (e) => {
    loadDashboard(e.target.value);
  });
});

function loadDashboard(range) {
  if (range === "week") {
    loadWeeklyData();
    return;
  }

  const dateObj = new Date();
  if (range === "yesterday") {
    dateObj.setDate(dateObj.getDate() - 1);
  }
  
  const dateKey = dateObj.toISOString().slice(0, 10);
  const displayDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  
  document.getElementById("dateDisplay").textContent = displayDate;

  chrome.storage.local.get([dateKey], (result) => {
    const data = result[dateKey] || {};
    render(data, null); // null indicates no trend data for single day view
  });
}

function loadWeeklyData() {
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  document.getElementById("dateDisplay").textContent = "Last 7 Days";

  chrome.storage.local.get(keys, (result) => {
    const aggregated = {};
    const trendData = [];

    // Process data for both aggregation and trend chart
    keys.forEach(key => {
      const dayData = result[key];
      const dayStats = { date: key, active: 0, passive: 0 };

      if (!dayData) return;

      // Aggregate for list view
      Object.entries(dayData).forEach(([domain, stats]) => {
        if (!aggregated[domain]) {
          aggregated[domain] = { activeMs: 0, passiveMs: 0 };
        }
        aggregated[domain].activeMs += (stats.activeMs || 0);
        aggregated[domain].passiveMs += (stats.passiveMs || 0);

        // Aggregate for daily trend
        dayStats.active += (stats.activeMs || 0);
        dayStats.passive += (stats.passiveMs || 0);
      });

      trendData.push(dayStats);
    });

    // Reverse trendData so it goes from Oldest -> Newest
    render(aggregated, trendData.reverse());
  });
}

function render(data, trendData) {
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
  const chartsContainer = document.querySelector('.charts-container');

  if (domains.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No activity recorded for this period.</div>';
    if (chartsContainer) chartsContainer.style.display = 'none';
    return;
  }

  if (chartsContainer) chartsContainer.style.display = 'flex';

  // Render Charts
  renderCharts(domains, trendData);

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
    text = "<strong>Passive Mode:</strong> A lot of background activity. Maybe close some unused tabs?";
  } else {
    text = "<strong>Balanced Flow:</strong> You have a healthy mix of active work and reference/passive time.";
  }

  if (domains.length > 0) {
    const top = domains[0];
    const pct = Math.round((top.total / totalMs) * 100);
    text += ` Your top site, <strong>${top.domain}</strong>, accounted for ${pct}% of your screen time.`;
  }

  insightEl.innerHTML = text;
}

function renderCharts(domains, trendData) {
  // 1. Distribution Chart (Donut)
  drawDonutChart(domains);

  // 2. Trend Chart (Stacked Bar)
  const trendCanvas = document.getElementById('trendChart');
  trendCanvas.style.display = 'block'; // Ensure it's always visible

  if (!trendData) {
    // Daily View: Show Focus Gauge
    const totalActive = domains.reduce((sum, d) => sum + d.active, 0);
    const totalPassive = domains.reduce((sum, d) => sum + d.passive, 0);
    drawFocusGauge(totalActive, totalPassive);
  } else {
    // Weekly View: Show Trend Bar
    drawTrendChart(trendData);
  }
}

function drawDonutChart(domains) {
  const canvas = document.getElementById('distributionChart');
  const ctx = canvas.getContext('2d');
  const chartElements = []; // Store slice data for hover
  
  // Handle High DPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.clearRect(0, 0, width, height);

  const activeDomains = domains.filter(d => d.total > 0);
  const top5 = activeDomains.slice(0, 5);
  const otherTotal = activeDomains.slice(5).reduce((sum, d) => sum + d.total, 0);
  
  let data = top5.map(d => ({ label: d.domain, value: d.total }));
  if (otherTotal > 0) data.push({ label: 'Others', value: otherTotal });

  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  // Expanded Palette for distinct domains
  const palette = [
    '#4a90e2', // Blue (Active)
    '#f5a623', // Yellow (Passive)
    '#26c6da', // Cyan
    '#7e57c2', // Deep Purple
    '#ef5350', // Red
    '#66bb6a', // Green
    '#ec407a', // Pink
    '#8d6e63', // Brown
    '#5c6bc0'  // Indigo
  ];
  const otherColor = '#e0e0e0'; // Neutral Grey for 'Others'

  let startAngle = -0.5 * Math.PI; // Start at top

  // Draw Slices
  data.forEach((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    
    // Use neutral color for 'Others', palette for domains
    if (d.label === 'Others') {
      ctx.fillStyle = otherColor;
    } else {
      ctx.fillStyle = palette[i % palette.length];
    }
    ctx.fill();

    // Store hit region data
    chartElements.push({
      startAngle,
      endAngle,
      label: d.label,
      value: d.value,
      color: ctx.fillStyle
    });
    
    // Add white border for clean separation
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Cutout center (Donut)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  
  // Simple Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Top Sites", centerX, centerY);

  // Render Legend
  renderLegend(canvas.parentElement, data, palette, otherColor);

  // Add Interaction
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate mouse angle and distance relative to center
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx); // -PI to PI

    // Normalize angle to match canvas arc (0 to 2PI starting from right, but we drew from -0.5PI)
    // Our drawing logic starts at -0.5PI. 
    // Let's normalize everything to 0 - 2PI relative to the start point (-0.5PI) is tricky.
    // Easier: Normalize atan2 result to 0 - 2PI, then adjust for rotation.
    if (angle < -0.5 * Math.PI) angle += 2 * Math.PI; // Adjust for the gap between -PI and -0.5PI
    
    // Check if mouse is inside the donut ring
    if (dist < radius * 0.6 || dist > radius) {
      hideTooltip();
      return;
    }

    const found = chartElements.find(el => {
      // Handle wrap-around case if necessary, but here we drew sequentially
      return angle >= el.startAngle && angle < el.endAngle;
    });

    if (found) {
      showTooltip(e.clientX, e.clientY, `<strong>${found.label}</strong><br>${formatTime(found.value)}`);
    } else {
      hideTooltip();
    }
  };

  canvas.onmouseleave = hideTooltip;
}

function drawFocusGauge(activeMs, passiveMs) {
  const canvas = document.getElementById('trendChart');
  const ctx = canvas.getContext('2d');
  
  // Clear previous listeners
  canvas.onmousemove = null;
  canvas.onmouseleave = null;

  // Handle High DPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 2;
  const centerY = height - 40; // Position near bottom
  const radius = Math.min(width, height) / 1.5;

  ctx.clearRect(0, 0, width, height);

  const total = activeMs + passiveMs;
  const ratio = total > 0 ? activeMs / total : 0;
  const percentage = Math.round(ratio * 100);

  // 1. Background Arc (Gray)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 0); // Semi-circle
  ctx.lineWidth = 30;
  ctx.strokeStyle = '#eeeeee';
  ctx.stroke();

  // 2. Active Arc (Blue)
  ctx.beginPath();
  // Draw from PI (left) to PI + ratio (arch)
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + (ratio * Math.PI));
  ctx.lineWidth = 30;
  ctx.strokeStyle = '#4a90e2';
  ctx.stroke();

  // 3. Text Label
  ctx.fillStyle = '#333';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${percentage}%`, centerX, centerY - 20);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#777';
  ctx.fillText("Focus Score", centerX, centerY + 10);

  // Simple tooltip for gauge
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Simple box check around the gauge
    if (y > centerY - radius && y < centerY && x > centerX - radius && x < centerX + radius) {
      showTooltip(e.clientX, e.clientY, `<strong>Focus Score</strong><br>Active: ${formatTime(activeMs)}<br>Passive: ${formatTime(passiveMs)}`);
    } else {
      hideTooltip();
    }
  };
  canvas.onmouseleave = hideTooltip;
}

function drawTrendChart(trendData) {
  const canvas = document.getElementById('trendChart');
  const ctx = canvas.getContext('2d');
  const chartElements = [];

  // Handle High DPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 30, bottom: 30, left: 40, right: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  // Find max value for Y-axis scaling
  const maxVal = Math.max(...trendData.map(d => d.active + d.passive));
  const yMax = maxVal * 1.1 || 1; // 10% headroom

  const barWidth = (chartWidth / trendData.length) * 0.6;
  const spacing = (chartWidth / trendData.length) * 0.4;

  trendData.forEach((d, i) => {
    const x = padding.left + (i * (barWidth + spacing)) + (spacing / 2);
    
    // Calculate heights
    const activeH = (d.active / yMax) * chartHeight;
    const passiveH = (d.passive / yMax) * chartHeight;
    
    // Draw Passive (Bottom)
    ctx.fillStyle = '#f5a623';
    ctx.fillRect(x, padding.top + chartHeight - passiveH, barWidth, passiveH);

    // Draw Active (Top of Passive)
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(x, padding.top + chartHeight - passiveH - activeH, barWidth, activeH);

    // Draw Date Label
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const date = new Date(d.date);
    const label = date.toLocaleDateString(undefined, { weekday: 'short' });
    ctx.fillText(label, x + barWidth/2, height - 10);

    // Store hit region
    chartElements.push({
      x, y: padding.top, w: barWidth, h: chartHeight,
      data: d,
      dateLabel: date.toLocaleDateString()
    });
  });

  // Draw Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText("Daily Focus", 10, 20);

  // Interaction
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const found = chartElements.find(el => x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h);

    if (found) {
      const d = found.data;
      showTooltip(e.clientX, e.clientY, `<strong>${found.dateLabel}</strong><br>Active: ${formatTime(d.active)}<br>Passive: ${formatTime(d.passive)}`);
    } else {
      hideTooltip();
    }
  };
  canvas.onmouseleave = hideTooltip;
}

function renderLegend(container, data, palette, otherColor) {
  const existing = container.querySelector('.chart-legend');
  if (existing) existing.remove();

  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  Object.assign(legend.style, {
    position: 'absolute',
    top: '10px',
    right: '0',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '11px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    pointerEvents: 'none',
    maxWidth: '120px'
  });

  data.forEach((d, i) => {
    const color = (d.label === 'Others') ? otherColor : palette[i % palette.length];
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', marginBottom: '4px' });
    
    row.innerHTML = `
      <span style="width:10px; height:10px; background:${color}; border-radius:50%; margin-right:6px; flex-shrink:0;"></span>
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.label}</span>
    `;
    legend.appendChild(row);
  });

  container.appendChild(legend);
}

function formatTime(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- Tooltip Helper ---
let tooltipEl = null;
function getTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    Object.assign(tooltipEl.style, {
      position: 'fixed', display: 'none', background: 'rgba(0,0,0,0.85)', color: '#fff',
      padding: '8px 12px', borderRadius: '4px', fontSize: '12px', pointerEvents: 'none', zIndex: '10000',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)', lineHeight: '1.4'
    });
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(x, y, html) {
  const el = getTooltip();
  el.innerHTML = html;
  el.style.display = 'block';
  el.style.left = (x + 10) + 'px';
  el.style.top = (y + 10) + 'px';
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}