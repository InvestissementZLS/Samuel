'use server';

import { prisma } from '@/lib/prisma';
import { Division } from '@prisma/client';

export interface ImportClientData {
    name: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
    propertyAddress?: string;
    propertyCity?: string;
    propertyPostalCode?: string;
}

export async function importGorillaDeskClients(clients: ImportClientData[], division: Division = 'EXTERMINATION') {
    if (!clients || clients.length === 0) {
        return { success: false, error: 'Aucun client à importer.' };
    }

    let successCount = 0;
    let errorCount = 0;

    // To avoid overloading the DB with thousands of simultaneous queries, 
    // process in chunks or sequentially.
    for (const data of clients) {
        try {
            // Check if client with exact name exists (basic deduplication)
            // Advanced deduplication would use email or phone
            const existingClient = await prisma.client.findFirst({
                where: { name: data.name }
            });

            if (existingClient) {
                // Determine if we need to add the division if it's missing
                const hasDivision = existingClient.divisions.includes(division);
                if (!hasDivision) {
                    await prisma.client.update({
                        where: { id: existingClient.id },
                        data: {
                            divisions: { push: division }
                        }
                    });
                }

                // Add property if not exists
                if (data.propertyAddress) {
                    const existingProperty = await prisma.property.findFirst({
                        where: {
                            clientId: existingClient.id,
                            address: { contains: data.propertyAddress }
                        }
                    });

                    if (!existingProperty) {
                        await prisma.property.create({
                            data: {
                                clientId: existingClient.id,
                                address: data.propertyAddress,
                                city: data.propertyCity,
                                postalCode: data.propertyPostalCode,
                            }
                        });
                    }
                }
                successCount++;
                continue;
            }

            // Create new client & property
            await prisma.client.create({
                data: {
                    name: data.name,
                    email: data.email || null,
                    phone: data.phone || null,
                    billingAddress: data.billingAddress || null,
                    divisions: [division],
                    properties: data.propertyAddress ? {
                        create: {
                            address: data.propertyAddress,
                            city: data.propertyCity,
                            postalCode: data.propertyPostalCode,
                        }
                    } : undefined
                }
            });
            successCount++;
        } catch (error) {
            console.error(`Erreur d'importation pour ${data.name}:`, error);
            errorCount++;
        }
    }

    return {
        success: true,
        imported: successCount,
        errors: errorCount
    };
}
