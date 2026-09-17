/**
 * 추석 원정대 이벤트 페이지 조회수 기록 (Google Apps Script)
 *
 * 이 파일은 참고용 사본입니다. 실제 코드는 구글 시트 → 확장 프로그램 → Apps Script에 붙여넣어 씁니다.
 * 설치 순서는 README.md의 "조회수 기록" 참고.
 *
 * - 페이지가 열릴 때마다 {type: 'view', ...}를 POST로 받아 "조회 로그" 탭에 한 줄 추가
 * - setup()을 한 번 실행하면 "조회 로그" / "요약" 탭과 집계 수식을 만들어 줌
 * - setupDashboard()를 실행하면 "조회 로그" 옆에 "일별 대시보드" 탭(핵심 숫자·그래프·일별 표)을 만들어 줌
 *   (다시 실행하면 대시보드 탭만 지우고 새로 그림. 조회 로그 데이터는 건드리지 않음)
 * - doPost 코드 수정 후에는 배포 → 배포 관리 → 새 버전으로 재배포해야 실제 URL에 반영됨
 *   (setupDashboard는 편집기에서 직접 실행하는 함수라 재배포가 필요 없음)
 */

var LOG_SHEET = '조회 로그';
var SUMMARY_SHEET = '요약';
var DASHBOARD_SHEET = '일별 대시보드';
var DASHBOARD_START = '2026-09-17'; // 일별 표 시작일 (시트의 B2 칸에서도 바꿀 수 있음)
var DASHBOARD_DAYS = 30;            // 일별 표에 보여줄 일수 (바꾸면 setupDashboard 다시 실행)
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

  var L = "'" + LOG_SHEET + "'!";
  var ROWS = L + 'A2:A,"<>"';                        // 실제 기록이 있는 행
  var APP = L + 'F2:F,""';                           // 앱 배너 = utm 없음
  var KAKAO = L + 'F2:F,"kakao",' + L + 'G2:G,"alimtalk"'; // 알림톡

  var summary = ss.getSheetByName(SUMMARY_SHEET) || ss.insertSheet(SUMMARY_SHEET, 0);
  summary.clear();
  summary.getRange('A1:B2').setValues([
    ['전체 조회수', '=COUNTA(' + L + 'A2:A)'],
    ['순방문자 수', '=COUNTUNIQUE(' + L + 'B2:B)'],
  ]);

  // 유입 채널별 (앱 배너 = utm 없음 / 알림톡 = utm_source=kakao & utm_medium=alimtalk / 기타 = 그 외 utm)
  summary.getRange('A4:D4').setValues([['유입 채널', '조회수', '순방문자', '비중']]);
  summary.getRange('A5:D7').setValues([
    ['앱 배너 (utm 없음)', '=COUNTIFS(' + ROWS + ',' + APP + ')', '=COUNTUNIQUEIFS(' + L + 'B2:B,' + ROWS + ',' + APP + ')', '=IFERROR(B5/$B$1,0)'],
    ['알림톡', '=COUNTIFS(' + ROWS + ',' + KAKAO + ')', '=COUNTUNIQUEIFS(' + L + 'B2:B,' + ROWS + ',' + KAKAO + ')', '=IFERROR(B6/$B$1,0)'],
    ['기타 (그 외 utm)', '=B1-B5-B6',
      '=IFERROR(COUNTUNIQUE(FILTER(' + L + 'B2:B,' + L + 'A2:A<>"",' + L + 'F2:F<>"",NOT((LOWER(' + L + 'F2:F)="kakao")*(LOWER(' + L + 'G2:G)="alimtalk")))),0)',
      '=IFERROR(B7/$B$1,0)'],
  ]);
  summary.getRange('D5:D7').setNumberFormat('0.0%');

  // 일별 (채널별 조회수 포함)
  summary.getRange('A9:F9').setValues([['날짜', '조회수', '순방문자', '앱 배너', '알림톡', '기타']]);
  summary.getRange('A10').setFormula(
    '=IFERROR(QUERY(' + L + 'A2:A, "select toDate(A), count(A) where A is not null group by toDate(A) label toDate(A) \'\', count(A) \'\'", 0), "")'
  );
  var DAY = L + 'A2:A,">="&d,' + L + 'A2:A,"<"&d+1';
  summary.getRange('C10').setFormula(
    '=IFERROR(BYROW(A10:A, LAMBDA(d, IF(d="", "", COUNTUNIQUE(FILTER(' + L + 'B2:B, INT(' + L + 'A2:A)=d))))), "")'
  );
  summary.getRange('D10').setFormula(
    '=IFERROR(BYROW(A10:A, LAMBDA(d, IF(d="", "", COUNTIFS(' + DAY + ',' + APP + ')))), "")'
  );
  summary.getRange('E10').setFormula(
    '=IFERROR(BYROW(A10:A, LAMBDA(d, IF(d="", "", COUNTIFS(' + DAY + ',' + KAKAO + ')))), "")'
  );
  summary.getRange('F10').setFormula(
    '=IFERROR(BYROW(A10:A, LAMBDA(d, IF(d="", "", COUNTIFS(' + DAY + ') - COUNTIFS(' + DAY + ',' + APP + ') - COUNTIFS(' + DAY + ',' + KAKAO + ')))), "")'
  );

  summary.getRange('A1:A2').setFontWeight('bold');
  summary.getRange('A4:D4').setFontWeight('bold').setBackground('#F5F7FA');
  summary.getRange('A9:F9').setFontWeight('bold').setBackground('#F5F7FA');
  summary.getRange('A10:A').setNumberFormat('yyyy-mm-dd');
  summary.setColumnWidth(1, 150);
}

