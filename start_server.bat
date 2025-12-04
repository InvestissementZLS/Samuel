@echo off
cd /d "%~dp0"

echo Cleaning cache...
if exist "apps\web\.next" rmdir /s /q "apps\web\.next"

echo Checking for Node.js...
node -v

echo Starting development server...
echo (Note: If you see "Internal Server Error", run setup_db.bat first!)
call npm run dev
pause
