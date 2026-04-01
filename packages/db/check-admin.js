process.env.DATABASE_URL = "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { role: 'ADMIN' }}).then(u => console.log('ADMIN STATUS:', u)).catch(console.error).finally(()=>prisma.$disconnect());
