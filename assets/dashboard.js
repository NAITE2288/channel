// ============================================================
// 렌더링 로직
// ============================================================

const CATEGORICAL_VARS = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8"];

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmtNum(n) {
  return Math.round(n).toLocaleString("ko-KR");
}

function fmtWon(n) {
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

let STATE = { daily: [], routine: [], master: null, period: "week", activeGroup: null, charts: {} };

async function init() {
  const data = await loadAllData();
  STATE.daily = data.daily;
  STATE.routine = data.routine;
  STATE.master = data.master;
  if (!STATE.master.list.length) STATE.master = normalizeMaster(SAMPLE_MASTER);

  STATE.activeGroup = GROUP_ORDER[0].name;

  document.getElementById("updated-at").textContent =
    "마지막 갱신: " + data.loadedAt.toLocaleString("ko-KR");

  if (data.usingSample) {
    document.getElementById("sample-banner").style.display = "block";
  }

  renderReserveUrgency();
  renderRoutine();
  renderHighlight();
  renderGroupCards();
  renderUpcomingCard();
  setupChartControls();
  renderChart();
  renderTable();

  document.getElementById("refresh-btn").addEventListener("click", async () => {
    document.getElementById("refresh-btn").textContent = "새로고침 중...";
    await init();
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  applyStoredTheme();
}

function applyStoredTheme() {
  const saved = localStorage.getItem("naite-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("naite-theme", next);
  renderChart(); // re-read CSS vars for canvas colors
}

// ---------- 0. 예약발행 큐 추적 (오늘 이후 예약 개수 적은 순, 최상단) ----------
function renderReserveUrgency() {
  const section = document.getElementById("urgency-section");
  const list = buildReserveQueueList(STATE.daily, STATE.master);
  const wrap = document.getElementById("urgency-list");
  wrap.innerHTML = "";

  if (!list.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";

  const urgentCount = list.filter((c) => c.count <= RESERVE_URGENT_THRESHOLD_COUNT).length;
  document.getElementById("urgency-count").textContent = urgentCount
    ? `${urgentCount}개 채널 지금 확인 필요`
    : "모든 채널 예약 여유 있음";

  list.forEach((c) => {
    const style = reserveQueueStyle(c.count);
    const row = document.createElement("div");
    row.className = "urgency-row" + (style.role === "critical" ? " is-critical" : "");
    row.innerHTML = `
      <span class="status-badge" style="background:var(--status-${style.role})">${style.label}</span>
      <span class="u-name">${c.name}</span>
      <span class="u-group">${c.group}</span>
      <span class="u-deadline">${c.lastDate ? "마지막 예약일 " + c.lastDate : "예약 없음"}</span>
    `;
    wrap.appendChild(row);
  });
}

// ---------- 1. 주간 발행 루틴 ----------
function renderRoutine() {
  const week = latestRoutineWeek(STATE.routine);
  const row = document.getElementById("routine-row");
  row.innerHTML = "";
  ROUTINE_ASSIGNED.forEach((sched) => {
    const channelIds = routineDayChannelIds(sched.day);
    const items = channelIds
      .map((channelId) => {
        const ch = STATE.master.byId.get(channelId);
        const checkInfo = week ? week.checks.find((c) => c.day === sched.day && c.channelId === channelId) : null;
        const done = checkInfo ? checkInfo.done : false;
        return `
          <div class="routine-item">
            <span class="ch">${ch ? ch.name : "채널" + channelId}</span>
            <span class="routine-check ${done ? "done" : "pending"}">${done ? "✓" : ""}</span>
          </div>
        `;
      })
      .join("");

    const card = document.createElement("div");
    card.className = "routine-card";
    card.innerHTML = `<div class="day">${sched.day}요일</div>${items}`;
    row.appendChild(card);
  });
  document.getElementById("routine-week-label").textContent = week
    ? `이번 주 (${week.weekStart} 시작)`
    : "루틴 데이터 없음";
}

// ---------- 2. 애드센스 승인 강조 배지 ----------
function renderHighlight() {
  const ch = STATE.master.byId.get(HIGHLIGHT_CHANNEL_ID);
  const statusRaw = latestNonEmpty(STATE.daily, ch ? ch.name : "", "adsenseStatus") || "승인대기";
  const style = ADSENSE_STATUS_STYLE[statusRaw] || ADSENSE_STATUS_STYLE["승인대기"];

  const el = document.getElementById("highlight-card");
  el.innerHTML = `
    <div class="icon" style="background:var(--status-${style.role})">${style.icon}</div>
    <div>
      <div class="title">⭐ 단기 목표 · 애드센스 승인</div>
      <div class="name">${ch ? ch.name : "채널③"}</div>
      <span class="status-badge" style="background:var(--status-${style.role})">${style.label}</span>
    </div>
    <div class="goal">승인되면 채널④와 함께<br/>핵심 수익 채널로 전환</div>
  `;
}

// ---------- 3. 그룹별 요약 카드 ----------
function renderGroupCards() {
  const grid = document.getElementById("group-grid");
  grid.innerHTML = "";
  GROUP_ORDER.forEach((g) => {
    const summary = groupSummary(STATE.daily, STATE.master, g.name, 7);
    const card = document.createElement("div");
    card.className = "group-card";
    card.style.borderTopColor = `var(${CATEGORICAL_VARS[g.slot - 1]})`;
    card.innerHTML = `
      <div class="gname">${g.name} <span style="color:var(--text-muted);font-weight:400;">(${summary.channelCount}개 채널)</span></div>
      <div class="stat-row"><span>게시글수 (7일)</span><b>${fmtNum(summary.posts)}</b></div>
      <div class="stat-row"><span>조회수 (7일)</span><b>${fmtNum(summary.views)}</b></div>
      <div class="stat-row"><span>애드센스 수익 (7일)</span><b>${summary.revenue ? fmtWon(summary.revenue) : "-"}</b></div>
    `;
    grid.appendChild(card);
  });
}

function renderUpcomingCard() {
  const wrap = document.getElementById("upcoming-wrap");
  const ch = STATE.master.byId.get(UPCOMING_GROUP.channelId);
  if (!ch) { wrap.style.display = "none"; return; }
  wrap.innerHTML = `
    <div class="group-card" style="border-top-color:var(--baseline);">
      <div class="gname">${ch.group} <span style="color:var(--text-muted);font-weight:400;">· 운영 예정</span></div>
      <div class="stat-row"><span colspan="2">${ch.name}</span></div>
      <div class="stat-row"><span>${ch.role}</span></div>
    </div>
  `;
}

// ---------- 4. 채널별 추이 그래프 ----------
function setupChartControls() {
  const groupTabs = document.getElementById("group-tabs");
  groupTabs.innerHTML = "";
  GROUP_ORDER.forEach((g) => {
    const btn = document.createElement("button");
    btn.textContent = g.name;
    btn.className = g.name === STATE.activeGroup ? "active" : "";
    btn.addEventListener("click", () => {
      STATE.activeGroup = g.name;
      [...groupTabs.children].forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderChart();
    });
    groupTabs.appendChild(btn);
  });

  const periodSeg = document.getElementById("period-seg");
  [...periodSeg.querySelectorAll("button")].forEach((btn) => {
    btn.addEventListener("click", () => {
      STATE.period = btn.dataset.period;
      [...periodSeg.children].forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderChart();
    });
  });
}

function renderChart() {
  const channels = STATE.master.list.filter((c) => c.group === STATE.activeGroup);
  const agg = aggregateByChannel(STATE.daily, STATE.period);

  // 공통 x축(기간) 수집
  const periodSet = new Set();
  channels.forEach((c) => {
    const m = agg.get(c.name);
    if (m) [...m.keys()].forEach((k) => periodSet.add(k));
  });
  const periods = [...periodSet].sort();

  const legendRow = document.getElementById("chart-legend");
  legendRow.innerHTML = "";

  const datasets = channels.map((c, i) => {
    const varName = CATEGORICAL_VARS[i % CATEGORICAL_VARS.length];
    const color = cssVar(varName);
    const m = agg.get(c.name) || new Map();
    const data = periods.map((p) => (m.get(p) ? m.get(p).views : 0));

    const legendItem = document.createElement("span");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `<span class="legend-swatch" style="background:${color}"></span>${c.name}`;
    legendRow.appendChild(legendItem);

    return {
      label: c.name,
      data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.25,
      fill: false,
    };
  });

  const ctx = document.getElementById("trend-chart").getContext("2d");
  if (STATE.charts.trend) STATE.charts.trend.destroy();

  if (!periods.length) {
    document.getElementById("chart-empty").style.display = "block";
    document.getElementById("trend-chart").style.display = "none";
    return;
  }
  document.getElementById("chart-empty").style.display = "none";
  document.getElementById("trend-chart").style.display = "block";

  STATE.charts.trend = new Chart(ctx, {
    type: "line",
    data: { labels: periods, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          grid: { color: cssVar("--gridline") },
          ticks: { color: cssVar("--text-muted"), font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: cssVar("--gridline") },
          ticks: { color: cssVar("--text-muted"), font: { size: 11 } },
          title: { display: true, text: "조회수/방문자수", color: cssVar("--text-muted") },
        },
      },
    },
  });
}

// ---------- 5. 원본 데이터 테이블(접근성) ----------
function renderTable() {
  const toggle = document.getElementById("table-toggle");
  const wrap = document.getElementById("table-wrap");
  toggle.addEventListener("click", () => {
    const showing = wrap.style.display !== "none";
    wrap.style.display = showing ? "none" : "block";
    toggle.textContent = showing ? "표로 보기" : "표 숨기기";
  });

  const rows = [...STATE.daily].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 200);
  const table = document.getElementById("data-table");
  table.innerHTML = `
    <thead><tr>
      <th>날짜</th><th>채널</th><th>상태</th><th>게시글수</th><th>조회수</th><th>애드센스수익</th><th>승인상태</th><th>비고</th>
    </tr></thead>
    <tbody>
      ${rows
        .map((r) => {
          const ds = DRAFT_STATUS_STYLE[r.status];
          const statusCell = ds
            ? `<span class="status-badge" style="background:var(--status-${ds.role})">${ds.label}</span>`
            : r.status || "-";
          return `<tr>
            <td>${r.date}</td><td>${r.channel}</td><td>${statusCell}</td><td>${r.posts}</td><td>${fmtNum(r.views)}</td>
            <td>${r.adsenseRevenue ? fmtWon(r.adsenseRevenue) : "-"}</td>
            <td>${r.adsenseStatus || "-"}</td><td>${r.note || "-"}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  `;
}

document.addEventListener("DOMContentLoaded", init);
