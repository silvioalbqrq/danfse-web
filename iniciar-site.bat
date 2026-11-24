@echo off
title DANFSe Web
cd /d "%~dp0"

rem Usa o Python do venv, se existir; senao, o python do PATH.
set "PY=python"
if exist "%~dp0.venv\Scripts\python.exe" set "PY=%~dp0.venv\Scripts\python.exe"

rem Fecha um servidor anterior deste site na porta 8020, sem derrubar outros programas.
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8020 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_); if ($p.CommandLine -match 'http\.server.*8020') { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
powershell -NoProfile -Command "for($i=0;$i -lt 8;$i++){if(-not (Get-NetTCPConnection -LocalPort 8020 -State Listen -ErrorAction SilentlyContinue)){exit 0};Start-Sleep -Milliseconds 500}}" >nul 2>&1

rem Sobe o servidor estatico numa janela minimizada.
start "DANFSe Web" /min cmd /c ""%PY%" -m http.server 8020 --bind 127.0.0.1"

rem Espera ate 20s o servidor responder.
powershell -NoProfile -Command "for($i=0;$i -lt 40;$i++){try{(Invoke-WebRequest 'http://127.0.0.1:8020/index.html' -UseBasicParsing -TimeoutSec 1)|Out-Null;exit 0}catch{Start-Sleep -Milliseconds 500}};exit 1"
if errorlevel 1 goto erro

start "" http://127.0.0.1:8020
exit /b

:erro
echo.
echo O servidor nao respondeu. Verifique se o Python esta instalado e no PATH:
echo.
"%PY%" --version
echo.
pause
