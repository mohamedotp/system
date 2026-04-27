param([string]$RawUrl)

Write-Host '--- AOI Secure Protocol ---' -ForegroundColor Cyan
Write-Host "1. Raw Input: $RawUrl" -ForegroundColor Yellow

try {
    $u = [uri]::UnescapeDataString($RawUrl)

    $u = $u -replace '^aoi-open[:/]*', ''
    $u = $u.Replace('/', '\').Trim().TrimEnd('\').Trim('"')

    Write-Host "2. Decoded Path: $u" -ForegroundColor Yellow

    if ($u -match '[;&|`"''<>]') {
        Write-Host 'BLOCKED: Suspicious characters detected!' -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }

    if ($u -like 'C:\Archives*') {
        $u = $u -replace '^C:\\Archives', '\\192.168.13.12\homes'
    }
    $allowed = @(
        '\\192.168.13.12\homes',
        '\\192.168.13.11\it_dep'
    )
    $isAllowed = $false
    foreach ($prefix in $allowed) {
        if ($u.StartsWith($prefix)) {
            $isAllowed = $true
            break
        }
    }

    if (-not $isAllowed) {
        Write-Host "BLOCKED: Path not in allowed list!" -ForegroundColor Red
        Write-Host "Path: $u" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }

    Write-Host "3. Final Path: $u" -ForegroundColor Green

    if (Test-Path -LiteralPath $u) {
        Start-Process explorer.exe -ArgumentList "`"$u`""
        Write-Host 'SUCCESS: Opened in Explorer' -ForegroundColor Green
        Start-Sleep -Seconds 2
        exit
    } else {
        Write-Host "ERROR: Path Not Found: $u" -ForegroundColor Red
    }

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "--- Press any key to close ---"
[void]$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
