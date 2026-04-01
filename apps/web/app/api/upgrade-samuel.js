process.env.DATABASE_URL="postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function upgrade() {
    console.log("Upgrading all ADMINs to have God Mode permissions...");
    const res = await prisma.user.updateMany({
        where: { role: 'ADMIN' },
        data: {
            canManageDivisions: true,
            canManageCommissions: true,
            canViewReports: true,
            canManageTimesheets: true,
            canManageExpenses: true,
            canManageUsers: true
        }
    });
    console.log("Upgraded", res.count, "admins.");
}
upgrade().catch(console.error).finally(() => prisma.$disconnect());
