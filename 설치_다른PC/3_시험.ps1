# 국룰겜 사이트 수집기 — 새 PC 시험 (2026-10-13). PowerShell로 실행. 아무것도 저장·올리지 않습니다.
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "① Python: $(& python --version 2>&1)"
Write-Host "② Git:    $(& git --version 2>&1)"
Write-Host "③ GitHub 로그인 확인 (처음이면 브라우저 로그인 창이 뜹니다 → asdf9550-bot 계정)"
& git ls-remote --heads origin main
if ($LASTEXITCODE -ne 0) { Write-Host "   GitHub 접속 실패. 로그인 창에서 로그인했는지, 인터넷이 되는지 확인하세요."; pause; exit 1 }
Write-Host "   OK"
Write-Host "④ 수집 시험 (게임 3개, 저장 안 함 · 1~2분)"
& python -m collector.run_weekly --limit 3 --no-save --table
if ($LASTEXITCODE -ne 0) { Write-Host "   수집 실패. 위 오류를 확인하세요 (.env 의 ITAD_API_KEY 가 가장 흔한 원인)."; pause; exit 1 }
Write-Host "⑤ 올리기 권한 확인 (실제로 올리지는 않음)"
& git push --dry-run
Write-Host ""
Write-Host "모두 통과했으면 매일 00:05·12:05(어복 재고관리 끝난 뒤)에 자동으로 돌아갑니다. 기록: $root\output\auto_날짜.txt"
Write-Host "지금 바로 전체 수집을 한 번 돌려 보려면: powershell -File `"$PSScriptRoot\2_자동수집_올리기.ps1`"  (약 1시간)"
pause
