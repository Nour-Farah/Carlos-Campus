@echo off
cd /d "%~dp0"
echo This enables HTTPS for CampusLoop on this computer.
echo It trusts a localhost-only certificate for your Windows user.
echo It does not publish the website to the internet.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-https.ps1" -Trust
if errorlevel 1 (
 echo HTTPS setup failed. Review the error above.
 pause
 exit /b 1
)
echo Restart CampusLoop with START_CAMPUSLOOP.bat, then open https://localhost:3443
pause
