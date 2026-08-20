/**
 * NAITE 초안 작성 로그 폼 → 일별데이터 탭 자동 전송
 *
 * 설치 방법:
 * 1. 이 폼("NAITE 초안 작성 로그")의 응답이 쌓이는 스프레드시트를 여세요.
 *    (폼 편집 화면 상단 "응답" 탭 → 초록 스프레드시트 아이콘 클릭하면 열립니다)
 * 2. 메뉴 [확장 프로그램] → [Apps Script] 클릭
 * 3. 기본으로 열려있는 코드를 전부 지우고, 이 파일 내용 전체를 붙여넣기
 * 4. 저장 (Ctrl+S 또는 저장 아이콘)
 * 5. 왼쪽 메뉴에서 시계 모양 "트리거" 아이콘 클릭 → 우측 하단 "트리거 추가"
 *    - 실행할 함수: onFormSubmitToDaily
 *    - 이벤트 소스: 스프레드시트에서
 *    - 이벤트 유형: 양식 제출 시
 *    → 저장 시 구글 계정 권한 승인 창이 뜨면 "고급" → "이동(안전하지 않음)" → 허용
 * 6. 설치 후 폼에 테스트로 하나 제출해보고, 대시보드가 읽는 시트의
 *    `일별데이터` 탭에 행이 잘 추가되는지 확인하세요.
 *
 * 주의: 일별데이터 탭 컬럼 순서는 반드시
 * 날짜, 채널, 상태, 게시글수, 조회수, 애드센스수익, 애드센스승인상태, 비고
 * 순이어야 합니다 (C열에 "상태" 컬럼이 삽입되어 있어야 함).
 */

// 대시보드가 읽는 대상 스프레드시트 ID (config.js의 SHEET_ID와 동일)
const TARGET_SHEET_ID = "1OT_DbYspkfbtNzYS-673GPZBy2-8VUgXGXyej9rPbSA";
const TARGET_TAB_NAME = "일별데이터";

// 폼 질문 제목 (구글 폼에서 만든 질문과 정확히 일치해야 합니다)
const Q_DATE = "날짜";
const Q_CHANNEL = "채널";
const Q_STATUS = "상태";
const Q_NOTE = "비고";

// 폼 드롭다운은 사람이 알아보기 쉬운 라벨(핸들 포함)을 쓰고,
// 여기서 채널마스터 탭의 정식 채널명으로 변환해줍니다.
// 폼의 "채널" 옵션을 바꾸면 이 매핑도 함께 수정하세요.
const CHANNEL_MAP = {
  "네이버1(actor0204)": "네이버①",
  "네이버2(actor2288)": "네이버②",
  "티스토리(naite_growth)": "티스토리③",
  "티스토리(dalnim2288)": "티스토리④",
  "쓰레드": "스레드⑤",
  "인스타": "인스타⑥ (@naite.46)",
  "카카오채널": "카카오⑦",
  "크몽": "크몽⑧",
  "리틀리": "리틀리⑨",
};

function onFormSubmitToDaily(e) {
  try {
    const responses = e.namedValues; // { "질문제목": ["답변"] } 형태

    const rawDate = getAnswer(responses, Q_DATE);
    const rawChannel = getAnswer(responses, Q_CHANNEL);
    const channel = CHANNEL_MAP[rawChannel] || rawChannel; // 매핑에 없으면 원본 그대로(수동 확인 필요)
    const status = getAnswer(responses, Q_STATUS);
    const note = getAnswer(responses, Q_NOTE);

    const dateStr = formatDate(rawDate);

    const targetSheet = SpreadsheetApp.openById(TARGET_SHEET_ID).getSheetByName(TARGET_TAB_NAME);
    if (!targetSheet) {
      throw new Error(`'${TARGET_TAB_NAME}' 탭을 대상 스프레드시트에서 찾을 수 없습니다.`);
    }

    // 일별데이터 탭 컬럼 순서: 날짜, 채널, 상태, 게시글수, 조회수, 애드센스수익, 애드센스승인상태, 비고
    targetSheet.appendRow([
      dateStr,
      channel,
      status,
      1,     // 게시글수: 초안 1건 고정
      "",    // 조회수: 수동 입력 영역이라 비워둠
      "",    // 애드센스수익: 수동 입력 영역이라 비워둠
      "",    // 애드센스승인상태: 수동 입력 영역이라 비워둠
      note,  // 비고: 관리자 편집 링크 등
    ]);
  } catch (err) {
    // 실패하더라도 폼 응답 자체는 이미 저장되어 있으므로, 에러 로그만 남깁니다.
    Logger.log("onFormSubmitToDaily 오류: " + err.message);
  }
}

function getAnswer(namedValues, questionTitle) {
  const v = namedValues[questionTitle];
  return v && v.length ? String(v[0]).trim() : "";
}

// 폼의 "날짜" 질문은 MM/DD/YYYY 형태 문자열로 들어오는 경우가 있어 YYYY-MM-DD로 통일
function formatDate(raw) {
  if (!raw) return "";
  // 이미 YYYY-MM-DD 형태면 그대로 사용
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return raw; // 형식이 다르면 원본 그대로 (수동 확인 필요)
}

/**
 * 트리거 설치 전, 수동으로 한 번 테스트해보고 싶다면 이 함수를 실행하세요.
 * (Apps Script 편집기 상단 함수 선택 드롭다운에서 testRun 선택 후 ▶ 실행)
 */
function testRun() {
  const fakeEvent = {
    namedValues: {
      "날짜": ["08/19/2026"],
      "채널": ["티스토리③"],
      "상태": ["초안대기"],
      "비고": ["https://naite-growth.tistory.com/manage/post/999"],
    },
  };
  onFormSubmitToDaily(fakeEvent);
}
