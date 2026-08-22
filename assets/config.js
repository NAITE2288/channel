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
const CHANNEL_META_FALLBACK = [
  { id: 1, name: "네이버①", group: "강사·전문", role: "강사 브랜딩", status: "운영중" },
  { id: 2, name: "네이버②", group: "도서리뷰", role: "도서 수수료", status: "운영중" },
  { id: 3, name: "티스토리③", group: "재테크", role: "애드센스 승인대기", status: "운영중" },
  { id: 4, name: "티스토리④", group: "강사·전문", role: "애드센스 승인완료·핵심수익", status: "운영중" },
  { id: 5, name: "스레드⑤", group: "재테크", role: "매일 자동운영", status: "운영중" },
  { id: 6, name: "인스타⑥ (@naite.46)", group: "브랜딩", role: "미시작 · 릴스 업로드 시작 예정 (목표 주 1~2개)", status: "미시작" },
  { id: 7, name: "카카오⑦", group: "강사·전문", role: "소식지", status: "운영중" },
  { id: 8, name: "크몽⑧", group: "강사·전문", role: "전자책+첨삭", status: "운영중" },
  { id: 9, name: "리틀리⑨", group: "강사·전문", role: "전자책", status: "운영중" },
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

// 일별데이터.상태 (초안 작성 로그 폼에서 자동 전송) → 배지 색상
const DRAFT_STATUS_STYLE = {
  "초안대기": { role: "warning", label: "초안대기" },
  "예약발행완료": { role: "good", label: "예약발행완료" },
  "발행완료": { role: "good", label: "발행완료" },
};

// 예약발행 큐를 추적하는 상태값 (폼 "상태" 드롭다운의 값과 정확히 일치해야 함)
const RESERVE_QUEUE_STATUS = "예약발행완료";

// 주간 발행 루틴
// dailyAlways: 요일 상관없이 매일 체크가 필요한 채널(1일1포스팅 예약발행 등)
// assigned: 요일별로 추가로 담당하는 채널 (dailyAlways와 겹치면 중복 표시 안 함)
const ROUTINE_DAILY_ALWAYS = [3, 4];
const ROUTINE_ASSIGNED = [
  { day: "월", channelId: 4 },
  { day: "화", channelId: 3 },
  { day: "수", channelId: 2 },
  { day: "목", channelId: 4 },
  { day: "금", channelId: 1 },
];

// 채널ID → 원문자 숫자 (시트 컬럼 헤더 "요일(숫자)" 조합에 사용)
const CHANNEL_NUMERAL = { 1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤", 6: "⑥", 7: "⑦", 8: "⑧", 9: "⑨" };

function routineDayChannelIds(day) {
  const assigned = ROUTINE_ASSIGNED.find((d) => d.day === day)?.channelId;
  const ids = [...ROUTINE_DAILY_ALWAYS];
  if (assigned && !ids.includes(assigned)) ids.unshift(assigned);
  return ids;
}

function routineHeaderFor(day, channelId) {
  return `${day}(${CHANNEL_NUMERAL[channelId]})`;
}

// 특별히 강조할 채널(애드센스 승인 단기 목표)
const HIGHLIGHT_CHANNEL_ID = 3;

// 예약발행 큐 추적에서 제외할 채널 ID (해당 채널은 1일1포스팅 예약발행 방식을 쓰지 않음)
const RESERVE_QUEUE_EXCLUDED_IDS = [1];

// 예약 큐 경고 기준: 오늘 이후로 예약된 포스팅 개수가 이 값 이하면 경고 배지
const RESERVE_URGENT_THRESHOLD_COUNT = 3;
const RESERVE_WARNING_THRESHOLD_COUNT = 7;

function reserveQueueStyle(count) {
  const label = `${count}개`;
  if (count <= RESERVE_URGENT_THRESHOLD_COUNT) return { role: "critical", label };
  if (count <= RESERVE_WARNING_THRESHOLD_COUNT) return { role: "warning", label };
  return { role: "good", label };
}
