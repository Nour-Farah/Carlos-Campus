@echo off
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Temp\campusloop-runtime\node-v22.20.0-win-x64\node.exe" set "PATH=%LOCALAPPDATA%\Temp\campusloop-runtime\node-v22.20.0-win-x64;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 LTS or newer from https://nodejs.org and run this file again.
 pause
 exit /b 1
)
if not exist node_modules call npm install
if errorlevel 1 goto failure
call npm run setup
if errorlevel 1 goto failure
call npm start
pause
exit /b
:failure
echo Setup failed. Review the error above.
pause
exit /b 1
