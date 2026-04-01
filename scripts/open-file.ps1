param([string]$url)
Add-Type -AssemblyName System.Windows.Forms
# رسالة تأكيد للتشخيص - لو ظهرت يبقى البروتوكول شغال صح
[System.Windows.Forms.MessageBox]::Show("محاولة فتح الرابط: $url", "نظام الفتح التلقائي")

$logFile = "C:\oracle\open-file-debug.log"
"--- $(Get-Date) ---" | Out-File $logFile -Append
"Received URL: $url" | Out-File $logFile -Append
try {
    # Decoding URL and manually fixing common browser encodings
    $decoded = [System.Uri]::UnescapeDataString($url)
    $decoded = $decoded -replace '%5C', '\'
    $decoded = $decoded -replace '%20', ' '
    
    # Cleaning prefix
    $path = $decoded -replace '^aoi-open[:/]*', ''
    $path = $path.Trim().Trim('"')
    
    # Normalizing slashes for Windows
    $path = $path.replace('/', '\')
    # Special fix for double-encoded UNC paths
    if ($path.Contains('\\\\')) {
        $path = '\\\\' + ($path -split '\\\\')[-1]
    }
    if ($path.StartsWith('\') -and -not $path.StartsWith('\\')) { 
        $path = '\\' + $path.Substring(1) 
    }
    
    # Handling multiple paths if separated by |
    $parts = $path -split '(?<!:)\|'
    foreach ($p in $parts) {
        if (-not $p) { continue }
        $cp = $p.Trim()
        
        # Extensions to try
        $extensions = '', '.pdf', '.docx', '.docm', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.xlsx', '.xls', '.doc'
        $found = $false
        foreach ($ext in $extensions) {
            $full = $cp + $ext
            if (Test-Path $full) {
                # Opening the file using default associated program via explorer.exe
                Start-Process explorer.exe -ArgumentList "`"$full`""
                $found = $true
                break
            }
        }
        
        if (-not $found) {
            [System.Windows.Forms.MessageBox]::Show("تعذر العثور على الملف في المسار المحدّد:`n$cp", "خطأ في المسار", 0, 16)
        }
    }
}
catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Error")
}
