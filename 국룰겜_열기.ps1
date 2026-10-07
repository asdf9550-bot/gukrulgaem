# 국룰겜 사이트 열기: 미리보기 서버가 꺼져 있으면 켜고(창 없이), 브라우저로 연다.
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$web = Join-Path $root "web"
$node = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$pnpm = "C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs"
$port = 3100
$url = "http://localhost:$port"

function PortOpen { (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) -ne $null }

if (-not (PortOpen)) {
    if (-not (Test-Path (Join-Path $web ".next\BUILD_ID"))) {
        # 아직 빌드가 없으면 한 번 빌드(1~2분). 창을 보여 준다.
        Start-Process -FilePath $node -ArgumentList "`"$pnpm`" build" -WorkingDirectory $web -Wait
    }
    $env:PATH = (Split-Path $node) + ";" + $env:PATH
    $si = New-Object System.Diagnostics.ProcessStartInfo
    $si.FileName = $node
    $si.Arguments = "node_modules\next\dist\bin\next start -p $port"
    $si.WorkingDirectory = $web
    $si.UseShellExecute = $false
    $si.CreateNoWindow = $true
    [void][System.Diagnostics.Process]::Start($si)
    $tries = 0
    while (-not (PortOpen) -and $tries -lt 60) { Start-Sleep -Milliseconds 500; $tries++ }
}
Start-Process $url
