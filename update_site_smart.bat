@echo off
cd /d "C:\Users\Tak-System\Desktop\XZ-Managers"
git pull origin main
npm install
taskkill /IM node.exe /F
start "" node server.js
