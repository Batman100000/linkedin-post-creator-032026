@echo off
taskkill /f /im python.exe /fi "WINDOWTITLE eq library-server" >nul 2>&1
start "" /min cmd /c "title library-server && python C:\Users\asafa\Downloads\library-server.py"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8001"
