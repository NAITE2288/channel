// ============================================================
// 미리보기용 샘플 데이터
// config.js 의 CSV_URLS 가 비어 있을 때만 사용됩니다.
// 실제 운영 시에는 Google Sheets 게시 CSV 로 자동 대체됩니다.
// ============================================================

function generateSampleDaily() {
  const channels = CHANNEL_META_FALLBACK.filter((c) => c.status === "운영중");
  const today = new Date("2026-08-04");
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
  return rows;
}

function generateSampleRoutine() {
  const today = new Date("2026-08-04");
  const rows = [];
  for (let w = 3; w >= 0; w--) {
    const monday = new Date(today);
    const day = monday.getDay();
    const diffToMonday = (day + 6) % 7;
    monday.setDate(monday.getDate() - diffToMonday - w * 7);
    const weekStr = monday.toISOString().slice(0, 10);
    rows.push({
      주차시작일: weekStr,
      "월(④)": w === 0 ? "TRUE" : "TRUE",
      "화(③)": w === 0 ? "FALSE" : "TRUE",
      "수(②)": w === 0 ? "TRUE" : "TRUE",
      "목(④)": w === 0 ? "FALSE" : "TRUE",
      "금(①)": w === 0 ? "FALSE" : "TRUE",
      비고: "",
    });
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
  예약발행마감일: c.reserveDeadline,
}));
