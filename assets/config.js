// ============================================================
// NAITE 채널 대시보드 설정
// ============================================================
// 1) 스프레드시트 공유 설정을 "링크가 있는 모든 사용자 - 뷰어"로 켜두세요.
//    ("웹에 게시"는 필요 없습니다 - CORS 문제로 gviz API를 대신 사용합니다)
// 2) 아래 SHEET_ID에 스프레드시트 URL의 /d/ 와 /edit 사이 긴 문자열을 넣으세요.
// 3) 각 탭을 클릭했을 때 주소창에 뜨는 #gid=숫자 값을 SHEET_GIDS에 넣으세요.
// 4) SHEET_ID가 비어 있으면 assets/sample-data.js 의 샘플 데이터로 동작합니다.
// ============================================================

const SHEET_ID = "1OT_DbYspkfbtNzYS-673GPZBy2-8VUgXGXyej9rPbSA";
const SHEET_GIDS = {
  daily: 0,           // 탭: 일별데이터
  routine: 429150204, // 탭: 주간루틴
  master: 15164149,   // 탭: 채널마스터
};

// 채널마스터 탭이 아직 게시되지 않았을 때 쓰는 기본값(폴백).
// 실제 시트의 "채널마스터" 탭 내용과 동일하게 유지하세요.
// reserveDeadline: 예약발행마감일(YYYY-MM-DD). 예약 포스팅을 올릴 때마다 이 값을 갱신하세요.
const CHANNEL_META_FALLBACK = [
  { id: 1, name: "네이버①", group: "강사·전문", role: "강사 브랜딩", status: "운영중", reserveDeadline: "2026-08-10" },
  { id: 2, name: "네이버②", group: "도서리뷰", role: "도서 수수료", status: "운영중", reserveDeadline: "2026-08-05" },
  { id: 3, name: "티스토리③", group: "재테크", role: "애드센스 승인대기", status: "운영중", reserveDeadline: "2026-08-06" },
  { id: 4, name: "티스토리④", group: "강사·전문", role: "애드센스 승인완료·핵심수익", status: "운영중", reserveDeadline: "2026-08-20" },
  { id: 5, name: "스레드⑤", group: "재테크", role: "매일 자동운영", status: "운영중", reserveDeadline: "2026-08-04" },
  { id: 6, name: "인스타⑥ (@naite.46)", group: "브랜딩", role: "미시작 · 릴스 업로드 시작 예정 (목표 주 1~2개)", status: "미시작", reserveDeadline: "" },
  { id: 7, name: "카카오⑦", group: "강사·전문", role: "소식지", status: "운영중", reserveDeadline: "" },
  { id: 8, name: "크몽⑧", group: "강사·전문", role: "전자책+첨삭", status: "운영중", reserveDeadline: "2026-08-09" },
  { id: 9, name: "리틀리⑨", group: "강사·전문", role: "전자책", status: "운영중", reserveDeadline: "2026-08-07" },
];

// 그룹 표시 순서 + 팔레트 슬롯(카테고리 컬러 고정 순서: 1=blue, 2=orange, 3=aqua)
// "브랜딩" 그룹(채널⑥)은 운영 예정 단계라 정식 요약 카드 3종에는 포함하지 않고,
// 별도의 "준비중" 카드로만 표시합니다 (dashboard.js 참고).
const GROUP_ORDER = [
  { name: "강사·전문", slot: 1 },
  { name: "재테크", slot: 2 },
  { name: "도서리뷰", slot: 3 },
];

const UPCOMING_GROUP = { name: "브랜딩", channelId: 6 };

// 애드센스 승인상태 → 상태 색상 role (status palette, 고정)
const ADSENSE_STATUS_STYLE = {
  "승인완료": { role: "good", label: "승인완료", icon: "✓" },
  "심사중": { role: "serious", label: "심사중", icon: "●" },
  "승인대기": { role: "warning", label: "승인대기", icon: "!" },
  "반려": { role: "critical", label: "반려", icon: "✕" },
};

// 주간 발행 루틴: 요일 → 담당 채널 ID
const ROUTINE_SCHEDULE = [
  { day: "월", channelId: 4 },
  { day: "화", channelId: 3 },
  { day: "수", channelId: 2 },
  { day: "목", channelId: 4 },
  { day: "금", channelId: 1 },
];

// 특별히 강조할 채널(애드센스 승인 단기 목표)
const HIGHLIGHT_CHANNEL_ID = 3;

// 예약 소진(D-day) 경고 기준. 남은 일수가 이 값 이하 또는 마감일 미설정/경과 시 빨간 경고 배지.
const RESERVE_URGENT_THRESHOLD_DAYS = 3;
const RESERVE_WARNING_THRESHOLD_DAYS = 7;

function reserveUrgencyStyle(daysLeft) {
  if (daysLeft === null || daysLeft <= RESERVE_URGENT_THRESHOLD_DAYS) {
    return { role: "critical", label: daysLeft === null ? "마감일 미설정" : daysLeft < 0 ? `D+${-daysLeft} 지연` : `D-${daysLeft}` };
  }
  if (daysLeft <= RESERVE_WARNING_THRESHOLD_DAYS) {
    return { role: "warning", label: `D-${daysLeft}` };
  }
  return { role: "good", label: `D-${daysLeft}` };
}
