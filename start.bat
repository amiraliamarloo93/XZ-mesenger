@echo off
cd /d "%~dp0"
echo Starting XZ Messenger...
npm install
node server.js
pause
