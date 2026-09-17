# 추석 원정대 (2026) 이벤트 페이지

빌드 없이 바로 올리는 정적 페이지입니다. (`index.html` + `assets/`)

## Vercel 배포

**방법 1: CLI**
```bash
cd chuseok-expedition
vercel          # 처음 한 번은 로그인하고 프로젝트를 연결합니다
vercel --prod
```

**방법 2: 대시보드**
Vercel → Add New → Project → 이 폴더를 올린 Git 저장소를 Import합니다.
- Framework Preset: `Other`
- Build Command / Output Directory: 비워 둡니다

## 디자인 원본
Figma `추석원정대_FINAL`(CVogee0nC4LpZLpK0xQM4S, node 82:2002) 기준으로 만들었습니다.
이미지는 Figma 원본 PNG를 WebP로 변환한 것입니다.

| 파일 | 위치 | Figma 노드 |
|---|---|---|
| `hero.webp` | 히어로 배경 (투명도 55%) | 82:2004 |
| `stage1.webp` | STAGE 01 | 82:2120 |
| `stage2.webp` | STAGE 02 | 82:2051 |
| `stage3.webp` | STAGE 03 | 82:2061 |
| `chevrons-down.svg`, `dot.svg`, `line-cap.svg`, `line-dash.png` | 아이콘·구분선 | — |

## 링크
- 연휴 매치 선택하러 가기 → `https://plabmanager.onelink.me/FhFk/pxnzldrc` (플랩매니저 앱 AppsFlyer OneLink)

버튼은 하나입니다. Figma 82:2098 기준으로 "플랩풋볼 바로가기" 버튼은 삭제됐습니다.

## 조회수 기록 (구글 시트)

페이지가 열릴 때마다 구글 시트 "조회 로그" 탭에 한 줄씩 쌓이고, "요약" 탭에서 전체 조회수·순방문자·날짜별 조회수를 봅니다.
구조는 manager-guide-faq와 같습니다: 시트에 붙인 Apps Script 웹 앱이 기록을 받습니다.

1. 구글 드라이브에서 새 스프레드시트를 만듭니다.
2. 시트 메뉴 **확장 프로그램 → Apps Script**를 열고, `apps-script-views.gs` 내용을 통째로 붙여넣고 저장합니다.
3. 편집기 위쪽 함수 선택에서 `setup`을 고르고 **실행**합니다. (처음 한 번 권한 승인이 뜹니다) → "조회 로그" / "요약" 탭이 생깁니다.
4. **배포 → 새 배포 → 유형: 웹 앱**, 실행 사용자: **나**, 액세스 권한: **모든 사용자** → 배포.
5. 나온 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec`)을 `index.html`의 `VIEW_LOG_URL`에 넣고 push 합니다.

- Apps Script 코드를 고친 뒤에는 **배포 → 배포 관리 → 새 버전으로 재배포**해야 반영됩니다.
- 기록 항목: 기록 시각, 방문자 ID(브라우저별 임의 값, 개인정보 아님), 기기(iOS/Android), 앱 내 브라우저(카카오톡 등), 유입 경로, utm 값, 페이지 경로
- 제외: localhost, 링크 미리보기 수집기·크롤러
