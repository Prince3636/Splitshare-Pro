# SplitShare PowerShell APK Builder
$ErrorActionPreference = "Stop"
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  SplitShare - PowerShell Android APK Builder" -ForegroundColor Cyan
Write-Host "====================================================`n" -ForegroundColor Cyan

$rootDir = $PSScriptRoot
Set-Location $rootDir

Write-Host "📦 [1/3] Compiling React web bundle..." -ForegroundColor Yellow
npm run build

Write-Host "`n📱 [2/3] Syncing with Android Capacitor..." -ForegroundColor Yellow
npx cap sync android

Write-Host "`n⚙️  [3/3] Running APK build..." -ForegroundColor Yellow
node scripts/build-apk.cjs
