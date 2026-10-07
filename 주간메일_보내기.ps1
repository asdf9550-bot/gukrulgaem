# 국룰겜 주간 메일 (예약 작업 Gukrulgem-Mail-Wed0800, 매주 수요일 08:00). RESEND 설정이 없으면 output\weekly_mail_preview.html 만 만든다.
$env:PYTHONIOENCODING = "utf-8"
Set-Location "C:\Users\PC\Documents\Codex\gukrulgem-site"
& "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m collector.weekly_mail 2>&1 | Out-File -FilePath ("output\mail_" + (Get-Date -Format "yyyyMMdd") + ".txt") -Encoding utf8
