// ============================================================
// 미리보기용 샘플 데이터
// config.js 의 CSV_URLS 가 비어 있을 때만 사용됩니다.
// 실제 운영 시에는 Google Sheets 게시 CSV 로 자동 대체됩니다.
// ============================================================

function generateSampleDaily() {
  const channels = CHANNEL_META_FALLBACK.filter((c) => c.status === "운영중");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let d = 27; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    const dow = date.getDay(); // 0=Sun

    channels.forEach((ch) => {
      // 채널별로 대략적인 발행 요일 패턴을 흉내 (완전 랜덤 대신 약간의 리듬)
      const publishes = rand() > 0.45 || ch.id === 5; // 스레드는 매일
      if (!publishes) return;

      const baseViews = { 1: 180, 2: 90, 3: 40, 4: 260, 5: 520, 7: 60, 8: 30, 9: 25 }[ch.id] || 50;
      const growth = 1 + (27 - d) * 0.01;
      const views = Math.round(baseViews * growth * (0.7 + rand() * 0.6));
      const posts = 1 + (rand() > 0.8 ? 1 : 0);

      const row = {
        날짜: dateStr,
        채널: ch.name,
        상태: "발행완료",
        게시글수: posts,
        조회수: views,
        애드센스수익: "",
        애드센스승인상태: "",
        비고: "",
        예약발행일: "",
      };

      if (ch.id === 4) {
        row.애드센스수익 = Math.round(views * (2.2 + rand() * 1.8));
      }
      if (ch.id === 3) {
        row.애드센스승인상태 = d > 10 ? "승인대기" : d > 4 ? "심사중" : "승인대기";
      }

      rows.push(row);
    });
  }

  // 예약발행 큐 샘플: 채널③④는 1일1포스팅 예약발행, 나머지 일부 채널도 예약 큐를 조금 보유
  const reserveDepth = { 2: 1, 3: 2, 4: 12, 5: 0, 7: 0, 8: 5, 9: 3 };
  Object.entries(reserveDepth).forEach(([id, count]) => {
    const ch = channels.find((c) => c.id === Number(id));
    if (!ch) return;
    for (let i = 1; i <= count; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      rows.push({
        날짜: today.toISOString().slice(0, 10),
        채널: ch.name,
        상태: "예약발행완료",
        게시글수: "",
        조회수: "",
        애드센스수익: "",
        애드센스승인상태: "",
        비고: "",
        예약발행일: d.toISOString().slice(0, 10),
      });
    }
  });

  return rows;
}

function generateSampleRoutine() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (let w = 3; w >= 0; w--) {
    const monday = new Date(today);
    const day = monday.getDay();
    const diffToMonday = (day + 6) % 7;
    monday.setDate(monday.getDate() - diffToMonday - w * 7);
    const weekStr = monday.toISOString().slice(0, 10);
    const done = w !== 0; // 이번 주(w=0)만 일부 미완료로 표시
    const row = { 주차시작일: weekStr, 비고: "" };
    ROUTINE_ASSIGNED.forEach((s) => {
      routineDayChannelIds(s.day).forEach((channelId) => {
        row[routineHeaderFor(s.day, channelId)] = done ? "TRUE" : (channelId === 4 || channelId === 1 ? "FALSE" : "TRUE");
      });
    });
    rows.push(row);
  }
  return rows;
}

const SAMPLE_DAILY = generateSampleDaily();
const SAMPLE_ROUTINE = generateSampleRoutine();
const SAMPLE_MASTER = CHANNEL_META_FALLBACK.map((c) => ({
  채널ID: c.id,
  채널명: c.name,
  그룹: c.group,
  역할설명: c.role,
  상태: c.status,
}));
