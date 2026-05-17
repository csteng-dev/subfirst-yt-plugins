@echo off
title SubFirst Packager
color 0a

echo =======================================================
echo     SubFirst - Auto-Package Release Tool
echo =======================================================
echo.
echo Packaging core assets to release ZIP file...
echo.

:: Detect and clean old zip packages
if exist subfirst.zip (
    echo Cleaning up old archive...
    del /f /q subfirst.zip
)

:: Run PowerShell compression engine
powershell -NoProfile -Command "Compress-Archive -Path 'manifest.json', 'assets', 'background', 'content', 'options', 'popup', 'LICENSE', 'README.md' -DestinationPath 'subfirst.zip' -Force"

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo    SUCCESS! Release package generated:
    echo    =^> subfirst.zip
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
