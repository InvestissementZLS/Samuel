@echo off
cd /d "%~dp0"

echo Setting up Environment Variables...
copy "packages\db\.env" ".env" >nul

echo Pushing Database Schema to Supabase...
echo (This output is being saved to db_log.txt)
set DEBUG=*
call npx prisma db push --schema=packages/db/prisma/schema.prisma > db_log.txt 2>&1

echo.
echo ==========================================
echo LOG CONTENT (db_log.txt):
echo ==========================================
type db_log.txt
echo.
echo ==========================================
pause