/** "조회 로그" 옆에 일별 대시보드 탭 생성 (다시 실행하면 새로 그림) */
function setupDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  var log = getLogSheet_();

  var sh = ss.getSheetByName(DASHBOARD_SHEET);
  if (sh) {
    sh.getCharts().forEach(function (c) { sh.removeChart(c); });
    sh.getBandings().forEach(function (b) { b.remove(); });
    sh.clearConditionalFormatRules();
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
    sh.clear();
  } else {
    sh = ss.insertSheet(DASHBOARD_SHEET, log.getIndex()); // 조회 로그 바로 오른쪽
  }
  sh.setHiddenGridlines(true);

  var L = "'" + LOG_SHEET + "'!";
  var YELLOW = '#FFDC44';
  var NAVY = '#0A1A2D';
  var SUB = '#1E3550';
  var GREY = '#B8C4D4';
  var PALE = '#F5F7FA';
  var DAYS = DASHBOARD_DAYS;
  var HDR = 59;
  var FIRST = HDR + 1;
  var LAST = FIRST + DAYS - 1;
  var BCOL = 'B' + FIRST + ':B' + LAST;
  var ACOL = 'A' + FIRST + ':A' + LAST;

  sh.setColumnWidths(1, 12, 100);
  sh.setColumnWidth(13, 24);
  sh.setColumnWidth(14, 160);
  sh.setColumnWidth(15, 80);

  // 제목 · 설정
  sh.getRange('A1:L1').merge()
    .setValue('추석 원정대 · 일별 조회 대시보드')
    .setFontSize(18).setFontWeight('bold').setFontColor('#FFFFFF')
    .setBackground(NAVY).setVerticalAlignment('middle');
  sh.setRowHeight(1, 44);
  sh.getRange('A2').setValue('집계 시작일').setFontWeight('bold');
  sh.getRange('B2').setValue(parseDate_(DASHBOARD_START))
    .setNumberFormat('yyyy-mm-dd').setBackground('#FFF3B0');
  sh.getRange('C2:L2').merge()
    .setValue('조회가 쌓이면 자동으로 갱신돼요 · 노란 칸(시작일)을 바꾸면 표와 그래프 날짜가 함께 바뀌어요')
    .setFontColor('#6B7684');

  // 핵심 숫자 5개 (2칸씩 병합)
  var today = L + 'A:A,">="&TODAY(),' + L + 'A:A,"<"&TODAY()+1';
  var yesterday = L + 'A:A,">="&(TODAY()-1),' + L + 'A:A,"<"&TODAY()';
  var kpis = [
    ['전체 조회수', '=COUNTA(' + L + 'A2:A)'],
    ['순방문자', '=COUNTUNIQUE(' + L + 'B2:B)'],
    ['오늘 조회수', '=COUNTIFS(' + today + ')'],
    ['어제 조회수', '=COUNTIFS(' + yesterday + ')'],
    ['최고 조회일', '=IF(MAX(' + BCOL + ')=0,"-",TEXT(INDEX(' + ACOL + ',MATCH(MAX(' + BCOL + '),' + BCOL + ',0)),"m/d")&" · "&MAX(' + BCOL + ')&"회")'],
  ];
  kpis.forEach(function (k, i) {
    var col = 1 + i * 2;
    sh.getRange(4, col, 1, 2).merge().setValue(k[0])
      .setFontColor('#6B7684').setFontWeight('bold')
      .setBackground(PALE).setHorizontalAlignment('center');
    sh.getRange(5, col, 1, 2).merge().setFormula(k[1])
      .setFontSize(20).setFontWeight('bold').setFontColor(NAVY)
      .setBackground(PALE).setHorizontalAlignment('center').setVerticalAlignment('middle');
  });
  sh.setRowHeight(5, 48);

  // 일별 표
  sh.getRange(HDR - 1, 1, 1, 9).merge().setValue('일별 기록').setFontSize(13).setFontWeight('bold');
  sh.getRange(HDR, 1, 1, 9)
    .setValues([['날짜', '조회수', '순방문자', 'iOS', 'Android', '기타', '카카오톡', '누적 조회수', '추이']])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground(SUB).setHorizontalAlignment('center');

  var rows = [];
  for (var r = FIRST; r <= LAST; r++) {
    var day = L + 'A:A,">="&$A' + r + ',' + L + 'A:A,"<"&$A' + r + '+1';
    rows.push([
      r === FIRST ? '=$B$2' : '=A' + (r - 1) + '+1',
      '=COUNTIFS(' + day + ')',
      '=COUNTUNIQUEIFS(' + L + 'B:B,' + day + ')',
      '=COUNTIFS(' + day + ',' + L + 'C:C,"iOS")',
      '=COUNTIFS(' + day + ',' + L + 'C:C,"Android")',
      '=COUNTIFS(' + day + ',' + L + 'C:C,"기타")',
      '=COUNTIFS(' + day + ',' + L + 'D:D,"KAKAOTALK")',
      r === FIRST ? '=B' + r : '=H' + (r - 1) + '+B' + r,
      '=SPARKLINE(B' + r + ',{"charttype","bar";"max",MAX($B$' + FIRST + ':$B$' + LAST + ')+0.0001;"color1","' + YELLOW + '"})',
    ]);
  }
  var body = sh.getRange(FIRST, 1, DAYS, 9);
  body.setFormulas(rows).setHorizontalAlignment('center');
  sh.getRange(FIRST, 1, DAYS, 1).setNumberFormat('m"월" d"일" (ddd)');
  sh.getRange(FIRST, 2, DAYS, 7).setNumberFormat('#,##0');
  body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A' + FIRST + '=TODAY()')
      .setBackground('#FFF3B0').setBold(true)
      .setRanges([body])
      .build(),
  ]);

  // 그래프용 집계 (오른쪽 N:O)
  sh.getRange('N4:O4').setValues([['기기', '조회수']]).setFontWeight('bold').setBackground(PALE);
  sh.getRange('N5:O7').setValues([
    ['iOS', '=COUNTIF(' + L + 'C:C,"iOS")'],
    ['Android', '=COUNTIF(' + L + 'C:C,"Android")'],
    ['기타', '=COUNTIF(' + L + 'C:C,"기타")'],
  ]);

  // 유입 채널: 앱 배너 = utm 없음 / 알림톡 = utm_source=kakao & utm_medium=alimtalk / 기타 = 그 외 utm
  sh.getRange('N10:O10').setValues([['유입 채널', '조회수']]).setFontWeight('bold').setBackground(PALE);
  sh.getRange('N11:O13').setValues([
    ['앱 배너', '=COUNTIFS(' + L + 'A2:A,"<>",' + L + 'F2:F,"")'],
    ['알림톡', '=COUNTIFS(' + L + 'A2:A,"<>",' + L + 'F2:F,"kakao",' + L + 'G2:G,"alimtalk")'],
    ['기타', '=COUNTA(' + L + 'A2:A)-O11-O12'],
  ]);

  sh.getRange('N21:O21').setValues([['브라우저', '조회수']]).setFontWeight('bold').setBackground(PALE);
  sh.getRange('N22:O22').setValues([['일반 브라우저', '=COUNTIFS(' + L + 'A2:A,"<>",' + L + 'D2:D,"")']]);
  sh.getRange('N23').setFormula(
    '=IFERROR(QUERY(' + L + 'D2:D,"select D, count(D) where D <> \'\' group by D order by count(D) desc limit 5 label D \'\', count(D) \'\'",0),"")'
  );

  // 그래프 6개
  var dates = sh.getRange(HDR, 1, DAYS + 1, 1);

  addChart_(sh, Charts.ChartType.COMBO, [sh.getRange(HDR, 1, DAYS + 1, 3)], 7, 1, 690, 320, '일별 조회수 · 순방문자', {
    legend: { position: 'top' },
    hAxis: { format: 'M/d' },
    seriesType: 'bars',
    series: { 0: { color: YELLOW }, 1: { type: 'line', color: NAVY, pointSize: 5, lineWidth: 2 } },
  });
  addChart_(sh, Charts.ChartType.PIE, [sh.getRange('N4:O7')], 7, 8, 490, 320, '기기 비중', {
    pieHole: 0.45,
    colors: [NAVY, YELLOW, GREY],
    legend: { position: 'right' },
  });

  addChart_(sh, Charts.ChartType.COLUMN, [dates, sh.getRange(HDR, 4, DAYS + 1, 3)], 24, 1, 690, 320, '일별 기기별 조회', {
    legend: { position: 'top' },
    hAxis: { format: 'M/d' },
    isStacked: true,
    colors: [NAVY, YELLOW, GREY],
  });
  addChart_(sh, Charts.ChartType.PIE, [sh.getRange('N10:O13')], 24, 8, 490, 320, '유입 채널 (앱 배너 · 알림톡)', {
    pieHole: 0.45,
    colors: [NAVY, YELLOW, GREY],
    legend: { position: 'right' },
  });

  addChart_(sh, Charts.ChartType.AREA, [dates, sh.getRange(HDR, 8, DAYS + 1, 1)], 41, 1, 690, 300, '누적 조회수', {
    legend: { position: 'none' },
    hAxis: { format: 'M/d' },
    colors: [YELLOW],
  });
  addChart_(sh, Charts.ChartType.PIE, [sh.getRange('N21:O27')], 41, 8, 490, 300, '앱 내 브라우저 비중', {
    pieHole: 0.45,
    colors: [GREY, YELLOW, NAVY, SUB, '#E4611B', '#7FA84A'],
    legend: { position: 'right' },
  });

  ss.setActiveSheet(sh);
}

function addChart_(sheet, type, ranges, row, col, width, height, title, options) {
  var builder = sheet.newChart()
    .setChartType(type)
    .setNumHeaders(1)
    .setPosition(row, col, 0, 0)
    .setOption('title', title)
    .setOption('width', width)
    .setOption('height', height);
  ranges.forEach(function (range) { builder.addRange(range); });
  Object.keys(options).forEach(function (key) { builder.setOption(key, options[key]); });
  sheet.insertChart(builder.build());
}

function parseDate_(yyyyMmDd) {
  var p = yyyyMmDd.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
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
