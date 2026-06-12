@echo off
taskkill /f /im node.exe /fi "WINDOWTITLE eq library-server" >nul 2>&1
start "" /min cmd /c "title library-server && node C:\Users\asafa\Downloads\server.js"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8001"
