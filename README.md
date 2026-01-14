# Focus Ledger

A quiet mirror for your attention.

Focus Ledger is a privacy-first Chrome extension that tracks how you spend time on the web — separating Active and Passive usage — and transforms it into meaningful, visual insights.

- No accounts.
- No servers.
- No tracking.
- Everything runs 100% locally.

## Why Focus Ledger?

Most trackers only tell you how long you were online. Focus Ledger tells you *how* you were online.

It answers:

- Were you actually working or just watching?
- Which sites had your real attention?
- Where did your time quietly disappear?

## Features

### Active vs Passive Tracking

Every website is measured in two dimensions:

- **Active Time** — scrolling, typing, clicking
- **Passive Time** — watching, reading, background tabs

This reveals whether a site was productive focus or idle consumption.

### Daily Popup 

<img width="432" height="340" alt="image" src="https://github.com/user-attachments/assets/298471e1-b465-43fd-8037-b95030efc833" />

The popup gives you an instant snapshot:

- Ranked websites by time
- Color-coded bars for Active vs Passive
- Precise minutes per site

### Analytics Dashboard 

<img width="1895" height="1026" alt="image" src="https://github.com/user-attachments/assets/b641350f-b9ec-49ad-8732-b3082eaf93b1" />


Your full attention command center.

#### Flexible Date Ranges

Analyze your usage by:

- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- Custom date range (pick any start and end date)

Perfect for work weeks, project sprints, or habit tracking.

#### Summary Cards

At the top:

- Total Active Time
- Total Passive Time
- Total Screen Time

These update instantly based on the selected range.

#### Smart Insights

Focus Ledger automatically interprets your activity:

| Status          | Meaning            |
| --------------- | ------------------ |
| **High Focus**  | Active time > 75%  |
| **Balanced Flow** | Active 25–75%      |
| **Passive Mode**  | Active < 25%       |

It also highlights:

- Your top website
- Whether it was productive or distracting

#### Visual Analytics

All charts are drawn using native HTML5 Canvas — no libraries, no tracking.

- **Adaptive Trend Chart**:
  - Single day → Focus Gauge (how engaged you were)
  - Multiple days → Stacked bars showing Active vs Passive per day
- **Usage Distribution**: A donut chart shows:
  - Top 5 websites
  - Everything else grouped as “Others”
  - Hover to see exact time values.

#### Detailed Site Breakdown

Every website includes:

- Favicon & domain
- Total time
- Active vs Passive bar
- Sorted by usage
- Small or insignificant entries are automatically hidden to reduce noise.

## Your Data, Your Rules

Focus Ledger never sends anything anywhere.

- No APIs
- No servers
- No cloud
- No tracking

Everything lives inside `chrome.storage.local`.

You can:

- Export all data as CSV (for Excel, Sheets, or analytics)
- Delete all data instantly with one click

You are always in full control.

## Installation (Developer Mode)

Until this is on the Chrome Web Store:

1.  Clone or download this repository.
2.  Open Chrome and go to `chrome://extensions`.
3.  Enable **Developer Mode** (top right).
4.  Click **Load Unpacked**.
5.  Select the project folder.

The extension will now appear in your browser.

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript
- HTML5 Canvas
- CSS Grid & Flexbox
- `chrome.tabs`, `chrome.idle`, `chrome.storage`
- No external dependencies.

## Data Model

```
Date
 └── Domain
      ├── activeMs
      └── passiveMs
```

All data is stored locally per day.

## Roadmap

Planned features:

- Weekly & monthly comparison
- Trend analysis
- Focus streaks
- Distraction detection
- Dark mode
- Export to JSON
- PWA dashboard

## Contributing

Pull requests are welcome.

You can help by:

- Improving UI/UX
- Adding visualizations
- Optimizing performance
- Enhancing insights
- Improving accessibility

## License

MIT License — free to use, modify, and share.

## Philosophy

> You don’t manage time.
> You manage attention.

Focus Ledger exists to make your digital life visible — quietly, honestly, and privately.
