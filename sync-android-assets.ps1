# מעתיק את קבצי האתר לתוך אפליקציית האנדרואיד, כדי שה-APK תמיד ירוץ על אותו קוד כמו האתר.
# להריץ לפני כל בנייה של APK:   powershell -ExecutionPolicy Bypass -File .\sync-android-assets.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$assets = Join-Path $root 'android\app\src\main\assets'
$files = @('index.html', 'app.js', 'style.css', 'firebase-config.js', 'manifest.json', 'sw.js', 'p1.png')

New-Item -ItemType Directory -Force $assets | Out-Null
foreach ($f in $files) {
    Copy-Item (Join-Path $root $f) (Join-Path $assets $f) -Force
    Write-Host "copied $f"
}
# ספריית זיהוי הפנים והמודלים שלה
foreach ($dir in @('vendor', 'models')) {
    $src = Join-Path $root $dir
    if (Test-Path $src) {
        $dst = Join-Path $assets $dir
        New-Item -ItemType Directory -Force $dst | Out-Null
        Copy-Item (Join-Path $src '*') $dst -Recurse -Force
        Write-Host "copied $dir/"
    }
}
# admin.html וקבצים ישנים לא צריכים להיות בתוך ה-APK
foreach ($old in @('admin.html', 'version.json')) {
    $p = Join-Path $assets $old
    if (Test-Path $p) { Remove-Item $p -Force; Write-Host "removed $old from assets" }
}
Write-Host 'Android assets are in sync.'
