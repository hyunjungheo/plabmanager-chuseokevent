/**
 * 추석 원정대 이벤트 페이지 조회수 기록 (Google Apps Script)
 *
 * 이 파일은 참고용 사본입니다. 실제 코드는 구글 시트 → 확장 프로그램 → Apps Script에 붙여넣어 씁니다.
 * 설치 순서는 README.md의 "조회수 기록" 참고.
 *
 * - 페이지가 열릴 때마다 {type: 'view', ...}를 POST로 받아 "조회 로그" 탭에 한 줄 추가
 * - setup()을 한 번 실행하면 "조회 로그" / "요약" 탭과 집계 수식을 만들어 줌
 * - 코드 수정 후에는 배포 → 배포 관리 → 새 버전으로 재배포해야 실제 URL에 반영됨
 */

var LOG_SHEET = '조회 로그';
var SUMMARY_SHEET = '요약';
var HEADERS = ['기록 시각', '방문자 ID', '기기', '앱 내 브라우저', '유입 경로', 'utm_source', 'utm_medium', 'utm_campaign', '페이지'];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type !== 'view') return json_({ result: 'ignored' });

    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      getLogSheet_().appendRow([
        new Date(),
        clean_(data.visitorId),
        clean_(data.device),
        clean_(data.inApp),
        clean_(data.referrer),
        clean_(data.utmSource),
        clean_(data.utmMedium),
        clean_(data.utmCampaign),
        clean_(data.path),
      ]);
    } finally {
      lock.releaseLock();
    }
    return json_({ result: 'success' });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  }
}

/** 처음 한 번만 실행: 탭·헤더·집계 수식 생성 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  getLogSheet_();

  var summary = ss.getSheetByName(SUMMARY_SHEET) || ss.insertSheet(SUMMARY_SHEET, 0);
  summary.clear();
  summary.getRange('A1:B2').setValues([
    ['전체 조회수', "=COUNTA('" + LOG_SHEET + "'!A2:A)"],
    ['순방문자 수', "=COUNTUNIQUE('" + LOG_SHEET + "'!B2:B)"],
  ]);
  summary.getRange('A4:C4').setValues([['날짜', '조회수', '순방문자']]);
  summary.getRange('A5').setFormula(
    "=IFERROR(QUERY('" + LOG_SHEET + "'!A2:A, \"select toDate(A), count(A) where A is not null group by toDate(A) label toDate(A) '', count(A) ''\", 0), \"\")"
  );
  summary.getRange('C5').setFormula(
    "=IFERROR(BYROW(A5:A, LAMBDA(d, IF(d=\"\", \"\", COUNTUNIQUE(FILTER('" + LOG_SHEET + "'!B2:B, INT('" + LOG_SHEET + "'!A2:A)=d))))), \"\")"
  );
  summary.getRange('A1:A2').setFontWeight('bold');
  summary.getRange('A4:C4').setFontWeight('bold');
  summary.getRange('A5:A').setNumberFormat('yyyy-mm-dd');
}

function getLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  return sheet;
}

/** 길이 제한 + 시트 수식으로 해석되지 않게 앞글자 이스케이프 */
function clean_(value) {
  var s = String(value == null ? '' : value).slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
