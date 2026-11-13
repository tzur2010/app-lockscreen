# בונה APK חדש: מסנכרן את קבצי האתר, בונה וחותם, ושומר כ-Lockscreen.apk בתיקייה הזו.
# הרצה:   powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
# הכלים (Java, Android SDK, Gradle) מותקנים ב-%LOCALAPPDATA%\MagicLockBuild
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$base = Join-Path $env:LOCALAPPDATA 'MagicLockBuild'
$jdk = Get-ChildItem (Join-Path $base 'jdk') -Directory | Select-Object -First 1
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$sdk = Join-Path $base 'sdk'
$gradle = Join-Path $base 'gradle\gradle-8.5\bin\gradle.bat'

if (-not (Test-Path (Join-Path $root 'android\keystore.properties'))) {
    throw 'חסר android\keystore.properties (מפתח החתימה). בלי אותו מפתח לא ניתן לעדכן את האפליקציה אצל הלקוחות.'
}
$cfg = Get-Content (Join-Path $root 'firebase-config.js') -Raw
if ($cfg -match 'PASTE_API_KEY_HERE|PASTE_PROJECT_ID_HERE') {
    Write-Warning 'firebase-config.js עדיין לא מוגדר - ה-APK יציג "המערכת עדיין לא הוגדרה".'
}

& (Join-Path $root 'sync-android-assets.ps1')

# בנייה בתיקייה עם נתיב באנגלית (Gradle לא אוהב תווים בעברית בנתיב)
$work = Join-Path $base 'project'
if (Test-Path $work) { Remove-Item -Recurse -Force $work }
robocopy (Join-Path $root 'android') $work /E /XD build .gradle /NFL /NDL /NJH /NJS /NP | Out-Null
[System.IO.File]::WriteAllText((Join-Path $work 'local.properties'), 'sdk.dir=' + ($sdk -replace '\\', '\\'))

Push-Location $work
try {
    cmd /c "`"$gradle`" assembleRelease --no-daemon --console=plain"
    if ($LASTEXITCODE -ne 0) { throw 'הבנייה נכשלה' }
} finally {
    Pop-Location
}

$apk = Join-Path $work 'app\build\outputs\apk\release\app-release.apk'
Copy-Item $apk (Join-Path $root 'Lockscreen.apk') -Force
Write-Host "APK מוכן: $(Join-Path $root 'Lockscreen.apk')"
