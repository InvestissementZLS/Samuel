
import { prisma } from "./apps/web/lib/prisma";

async function main() {
    const users = await prisma.user.findMany({
        where: {
            name: {
                contains: "Samuel",
                mode: "insensitive",
            },
        },
    });

    console.log("Found users:", users);

    if (users.length === 0) {
        console.log("No user found with name 'Samuel'");
        return;
    }

    for (const user of users) {
        console.log(`Updating user: ${user.name} (${user.email})`);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                canManageCommissions: true,
                divisions: ["EXTERMINATION", "ENTREPRISES"],
            },
        });
        console.log("Update complete.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
