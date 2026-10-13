# 국룰겜 자동 수집 → GitHub 올리기 (다른 PC용, 2026-10-13). 예약 작업 Gukrulgem-Daily-0440 이 매일 04:40에 실행.
# 1) 할인 게임 수집(collector.run_weekly)  2) 먼저 git pull --rebase (다른 PC·영상 프로그램이 올린 것과 합침)
# 3) data 변경 커밋  4) GitHub에 올림 → Vercel 자동 재배포. 기록: output\auto_YYYYMMDD.txt
param([switch]$Test)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root "output"; New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("auto_" + (Get-Date -Format "yyyyMMdd") + ".txt")
function Say($m) { ((Get-Date -Format "HH:mm:ss") + " " + $m) | Out-File -FilePath $log -Append -Encoding utf8 }

Say "=== 시작 (Test=$Test) · $env:COMPUTERNAME ==="
# 2026-10-13 (사용자 "24시·12시 어복레저 재고관리 이후 실행"): 어복 재고관리(00:00·12:00)가 돌고 있으면 끝날 때까지 기다린다.
# 같은 인터넷을 쓰는 두 작업이 겹치면 느려지고 호출 제한에 걸릴 수 있어서. 최대 3시간 기다린 뒤에는 그냥 시작.
if (-not $Test) {
  $waited = 0
  while ((Get-Process -Name "어복_재고관리" -ErrorAction SilentlyContinue) -and $waited -lt 180) {
    if ($waited -eq 0) { Say "어복 재고관리 실행 중 → 끝날 때까지 기다림" }
    Start-Sleep 60; $waited++
  }
  if ($waited -gt 0) { Say "어복 재고관리 끝남 ($waited 분 기다림)" }
}
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:GCM_INTERACTIVE = "never"
$env:GIT_TERMINAL_PROMPT = "0"
Set-Location $root

# 0) 최신 자료부터 (영상 프로그램이 올린 videos.json·게임 추가분과 합침)
& git pull --rebase --autostash 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath $log -Append -Encoding utf8
Say "pull 끝 (exit $LASTEXITCODE)"

# 1) 수집
$args = @("-u", "-m", "collector.run_weekly")
if ($Test) { $args += @("--limit", "3", "--no-save") }
& python @args 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath $log -Append -Encoding utf8
Say "수집 끝 (exit $LASTEXITCODE)"

# 2) 변경 확인 → 커밋 → 올리기
& git add data 2>&1 | Out-Null
$changed = & git status --porcelain data
if (-not $changed) { Say "data 변경 없음 → 올리지 않음"; Say "=== 끝 ==="; exit 0 }
& git -c user.name=gukrulgem-auto -c user.email=asdf9550@gmail.com commit -q -m ("data: 자동 수집 " + (Get-Date -Format "yyyy-MM-dd HH:mm") + " (" + $env:COMPUTERNAME + ")") 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
$push = & git push 2>&1 | ForEach-Object { "$_" }
$push | Out-File -FilePath $log -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) {
  Say "올리기 실패 → pull --rebase 뒤 한 번 더"
  & git pull --rebase --autostash 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
  & git push 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
}
if ($LASTEXITCODE -eq 0) { Say "GitHub 올림 → Vercel 자동 재배포" } else { Say "올리기 실패 (exit $LASTEXITCODE) — 다음 실행 때 다시 시도. 로그인 문제면 3_시험.ps1 을 직접 실행" }
Say "=== 끝 ==="
