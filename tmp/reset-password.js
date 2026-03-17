const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const newPassword = '12345';
    const hashed = await bcrypt.hash(newPassword, 12);

    // List all users first
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    console.log('\n=== UTILISATEURS EXISTANTS ===');
    users.forEach(u => console.log(`  - ${u.email} (${u.role}) [actif: ${u.isActive}]`));

    if (users.length === 0) {
        console.log('Aucun utilisateur trouvé! Création du compte admin...');
        const user = await prisma.user.create({
            data: {
                name: 'Samuel',
                email: 'admin@praxiszls.com',
                password: hashed,
                role: 'ADMIN',
                isActive: true,
            }
        });
        console.log('\nCompte créé:', user.email);
    } else {
        // Update ALL admin users (or the first user if no admin)
        const admins = users.filter(u => u.role === 'ADMIN');
        const targets = admins.length > 0 ? admins : [users[0]];

        for (const target of targets) {
            await prisma.user.update({
                where: { id: target.id },
                data: { password: hashed, isActive: true }
            });
            console.log(`\n✅ Mot de passe mis à jour: ${target.email}`);
        }
    }

    console.log('\n=== CONNEXION ===');
    console.log('Email:    ' + (users.find(u => u.role === 'ADMIN')?.email || users[0]?.email || 'admin@praxiszls.com'));
    console.log('Password: 12345');
}

main()
    .catch(e => { console.error('Erreur:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
