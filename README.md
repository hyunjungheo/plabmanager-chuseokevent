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
- 플랩풋볼 바로가기 → `https://staging.plabfootball.com` (스테이징 주소)
- 연휴 매치 잡으러 가기 → `https://abr.ge/@plabmanager/airpage`
