const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dir = 'C:/Users/samue/Videos/CSV Exterminationzls';
const files = {
    customers: path.join(dir, 'customers (1).xlsx'),
    estimates: path.join(dir, 'estimate.xlsx'),
    invoices: path.join(dir, 'invoice.xlsx')
};

async function migrateGorillaDesk() {
    console.log("🚀 Démarrage de la migration de la magie GorillaDesk vers Praxis...\n");

    // 1. Lire tous les fichiers
    const readExcel = (filePath) => XLSX.utils.sheet_to_json(XLSX.readFile(filePath).Sheets[XLSX.readFile(filePath).SheetNames[0]]);

    console.log("📥 Lecture des fichiers Excel...");
    const customersData = readExcel(files.customers);
    const estimatesData = readExcel(files.estimates);
    const invoicesData = readExcel(files.invoices);

    console.log(`📊 Trouvé : ${customersData.length} clients, ${estimatesData.length} devis, ${invoicesData.length} factures.`);

    // Dictionnaire pour lier Account# de GorillaDesk à Client ID Praxis
    const accountMap = new Map();
    // Dictionnaire pour lier Account# à Property ID Praxis (on assume 1 propriété principale par import pour l'instant)
    const propertyMap = new Map();

    // --- PHASE 1 : CLIENTS ET PROPRIÉTÉS ---
    console.log("\n👤 Phase 1 : Création des Clients et Adresses...");
    let clientsCreated = 0;

    for (const gdClient of customersData) {
        if (!gdClient['Account #']) continue;
        const accountId = String(gdClient['Account #']).trim();

        let clientName = gdClient['Company'] || gdClient['Customer'];
        if (!clientName && gdClient['First Name'] && gdClient['Last Name']) {
            clientName = `${gdClient['First Name']} ${gdClient['Last Name']}`;
        }

        if (!clientName) clientName = `Client Inconnu (${accountId})`;

        try {
            // Créer le client dans Praxis
            const newClient = await prisma.client.create({
                data: {
                    name: String(clientName).trim(),
                    email: gdClient['Emails'] || null,
                    phone: gdClient['Phone'] || gdClient['phones_mobile'] || null,
                    billingAddress: gdClient['Billing Address'] || null,
                    divisions: ['EXTERMINATION']
                }
            });
            accountMap.set(accountId, newClient.id);
            clientsCreated++;

            // Créer sa propriété
            if (gdClient['Service Address']) {
                const newProperty = await prisma.property.create({
                    data: {
                        clientId: newClient.id,
                        address: gdClient['Service Address'],
                        city: gdClient['Service Address City'] || null,
                        postalCode: gdClient['Service Address Zip'] || null,
                        province: gdClient['Service Address State'] || 'QC',
                    }
                });
                propertyMap.set(accountId, newProperty.id);
            }
        } catch (e) {
            console.error(`Erreur création client ${clientName}: ${e.message}`);
        }
    }
    console.log(`✅ ${clientsCreated} Clients créés en base de données.`);

    // --- PHASE 2 : DEVIS (ESTIMATES) ---
    console.log("\n📝 Phase 2 : Importation des Devis...");
    let quotesCreated = 0;

    for (const gdEst of estimatesData) {
        if (!gdEst['Account #']) continue;
        const accountId = String(gdEst['Account #']).trim();
        const praxisClientId = accountMap.get(accountId);
        const praxisPropertyId = propertyMap.get(accountId);

        if (!praxisClientId) continue; // Ignore orphan estimates

        // Map Status
        let status = 'DRAFT';
        const rawStatus = (gdEst['Status'] || '').toLowerCase();
        if (rawStatus.includes('won') || rawStatus.includes('accepted') || gdEst['Signature'] !== 'Draft') status = 'ACCEPTED';
        else if (rawStatus.includes('lost') || rawStatus.includes('rejected')) status = 'REJECTED';
        else if (rawStatus.includes('sent')) status = 'SENT';

        // Clean Total
        const totalRaw = String(gdEst['Total'] || '0').replace(/[^0-9.-]+/g, "");
        const total = parseFloat(totalRaw) || 0;

        try {
            await prisma.quote.create({
                data: {
                    clientId: praxisClientId,
                    propertyId: praxisPropertyId || null,
                    status: status,
                    total: total,
                    description: `Importé de GorillaDesk (Estimate #${gdEst['Estimate'] || 'Inconnu'})`,
                    division: 'EXTERMINATION',
                    number: gdEst['Estimate'] ? `GD-${gdEst['Estimate']}` : undefined,
                    notes: gdEst['Created By'] ? `Créé par: ${gdEst['Created By']}` : null
                }
            });
            quotesCreated++;
        } catch (e) {
            console.error(`Erreur création devis pour compte ${accountId}: ${e.message}`);
        }
    }
    console.log(`✅ ${quotesCreated} Devis liés aux clients.`);

    // --- PHASE 3 : FACTURES (INVOICES) ---
    console.log("\n💰 Phase 3 : Importation des Factures et alertes...");
    let invoicesCreated = 0;
    let paymentActionNeeded = 0;

    for (const gdInv of invoicesData) {
        if (!gdInv['Account #']) continue;
        const accountId = String(gdInv['Account #']).trim();
        const praxisClientId = accountMap.get(accountId);

        if (!praxisClientId) continue;

        // Map Status
        let status = 'DRAFT';
        let amountPaid = 0;
        const rawStatus = (gdInv['Status'] || '').toLowerCase();
        const totalRaw = String(gdInv['Total'] || '0').replace(/[^0-9.-]+/g, "");
        const total = parseFloat(totalRaw) || 0;

        // GorillaDesk exports 'Status' like 'Paid', 'Past Due', 'Sent', etc.
        if (rawStatus.includes('paid')) {
            status = 'PAID';
            amountPaid = total;
        } else if (rawStatus.includes('past') || rawStatus.includes('overdue')) {
            status = 'OVERDUE';
            paymentActionNeeded++;
        } else if (rawStatus.includes('sent') || rawStatus.includes('unpaid')) {
            status = 'SENT';
            paymentActionNeeded++;
        }

        try {
            await prisma.invoice.create({
                data: {
                    clientId: praxisClientId,
                    status: status,
                    total: total,
                    amountPaid: amountPaid,
                    description: gdInv['Job'] || `Facture importée de GorillaDesk`,
                    division: 'EXTERMINATION',
                    number: gdInv['Invoice #'] ? `GD-${gdInv['Invoice #']}` : undefined,
                    notes: `Fréquence historique: ${gdInv['Frequency'] || 'Inconnue'}`
                }
            });
            invoicesCreated++;
        } catch (e) {
            console.error(`Erreur création facture pour compte ${accountId}: ${e.message}`);
        }
    }
    console.log(`✅ ${invoicesCreated} Factures créées (dont ${paymentActionNeeded} qui généreront des alertes d'impayés).`);

    console.log("\n🎉 IMPORTATION RÉUSSIE AVEC SUCCÈS ! Les relations ont été créées dans la base centrale.");
}

migrateGorillaDesk()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
