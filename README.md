# 국룰겜 — 스팀 구매 가이드 사이트

한국 스팀 가격 기록과 한국 게이머 평가로 "이 게임, 지금 사도 되나"를 판정하는 사이트.
기획서: `Desktop\유튜브\필승이\스팀 구매 가이드 사이트 기획서.pdf`, 설계: `설계안.md`.

## 폴더
- `collector\` 파이썬 수집·계산 (스팀 상점·리뷰, IsThereAnyDeal 가격 기록, 5단계 판정)
- `data\` 수집 결과(JSON). 사이트는 이 파일을 읽어 화면을 만든다
- `web\` 사이트 (Next.js 15 + Tailwind 4 + Recharts 3)
- `config\rules.json` 판정 기준값, `config\steam_seasons.json` 시즌 세일 일정(예상)
- `.env` 비밀 키(저장소에 안 올라감). 모양은 `.env.example`

## 돌리는 법 (이 PC)
파이썬·노드는 Codex 런타임 것을 쓴다.
```
$py = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$node = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$pnpm = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs"
```
- 수집(할인 게임 전체, 10~20분): `& $py -m collector.run_weekly --table`
- 수집(시험, 5개): `& $py -m collector.run_weekly --limit 5 --table`
- 테스트: `& $py -m unittest discover -s collector/tests -t .`
- 사이트 빌드: `cd web; & $node $pnpm build`
- 미리보기: `cd web; & $node node_modules\next\dist\bin\next start -p 3100` → http://localhost:3100

## 화면
- `/` 이번 주 할인: 판정 칩·정렬·필터. 게임을 누르면 같은 화면 위에 상세 창이 겹쳐 뜬다(주소는 /game/번호로 바뀜)
- `/game/번호` 게임 상세: 그림 위 큰 가격·판정 도장·D-day·태그, 세일 통계(통상 할인·주기·다음 세일 예상·시즌 세일), 세일가 추세 그래프, 한국 vs 전체 평가
- `/rank` 테마 순위, `/about` 판정 기준(기준값은 rules.json에서 자동), `/video` 영상(data\videos.json)

## 판정 (config\rules.json)
세일 2회 미만 → 판정 없음 / 역대 최저 이하 → 바닥가 / 평소 세일가보다 5% 쌈 → 좋은 가격 /
20% 비쌈 → 함정 할인 / 5% 비쌈 → 기다림 / 그 외 → 보통. 한국어 리뷰 100개 이상이고 −10%p 이하 → "한국 주의".
성인 표시(스팀 내용 표시 3·4번)가 있는 게임은 수집에서 뺀다.

## 판매처 가격 비교 (2026-10-07)
- `config\stores.json` 공식 판매처 15곳(IsThereAnyDeal 판매처 번호). 키 리셀러 없음. 다이렉트 게임즈는 enabled=false(아직).
- `collector\stores.py` — run_weekly 끝에 자동 실행. `data\offers.json`(게임×판매처 현재가), `offer_history.json`(바뀐 날만), `stores.json`.
- 외화 판매처: ITAD 원화 환산가 × (1 + `foreign_card_fee_pct`) → "약 ○○원". 모든 판매처 포함 역대 최저가 = ITAD historyLow(KR).
- 화면: 상세 "어디서 사야 제일 싸나" 카드, 목록 "최저 판매처"·"스팀보다 싼 곳 있음" 필터.

## 다이렉트 게임즈 (2026-10-07, B안)
- `collector\directg.py`: 홈 화면에 보이는 상품 + 관리자가 연결한 상품 주소(`data\directg_links.json`)를 하루 1회·3초 간격으로 읽어 `offers.json`에 합침. 캐시 `data\directg_cache.json`, 확인 대기 `data\match_queue.json`.
- 봇 이름을 밝히면 사이트맵·검색이 홈 화면으로 대체됨 → 전체 자동 발견은 불가. 브라우저 이름으로 바꾸는 우회는 하지 않음.
- 관리자 화면 `/admin`: 비밀번호 `ADMIN_PASSWORD`(내 PC는 `web\.env.local`, 인터넷은 Vercel 환경 변수). 상품 주소 붙여넣기 연결, 확인 대기 승인/거절. `GITHUB_TOKEN`·`GITHUB_REPO`가 있으면 GitHub에 커밋(어디서나), 없으면 내 PC 파일에 저장.
- 운영사 문의 초안: `문의_초안_다이렉트게임즈.md`.

## 새 지표 (2026-10-07)
- 리뷰어 플레이 시간(최근 리뷰 100개, 전체·한국어), 지금 접속자(스팀 공식 API), 시간당 가격, 후회 지수, 스팀 판매 순위, 싱글/멀티/협동, 운영체제, 패드 — 계산은 `web\lib\stats.ts`.

## 주의
- IsThereAnyDeal 약관: 출처 표기 필수(모든 페이지 하단), 가격 수정 금지. 스팀 상점(61)·원화만 쓴다.
- 스팀 비공식 API는 호출 간격(1.5초)과 재시도를 둔다. SteamDB는 쓰지 않는다.
- 시즌 세일 날짜는 예상값. 스팀이 발표하면 steam_seasons.json을 고치고 confirmed를 true로.
