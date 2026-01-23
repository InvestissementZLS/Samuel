
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migratePermissions() {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to migrate...`);

    for (const user of users) {
        if (!user.divisions || user.divisions.length === 0) continue;

        console.log(`Migrating user: ${user.email}`);

        for (const division of user.divisions) {
            // Create access record for each division
            // Copying global permissions to each division to maintain current behavior
            await prisma.userDivisionAccess.upsert({
                where: {
                    userId_division: {
                        userId: user.id,
                        division: division
                    }
                },
                update: {
                    // If it exists, we update just to be safe, but usually this runs once
                    role: user.role,
                    canViewReports: user.canViewReports,
                    canManageTimesheets: user.canManageTimesheets,
                    canManageExpenses: user.canManageExpenses,
                    canManageUsers: user.canManageUsers,
                    canManageCommissions: user.canManageCommissions,
                },
                create: {
                    userId: user.id,
                    division: division,
                    role: user.role,
                    canViewReports: user.canViewReports,
                    canManageTimesheets: user.canManageTimesheets,
                    canManageExpenses: user.canManageExpenses,
                    canManageUsers: user.canManageUsers,
                    canManageCommissions: user.canManageCommissions,
                }
            });
        }
    }
    console.log('Migration complete.');
}

migratePermissions()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
