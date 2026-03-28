@echo off
title LinkedIn Post Creator - Proxy Server
color 0A
echo.
echo  ==========================================
echo   LinkedIn Post Creator - Proxy Server
echo   API key stays on YOUR machine only
echo  ==========================================
echo.

node proxy-server.js

echo.
echo  Server stopped. Press any key to exit.
pause > nul
