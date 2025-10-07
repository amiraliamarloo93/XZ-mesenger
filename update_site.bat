@echo off
title Auto Update XZ Messenger
color 0A

echo ===============================
echo  XZ Messenger Auto Update Tool
echo ===============================
echo.

REM بررسی تغییرات
git status > temp_status.txt
findstr /C:"deleted:    " temp_status.txt > nul
if %errorlevel%==0 (
    echo WARNING: Some files have been deleted!
    type temp_status.txt | findstr /C:"deleted:    "
    echo.
)

REM هشدار برای فایل‌های حساس (.env)
findstr /C:".env" temp_status.txt > nul
if %errorlevel%==0 (
    echo WARNING: .env file changed! Check carefully!
    echo.
)

REM افزودن تغییرات
echo Adding changes...
git add -A

REM درخواست پیام commit
set /p commitmsg="Enter commit message: "
if "%commitmsg%"=="" set commitmsg="Auto update"

REM Commit کردن
git commit -m "%commitmsg%"

REM Push کردن به origin main
echo Pushing to GitHub...
git push origin main

echo.
echo Update complete!
pause
del temp_status.txt
