@echo off
title SplitShare Android APK Builder
echo ====================================================
echo   SplitShare - 1-Click Android APK Builder
echo ====================================================
echo.

cd /d "%~dp0"

echo [1/3] Compiling React web bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Syncing with Android Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Building APK with Gradle...
node scripts/build-apk.cjs

echo.
pause
