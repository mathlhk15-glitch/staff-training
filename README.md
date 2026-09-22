# 창원경일고등학교 교직원 연수 포털

## 배포 방법 (GitHub Pages)
1. 이 폴더(`staff-training/`) 전체를 GitHub 저장소(예: `mathlhk15-glitch.github.io` 계정의 새 저장소 `staff-training`, 또는 기존 `lhk15` 저장소의 하위 폴더)에 업로드/커밋합니다.
2. 저장소 Settings → Pages에서 Source를 `main` 브랜치 `/ (root)`로 지정합니다.
3. 배포 URL 예시: `https://mathlhk15-glitch.github.io/staff-training/`
4. `.nojekyll` 파일이 반드시 저장소 루트(이 폴더 기준 최상단)에 포함되어야 합니다. (이미 포함됨)

## 새 연수자료 추가하는 방법
1. `training/2026/` 폴더에 새 HTML 문서를 추가합니다. (기존 문서를 복사해 틀로 활용하면 편합니다.)
2. `data/trainings.js`의 `TRAININGS` 배열에 항목을 1개 추가합니다.
3. 저장소 루트에서 `python3 tools/build-search-index.py`를 실행하여 `data/search-index.json`을 재생성합니다. 검색 인덱스는 각 HTML의 본문·섹션 앵커와 `trainings.js`의 키워드를 함께 반영합니다.
4. `data/search-index.json`은 직접 편집하지 않는 것을 권장합니다.

## 다음 연도(예: 2027) 자료로 개정할 때
1. `training/2027/` 폴더를 새로 만들고 개정된 문서를 넣습니다.
2. `trainings.js`에서 기존 2026년 항목은 `isCurrent: false`로 바꾸고, 같은 `groupId`로 2027년 항목을 새로 추가하며 `isCurrent: true`로 둡니다.
3. 이렇게 하면 첫 화면에는 2027년 자료만 노출되고, 과거 링크(`training/2026/service.html`)는 깨지지 않고 그대로 보존됩니다.

## 인앱 브라우저(카카오톡 등) 관련 참고
`app.js`의 `INAPP_UA_PATTERNS` 배열에 알려진 인앱 브라우저 토큰이 등록되어 있습니다.
학교 자체 메신저(예: 쿨메신저)의 정확한 User-Agent 문자열이 확인되면 이 배열에 정규식을 추가해 주세요.
(휴대폰에서 해당 메신저로 아무 링크나 열고, 브라우저 콘솔에서 `navigator.userAgent`를 확인하면 알 수 있습니다.)

## 폴더 구조
```
staff-training/
├─ index.html              ← 첫 화면 (검색·필터·카드)
├─ style.css                ← 공통 스타일 + 인쇄 전용 CSS
├─ app.js                   ← 검색·필터·즐겨찾기·인쇄·인앱 브라우저 감지 로직
├─ .nojekyll
├─ data/
│   ├─ trainings.js         ← 전체 자료 메타데이터 (단일 소스)
│   └─ search-index.json    ← 본문·섹션·키워드 검색용 인덱스(자동 생성)
├─ tools/
│   └─ build-search-index.py ← 검색 인덱스 재생성 도구
└─ training/
    └─ 2026/
        ├─ service.html
        ├─ document-writing.html
        ├─ anti-corruption.html
        ├─ conflict-interest.html
        ├─ conduct-code.html
        ├─ workplace-bullying.html
        ├─ school-budget.html
        ├─ teacher-protection-staff.html
        ├─ teacher-protection-student.html
        └─ teacher-protection-parent.html
```


## 자료 검토 상태 관리
- `trainings.js`의 `verified`, `verifiedDate`는 실제 검토 후 수동으로 지정합니다.
- 날짜만으로 “최신 법령”이라고 자동 판정하지 않습니다.
- `verified: false`이거나 검토 후 365일이 경과하거나 다음 학년도로 넘어가면 포털에서 `재검토 필요`로 표시합니다.

## 검색 동작
- 제목·카테고리·대상·키워드·본문을 함께 검색합니다.
- 검색어가 특정 섹션에 있으면 해당 `#psec-*` 앵커로 바로 이동합니다.
- 띄어쓰기·중점·하이픈 등 일부 구두점 차이와 영문 대소문자를 정규화합니다.
