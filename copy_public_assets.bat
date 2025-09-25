@echo off
setlocal

REM Copies the web assets from the original source directory into madia.new\public.
REM Usage: copy_public_assets.bat "C:\path\to\original\public"

if "%~1"=="" (
    echo Usage: %~nx0 "^<source_directory^>"
    exit /b 1
)

set "SOURCE_DIR=%~1"
set "TARGET_DIR=%~dp0madia.new\public"

if not exist "%TARGET_DIR%" (
    echo Target directory "%TARGET_DIR%" does not exist.
    exit /b 1
)

if not exist "%SOURCE_DIR%\index.html" (
    echo Could not find index.html in "%SOURCE_DIR%".
    exit /b 1
)

if not exist "%SOURCE_DIR%\script.js" (
    echo Could not find script.js in "%SOURCE_DIR%".
    exit /b 1
)

if not exist "%SOURCE_DIR%\styles.css" (
    echo Could not find styles.css in "%SOURCE_DIR%".
    exit /b 1
)

copy /Y "%SOURCE_DIR%\index.html" "%TARGET_DIR%\" >nul
copy /Y "%SOURCE_DIR%\script.js" "%TARGET_DIR%\" >nul
copy /Y "%SOURCE_DIR%\styles.css" "%TARGET_DIR%\" >nul

if exist "%SOURCE_DIR%\images" (
    xcopy "%SOURCE_DIR%\images" "%TARGET_DIR%\images" /E /I /Y >nul
)

echo Files copied from "%SOURCE_DIR%" to "%TARGET_DIR%".
exit /b 0
