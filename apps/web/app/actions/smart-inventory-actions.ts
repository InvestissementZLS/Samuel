'use server';

import { prisma } from '@/lib/prisma';

export interface LowStockAlert {
    productId: string;
    materialName: string;
    currentStock: number;
    required: number;
    shortfall: number;
    unit: string;
}

export async function linkServiceMaterial(serviceId: string, materialId: string, quantity: number) {
    try {
        // @ts-ignore
        await prisma.serviceMaterial.upsert({
            where: {
                serviceId_materialId: {
                    serviceId,
                    materialId
                }
            },
            update: { quantity },
            create: {
                serviceId,
                materialId,
                quantity
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Error linking material:", error);
        return { success: false, error: "Failed to link material" };
    }
}

export async function getServiceMaterials(serviceId: string) {
    // @ts-ignore
    return await prisma.serviceMaterial.findMany({
        where: { serviceId },
        include: { material: true }
    });
}

export async function getTechnicianForecast(userId: string, days: number = 7): Promise<LowStockAlert[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // 1. Get Upcoming Jobs for Technician
    const jobs = await prisma.job.findMany({
        where: {
            technicians: { some: { id: userId } },
            scheduledAt: {
                gte: startDate,
                lte: endDate
            },
            status: { not: 'CANCELLED' }
        },
        include: {
            products: { // Look at services scheduled (added via Job Creation or during job)
                include: {
                    product: {
                        include: {
                            // @ts-ignore
                            materialsNeeded: true // Get BOM
                        }
                    }
                }
            }
        }
    });

    // 2. Calculate Total Requirements
    const requirements = new Map<string, { qty: number, name: string, unit: string }>();

    for (const job of jobs) {
        for (const used of job.products) {
            // Only care if it's a SERVICE that has materials defined
            // @ts-ignore
            if (used.product.materialsNeeded && used.product.materialsNeeded.length > 0) {
                // @ts-ignore
                for (const bom of used.product.materialsNeeded) {
                    const totalNeeded = bom.quantity * used.quantity; // BOM qty * Service Ops count

                    const existing = requirements.get(bom.materialId) || {
                        qty: 0,
                        // @ts-ignore
                        name: 'Unknown', // We'd need to fetch name if not eager loaded, but we need simple logic
                        unit: ''
                    };
                    requirements.set(bom.materialId, {
                        qty: existing.qty + totalNeeded,
                        name: existing.name, // Will be filled below if missing
                        unit: existing.unit
                    });
                }
            }
        }
    }

    if (requirements.size === 0) return [];

    // 3. Get Current Stock
    const materialIds = Array.from(requirements.keys());
    const inventory = await prisma.inventoryItem.findMany({
        where: {
            userId,
            productId: { in: materialIds }
        },
        include: { product: true }
    });

    // 4. Compare and Generate Alerts
    const alerts: LowStockAlert[] = [];

    for (const [id, req] of requirements.entries()) {
        const item = inventory.find(i => i.productId === id);
        const currentStock = item ? item.quantity : 0;
        const productName = item ? item.product.name : (await prisma.product.findUnique({ where: { id } }))?.name || "Unknown";
        const unit = item ? item.product.unit : "units";

        if (currentStock < req.qty) {
            alerts.push({
                productId: id,
                materialName: productName,
                currentStock,
                required: req.qty,
                shortfall: req.qty - currentStock,
                unit
            });
        }
    }

    return alerts;
}

export interface AdminForecastAlert {
    technicianId: string;
    technicianName: string;
    alerts: LowStockAlert[];
}

export async function getAllTechnicianForecasts(days: number = 7): Promise<AdminForecastAlert[]> {
    // 1. Get all technicians
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', isActive: true }
    });

    const results: AdminForecastAlert[] = [];

    // 2. Run forecast for each
    for (const tech of technicians) {
        const alerts = await getTechnicianForecast(tech.id, days);
        if (alerts.length > 0) {
            results.push({
                technicianId: tech.id,
                technicianName: tech.name || tech.email,
                alerts
            });
        }
    }

    return results;
}
