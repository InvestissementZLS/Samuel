@echo off
call npx prisma generate --schema=packages/db/prisma/schema.prisma
call npx prisma db push --schema=packages/db/prisma/schema.prisma
exit /b 0
