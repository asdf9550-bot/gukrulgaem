# 국룰겜 자동 수집 → GitHub 올리기 (예약 작업 Gukrulgem-Daily-0440 이 매일 04:40에 실행)
# 1) 할인 게임 수집(collector.run_weekly, 판매처·다이렉트 게임즈 포함)  2) data 폴더 변경을 커밋  3) GitHub에 올림 → Vercel이 자동 재배포
# 기록: output\auto_YYYYMMDD.txt . 오류가 나도 다음 날 다시 시도한다.
param([switch]$Test)
$ErrorActionPreference = "Continue"
$root = "C:\Users\PC\Documents\Codex\gukrulgem-site"        # 한글 경로 대신 쓰는 연결 이름(같은 폴더)
$py = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$git = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
$logDir = Join-Path $root "output"; New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("auto_" + (Get-Date -Format "yyyyMMdd") + ".txt")
function Say($m) { $line = (Get-Date -Format "HH:mm:ss") + " " + $m; $line | Out-File -FilePath $log -Append -Encoding utf8 }

Say "=== 시작 (Test=$Test) ==="
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8   # 파이썬 한글 출력이 기록 파일에서 깨지지 않게
$env:GCM_INTERACTIVE = "never"
$env:GIT_TERMINAL_PROMPT = "0"
Set-Location $root

# 1) 수집
$args = @("-u", "-m", "collector.run_weekly")
if ($Test) { $args += @("--limit", "3", "--no-save") }
& $py @args 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath $log -Append -Encoding utf8
Say "수집 끝 (exit $LASTEXITCODE)"

# 2) 변경 확인 → 커밋 → 올리기
& $git add data 2>&1 | Out-Null
$changed = & $git status --porcelain data
if (-not $changed) { Say "data 변경 없음 → 올리지 않음"; Say "=== 끝 ==="; exit 0 }
& $git -c user.name=gukrulgem-auto -c user.email=asdf9550@gmail.com commit -q -m ("data: 자동 수집 " + (Get-Date -Format "yyyy-MM-dd HH:mm")) 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
$push = & $git push 2>&1 | ForEach-Object { "$_" }
$push | Out-File -FilePath $log -Append -Encoding utf8
if ($LASTEXITCODE -eq 0) { Say "GitHub 올림 → Vercel 자동 재배포" } else { Say "올리기 실패 (exit $LASTEXITCODE) — 다음 실행 때 다시 시도" }
Say "=== 끝 ==="
