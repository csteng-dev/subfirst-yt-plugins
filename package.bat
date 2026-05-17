@echo off
title YT Subscription Guard Packager
color 0a

echo =======================================================
echo     YT Subscription Guard - Auto-Package Release Tool
echo =======================================================
echo.
echo Packaging core assets to release ZIP file...
echo.

:: Detect and clean old zip packages
if exist yt-subscription-guard.zip (
    echo Cleaning up old archive...
    del /f /q yt-subscription-guard.zip
)

:: Run PowerShell compression engine
powershell -NoProfile -Command "Compress-Archive -Path 'manifest.json', 'assets', 'background', 'content', 'options', 'popup', 'LICENSE', 'README.md' -DestinationPath 'yt-subscription-guard.zip' -Force"

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo    SUCCESS! Release package generated:
    echo    =^> yt-subscription-guard.zip
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo    ERROR! Please check PowerShell permissions.
    echo =======================================================
)

echo.
echo Press any key to exit...
pause >nul
