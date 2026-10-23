# 새 PC로 사이트 수집기 옮기기 (2026-10-23 기준)

사이트 수집기는 파이썬만 써서 GPU 없이 돌아갑니다. 어떤 PC든 됩니다.
하는 일: 매일 **01:00·13:00**에 스팀 할인 게임 수집 → 리뷰 요약(Claude) → 무료 게임·신작 → `data\` 갱신 → GitHub에 올림 → Vercel이 사이트를 다시 만듦 → 성공하면 Gmail로 결과 메일.
어복 재고관리 자동 동기화가 돌고 있으면 끝날 때까지(최대 3시간) 기다렸다가 시작합니다.

## 0. 가져갈 것

`gukrulgaem_이사.zip` 하나면 됩니다 (바탕화면에 만들어 둠). 안에 `.env`(API 키·Gmail 앱 비밀번호)가 들어 있으니 **USB나 외장 드라이브로 옮기세요. 채팅·메일·클라우드에 올리지 마세요.**

## 1. 새 PC에서 풀기

1. zip 을 풀어서 `C:\gukrulgaem` 이 되게 합니다. (`C:\gukrulgaem\collector`, `C:\gukrulgaem\.env` 가 보이면 맞음. 한글·공백 없는 경로가 안전)
2. `C:\gukrulgaem\설치_다른PC\1_설치.ps1` 을 **마우스 오른쪽 → PowerShell로 실행**.
   - Python 3.12·Git 이 없으면 자동 설치(winget)
   - 예약 작업 `Gukrulgem-Site-AfterInventory`(매일 01:00·13:00, 절전이면 깨움) 등록
   - 절전 해제 타이머 허용 켬

## 2. GitHub 로그인 (한 번)

PowerShell에서:

```
git -C C:\gukrulgaem push --dry-run
```

"Connect to GitHub" 창 → **Sign in with your browser** → 브라우저에서 **asdf9550-bot** 계정으로 로그인 → **Authorize git-ecosystem**.
`Everything up-to-date` 가 나오면 끝. 로그인은 PC에 저장되어 다음부터 묻지 않습니다.

## 3. 시험 (한 번)

`3_시험.ps1` 을 PowerShell로 실행 → Python·Git 버전, GitHub 접속, 게임 3개 수집 표, 올리기 권한이 차례로 나오면 성공.

## 4. 옛 PC 정리

새 PC에서 첫 자동 실행이 성공해 메일이 온 뒤, **옛 PC의 예약 작업을 끕니다**(두 PC가 같이 올리면 충돌):
작업 스케줄러 → `Gukrulgem-Site-AfterInventory` → 사용 안 함. 또는 PowerShell에서
`Disable-ScheduledTask -TaskName Gukrulgem-Site-AfterInventory`

## 새 PC 조건

- 01:00·13:00에 켜져 있거나 절전 상태. 완전히 꺼져 있으면 그 회차는 건너뜀.
- 로그인된 사용자로 실행. 기록: `C:\gukrulgaem\output\auto_YYYYMMDD.txt`. 성공 메일: asdf9550@gmail.com
- 한 회차 약 1시간 반(게임 400개 + 신작 160개). 인터넷만 있으면 됨.

## 설정 파일 (.env) 에 든 것

| 키 | 용도 | 없으면 |
|---|---|---|
| ITAD_API_KEY | 가격 기록(IsThereAnyDeal) | 수집 실패 — 필수 |
| ANTHROPIC_API_KEY | 한국 리뷰 요약(Claude Haiku 5.5, 월 몇백 원) | 요약만 건너뜀 |
| STEAM_WEB_API_KEY | 스팀 위시리스트 연동 | 그 기능만 건너뜀 |
| GMAIL_USER / GMAIL_APP_PASSWORD / MAIL_TO | 성공 결과 메일 | 메일만 안 옴 |
