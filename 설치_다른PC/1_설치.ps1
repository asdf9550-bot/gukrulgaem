# 국룰겜 사이트 수집기 — 다른 PC 설치 (2026-10-13). 마우스 오른쪽 → "PowerShell로 실행".
# 1) Python 3.12 / Git 설치(없을 때)  2) .env 준비  3) 예약 작업 Gukrulgem-Daily-0440 등록(매일 04:40)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot          # 저장소 폴더 (이 스크립트는 설치_다른PC 안에 있음)
Write-Host "저장소: $root"
if (-not (Test-Path (Join-Path $root "collector\run_weekly.py"))) { Write-Host "collector 폴더가 없습니다. 저장소 안의 설치_다른PC 폴더에서 실행하세요."; pause; exit 1 }

function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# 1) Python 3.12
$pyOk = $false
if (Has "python") { $v = (& python --version 2>&1); if ($v -match "3\.1[1-9]") { $pyOk = $true; Write-Host "Python 있음: $v" } }
if (-not $pyOk) {
  Write-Host "Python 3.12 설치 중 (winget)..."
  winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements --silent
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
  if (Has "python") { Write-Host "Python 설치됨: $(& python --version 2>&1)" } else { Write-Host "Python 설치 실패 — https://www.python.org/downloads/ 에서 3.12를 설치하고('Add python.exe to PATH' 체크) 다시 실행하세요."; pause; exit 1 }
}
# 2) Git
if (-not (Has "git")) {
  Write-Host "Git 설치 중 (winget)..."
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements --silent
  $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
  if (-not (Has "git")) { Write-Host "Git 설치 실패 — https://git-scm.com/download/win 에서 설치하고 다시 실행하세요."; pause; exit 1 }
}
Write-Host "Git 있음: $(& git --version)"
& git -C $root config core.quotepath false | Out-Null

# 3) .env
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root ".env.example") $envFile
  Write-Host ".env 파일을 만들었습니다. 메모장이 열리면 ITAD_API_KEY= 뒤에 키를 붙여 넣고 저장하세요."
  Start-Process notepad $envFile -Wait
}
$hasKey = (Get-Content $envFile -Encoding utf8 | Where-Object { $_ -match "^ITAD_API_KEY=.+" }).Count -gt 0
if (-not $hasKey) { Write-Host "경고: .env 에 ITAD_API_KEY 가 비어 있습니다. 수집이 실패합니다. 나중에 .env 를 열어 채우세요." }

# 4) 절전 해제 타이머 허용 (예약이 PC를 깨우려면 필요)
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP BD3B718A-0680-4D9D-8AB2-E1D2B4AC806D 1 2>$null
powercfg /setactive SCHEME_CURRENT 2>$null

# 5) 예약 작업 — 매일 01:00·13:00 (어복 재고관리 00:00·12:00 다음. 어복이 아직 돌면 스크립트가 끝날 때까지 기다림)
$name = "Gukrulgem-Site-AfterInventory"
$script = Join-Path $PSScriptRoot "2_자동수집_올리기.ps1"
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`"" -WorkingDirectory $root
$triggers = @((New-ScheduledTaskTrigger -Daily -At "01:00"), (New-ScheduledTaskTrigger -Daily -At "13:00"))
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 5) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $triggers -Settings $settings -Description "국룰겜 사이트 자동 수집 → GitHub 올리기 (매일 01:00·13:00, 어복 재고관리 끝난 뒤)" -Force | Out-Null
if (Get-ScheduledTask -TaskName "Gukrulgem-Daily-0440" -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName "Gukrulgem-Daily-0440" -Confirm:$false     # 예전 이름(04:40)이 이 PC에 있으면 정리
}
$info = Get-ScheduledTaskInfo -TaskName $name
Write-Host "예약 등록 완료: $name (매일 01:00·13:00) · 다음 실행 $($info.NextRunTime)"
Write-Host ""
Write-Host "다음: 3_시험.ps1 을 실행해 GitHub 로그인과 수집을 확인하세요."
pause
