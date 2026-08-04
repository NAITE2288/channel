// ============================================================
// 데이터 로드 & 가공
// ============================================================

// ------------------------------------------------------------
// Google Sheets 로드: Google Visualization API(gviz)를 JSONP로 호출.
// 일반 CSV export/fetch는 브라우저 CORS 정책에 막히는 경우가 많아
// (Access-Control-Allow-Origin 헤더 미제공) <script> 태그 기반 JSONP를 사용한다.
// 이 방식은 "링크가 있는 사용자에게 공개(뷰어)" 권한만 있으면 동작하며,
// 별도로 "웹에 게시"를 하지 않아도 된다.
// ------------------------------------------------------------

let _gvizCounter = 0;

function loadGvizSheet(gid) {
  return new Promise((resolve, reject) => {
    const cbName = `__gvizCb${_gvizCounter++}`;
    const script = document.createElement("script");

    const cleanup = () => {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("gviz 로드 시간 초과 (gid=" + gid + ")"));
    }, 10000);

    window[cbName] = (json) => {
      cleanup();
      if (!json || !json.table) {
        reject(new Error("gviz 응답 형식 오류 (gid=" + gid + ")"));
        return;
      }
      resolve(json);
    };

    script.src =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
      `?gid=${gid}&headers=1&tqx=out:json;responseHandler:${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("gviz 스크립트 로드 실패 (gid=" + gid + ")"));
    };
    document.head.appendChild(script);
  });
}

// gviz 셀 값 중 날짜 타입은 "Date(2026,7,4)" 형태(월은 0부터 시작)로 오므로 ISO 문자열로 변환
function gvizCellToDateStr(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string" && v.startsWith("Date(")) {
    const m = v.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const y = m[1];
      const mo = String(Number(m[2]) + 1).padStart(2, "0");
      const d = String(Number(m[3])).padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
  }
  return String(v).trim();
}

// gviz table json → 헤더 문자열을 key로 갖는 일반 객체 배열로 변환
function gvizToRows(json, dateFields) {
  const cols = json.table.cols.map((c) => (c.label || c.id || "").trim());
  return json.table.rows.map((r) => {
    const obj = {};
    cols.forEach((label, i) => {
      if (!label) return;
      const cell = r.c[i];
      let v = cell ? cell.v : "";
      if (dateFields && dateFields.has(label)) v = gvizCellToDateStr(v);
      obj[label] = v === null || v === undefined ? "" : v;
    });
    return obj;
  });
}

function isConfigured() {
  return Boolean(SHEET_ID);
}

async function loadAllData() {
  if (!isConfigured()) {
    return {
      daily: normalizeDaily(SAMPLE_DAILY),
      routine: normalizeRoutine(SAMPLE_ROUTINE),
      master: normalizeMaster(SAMPLE_MASTER),
      usingSample: true,
      loadedAt: new Date(),
    };
  }

  try {
    const [dailyJson, routineJson, masterJson] = await Promise.all([
      loadGvizSheet(SHEET_GIDS.daily),
      loadGvizSheet(SHEET_GIDS.routine),
      loadGvizSheet(SHEET_GIDS.master),
    ]);
    const dailyRaw = gvizToRows(dailyJson, new Set(["날짜"]));
    const routineRaw = gvizToRows(routineJson, new Set(["주차시작일"]));
    const masterRaw = gvizToRows(masterJson, new Set(["예약발행마감일"]));

    return {
      daily: normalizeDaily(dailyRaw),
      routine: normalizeRoutine(routineRaw),
      master: normalizeMaster(masterRaw),
      usingSample: false,
      loadedAt: new Date(),
    };
  } catch (err) {
    console.error("시트 로드 실패, 샘플 데이터로 대체합니다.", err);
    return {
      daily: normalizeDaily(SAMPLE_DAILY),
      routine: normalizeRoutine(SAMPLE_ROUTINE),
      master: normalizeMaster(SAMPLE_MASTER),
      usingSample: true,
      loadError: err,
      loadedAt: new Date(),
    };
  }
}

function toNumber(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeMaster(rows) {
  const list = rows
    .map((r) => ({
      id: toNumber(r["채널ID"]),
      name: (r["채널명"] || "").trim(),
      group: (r["그룹"] || "").trim(),
      role: (r["역할설명"] || "").trim(),
      status: (r["상태"] || "운영중").trim(),
      reserveDeadline: (r["예약발행마감일"] || "").trim(),
    }))
    .filter((c) => c.id && c.name);

  const byId = new Map(list.map((c) => [c.id, c]));
  const byName = new Map(list.map((c) => [c.name, c]));
  return { list, byId, byName };
}

function normalizeDaily(rows) {
  return rows
    .map((r) => ({
      date: (r["날짜"] || "").trim(),
      channel: (r["채널"] || "").trim(),
      posts: toNumber(r["게시글수"]),
      views: toNumber(r["조회수"] ?? r["조회수/방문자수"]),
      adsenseRevenue: r["애드센스수익"] === "" || r["애드센스수익"] == null ? null : toNumber(r["애드센스수익"]),
      adsenseStatus: (r["애드센스승인상태"] || "").trim(),
      note: (r["비고"] || "").trim(),
    }))
    .filter((r) => r.date && r.channel);
}

function normalizeRoutine(rows) {
  const truthy = (v) => String(v).trim().toUpperCase() === "TRUE" || String(v).trim() === "1" || String(v).trim() === "✔" || String(v).trim() === "TRUE";
  return rows
    .map((r) => ({
      weekStart: (r["주차시작일"] || "").trim(),
      checks: ROUTINE_SCHEDULE.map((s) => {
        const key = Object.keys(r).find((k) => k.startsWith(s.day));
        return { day: s.day, channelId: s.channelId, done: key ? truthy(r[key]) : false };
      }),
      note: (r["비고"] || "").trim(),
    }))
    .filter((r) => r.weekStart)
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

function isoWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

function monthStart(dateStr) {
  return dateStr.slice(0, 7) + "-01";
}

// period: 'week' | 'month'
function aggregateByChannel(daily, period) {
  const keyFn = period === "month" ? monthStart : isoWeekStart;
  const map = new Map(); // channel -> Map(periodKey -> {posts,views,revenue})
  daily.forEach((r) => {
    const pk = keyFn(r.date);
    if (!map.has(r.channel)) map.set(r.channel, new Map());
    const chMap = map.get(r.channel);
    if (!chMap.has(pk)) chMap.set(pk, { posts: 0, views: 0, revenue: 0 });
    const bucket = chMap.get(pk);
    bucket.posts += r.posts;
    bucket.views += r.views;
    bucket.revenue += r.adsenseRevenue || 0;
  });
  return map;
}

function latestRoutineWeek(routine) {
  return routine.length ? routine[routine.length - 1] : null;
}

function latestNonEmpty(daily, channelName, field) {
  for (let i = daily.length - 1; i >= 0; i--) {
    const r = daily[i];
    if (r.channel === channelName && r[field]) return r[field];
  }
  return "";
}

// 오늘(로컬 자정) 기준 남은 일수. 날짜 미설정이면 null.
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

// 운영중 채널을 "남은 예약일수 적은 순"으로 정렬 (미설정/마감 경과가 최우선)
function buildReserveUrgencyList(master) {
  return master.list
    .filter((c) => c.status === "운영중")
    .map((c) => ({ ...c, daysLeft: daysUntil(c.reserveDeadline) }))
    .sort((a, b) => {
      const av = a.daysLeft === null ? -Infinity : a.daysLeft;
      const bv = b.daysLeft === null ? -Infinity : b.daysLeft;
      return av - bv;
    });
}

function groupSummary(daily, master, groupName, sinceDays = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - sinceDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const channelNames = new Set(master.list.filter((c) => c.group === groupName).map((c) => c.name));
  let posts = 0, views = 0, revenue = 0;
  daily.forEach((r) => {
    if (channelNames.has(r.channel) && r.date >= cutoffStr) {
      posts += r.posts;
      views += r.views;
      revenue += r.adsenseRevenue || 0;
    }
  });
  return { posts, views, revenue, channelCount: channelNames.size };
}
