process.env.DATABASE_URL = "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Mise à jour des utilisateurs...");
        const res = await prisma.user.updateMany({
            data: { isActive: true }
        });
        console.log("Succès ! Techniciens réactivés : " + res.count);

        const users = await prisma.user.findMany({ select: { name: true, email: true, isActive: true, divisions: true }});
        console.log(users);
    } catch(e) {
        console.error(e);
    }
}
run().finally(() => prisma.$disconnect());
