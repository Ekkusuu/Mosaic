@echo off
REM Installer for frontend npm packages listed in npm-requirements.txt
cd /d "%~dp0"
setlocal enabledelayedexpansion
set pkgs=
for /f "usebackq delims=" %%a in ("npm-requirements.txt") do (
  set "line=%%a"
  if not "!line!"=="" (
    set "first=!line:~0,1!"
    if not "!first!"=="#" (
      set "pkgs=!pkgs! !line!"
    )
  )
)
if "%pkgs%"=="" (
  echo No packages to install (check npm-requirements.txt).
  exit /b 0
)
echo Installing npm packages:%pkgs%
rem Run npm install with the collected packages
npm install %pkgs%
endlocal
