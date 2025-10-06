@echo off
title بروزرسانی هوشمند پروژه XZ-Messenger
color 0A

setlocal enabledelayedexpansion

REM -----------------------------
REM تنظیم مسیر پروژه و گیت
REM -----------------------------
set PROJECT_PATH=C:\Users\Tak-System\Desktop\XZ-Managers
set GIT_BRANCH=main

REM گرفتن تاریخ و زمان برای Backup
for /f "tokens=1-4 delims=/ " %%a in ("%date%") do (
    set day=%%a
    set month=%%b
    set year=%%c
)
for /f "tokens=1-3 delims=:." %%a in ("%time%") do (
    set hour=%%a
    set minute=%%b
    set second=%%c
)
set BACKUP_PATH=%PROJECT_PATH%\backup_%year%%month%%day%_%hour%%minute%%second%

echo -------------------------------
echo شروع بروزرسانی هوشمند XZ-Messenger
echo -------------------------------

REM -----------------------------
REM ایجاد Backup
REM -----------------------------
echo در حال ایجاد Backup...
mkdir "%BACKUP_PATH%"
xcopy "%PROJECT_PATH%\*" "%BACKUP_PATH%\" /s /e /y /i >nul
if %errorlevel% neq 0 (
    echo خطا در ایجاد Backup!
    pause
    exit /b 1
)
echo Backup با موفقیت ایجاد شد: %BACKUP_PATH%
echo.

REM -----------------------------
REM انتخاب شاخه گیت
REM -----------------------------
set /p GIT_BRANCH="نام شاخه گیت را وارد کنید (پیشفرض main): "
if "!GIT_BRANCH!"=="" set GIT_BRANCH=main

REM رفتن به مسیر پروژه
cd "%PROJECT_PATH%"

REM -----------------------------
REM Checkout و Pull
REM -----------------------------
echo رفتن به شاخه: !GIT_BRANCH!
git checkout !GIT_BRANCH!
if %errorlevel% neq 0 (
    echo خطا در تغییر شاخه گیت!
    pause
    exit /b 1
)
echo بروزرسانی آخرین تغییرات از گیت...
git pull origin !GIT_BRANCH!
if %errorlevel% neq 0 (
    echo خطا در بروزرسانی از گیت!
    pause
    exit /b 1
)
echo بروزرسانی با موفقیت انجام شد.
echo.

REM -----------------------------
REM ریستارت سرور Node.js
REM -----------------------------
echo ریستارت سرور Node.js...
taskkill /F /IM node.exe >nul 2>&1
start "" "node" "server.js"
echo سرور Node.js با موفقیت ریستارت شد.
echo.

REM -----------------------------
REM ثبت زمان بروزرسانی
REM -----------------------------
echo آخرین بروزرسانی: %date% %time% >> "%PROJECT_PATH%\update_log.txt"
echo زمان بروزرسانی ثبت شد در update_log.txt
echo.
echo بروزرسانی کامل شد!
pause
