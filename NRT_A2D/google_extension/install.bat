@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set MANIFEST=%SCRIPT_DIR%native_host_manifest.json

echo.
echo This will register the native messaging host with Chrome.
echo.
set /p EXTENSION_ID=Paste your extension ID (from chrome://extensions, with Developer mode on):

set ESCAPED_DIR=!SCRIPT_DIR:\=\\!

(
echo {
echo   "name": "com.clicksave.host",
echo   "description": "Click ^& Save native messaging host",
echo   "path": "!ESCAPED_DIR!native_host.bat",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://!EXTENSION_ID!/"
echo   ]
echo }
) > "%MANIFEST%"

reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.clicksave.host" /ve /t REG_SZ /d "%MANIFEST%" /f

echo.
echo Done. Manifest written to: %MANIFEST%
echo Registry key registered under HKCU\Software\Google\Chrome\NativeMessagingHosts\com.clicksave.host
echo.
echo Reminder: open native_host.py and set save_folder to wherever you actually want files saved.
echo.
pause
