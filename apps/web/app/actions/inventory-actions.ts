'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getProductStockDetails(productId: string) {
    // Get all inventory items for this product (Warehouse + Users)
    const inventoryItems = await prisma.inventoryItem.findMany({
        where: { productId },
        include: {
            user: {
                select: { id: true, name: true, email: true }
            }
        }
    });

    // Also get the main product stock as "Global/Legacy" if needed, 
    // but ideally we treat the main product.stock as "Unassigned/Warehouse" 
    // OR we use a specific InventoryItem with userId=null as Warehouse.
    // For this implementation, let's assume Product.stock is the MASTER total, 
    // and InventoryItems tracks the distribution.
    // actually, let's try to migrate to a cleaner model where:
    // Warehouse Stock = Product.stock - Sum(User Stocks).
    // Or better: We create an InventoryItem where userId is NULL for Warehouse.

    return inventoryItems;
}

export async function assignStockToUser(productId: string, userId: string, quantity: number) {
    if (quantity <= 0) return { success: false, error: "Quantity must be positive" };

    try {
        // 1. Check if user already has an inventory record
        // Upsert is perfect here
        await prisma.inventoryItem.upsert({
            where: {
                productId_userId: {
                    productId,
                    userId
                }
            },
            update: {
                quantity: { increment: quantity }
            },
            create: {
                productId,
                userId,
                quantity
            }
        });

        // 2. Decrement main product stock? 
        // If Product.stock represents "Available in Warehouse", then Yes.
        // If Product.stock represents "Total Company Assets", then No.
        // Let's assume Product.stock is "Total Company Assets".
        // But the user specifically wants to know "Where is my stock".
        // So we need to fetch "Unassigned Stock".
        // Let's adhere to: Product.stock is TOTAL.
        // We just track distribution.

        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        console.error("Error assigning stock:", error);
        return { success: false, error: "Failed to assign stock" };
    }
}

export async function removeStockFromUser(productId: string, userId: string, quantity: number) {
    try {
        const currentItem = await prisma.inventoryItem.findUnique({
            where: { productId_userId: { productId, userId } }
        });

        if (!currentItem || currentItem.quantity < quantity) {
            return { success: false, error: "Insufficient user stock" };
        }

        await prisma.inventoryItem.update({
            where: { productId_userId: { productId, userId } },
            data: { quantity: { decrement: quantity } }
        });

        // Cleanup if 0?
        // await prisma.inventoryItem.deleteMany({ where: { quantity: 0 } });

        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        console.error("Error removing stock:", error);
        return { success: false, error: "Failed to remove stock" };
    }
}

export async function getTechnicians() {
    return await prisma.user.findMany({
        where: { role: 'TECHNICIAN', isActive: true },
        select: { id: true, name: true }
    });
}

// Resurrected functions
export async function getInventory(userId?: string) {
    try {
        const where = userId ? { userId } : { userId: null }; // userId null = warehouse
        // However, existing data might not have userId null for warehouse if we used Product.stock as master.
        // Let's adapt: If userId is provided, return their items.
        // If userId is undefined (Warehouse), return items where userId is null.

        // But previously the dashboard used getInventory(undefined) for WAREHOUSE.

        const inventory = await prisma.inventoryItem.findMany({
            where: userId ? { userId } : { userId: null },
            include: {
                product: true
            }
        });
        return { success: true, data: inventory };
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return { success: false, error: "Failed" };
    }
}

export async function getAllProducts() {
    return await prisma.product.findMany();
}

export async function getAudits() {
    return await prisma.inventoryAudit.findMany({
        include: {
            technician: true,
            items: {
                include: { product: true }
            }
        },
        orderBy: { date: 'desc' }
    });
}

export async function reconcileAudit(auditId: string, action: 'APPROVE' | 'REJECT') {
    try {
        const audit = await prisma.inventoryAudit.findUnique({
            where: { id: auditId },
            include: { items: true }
        });

        if (!audit) return { success: false, message: "Audit not found" };

        if (action === 'REJECT') {
            await prisma.inventoryAudit.update({
                where: { id: auditId },
                data: { status: 'REJECTED' }
            });
            return { success: true, message: "Audit rejected" };
        }

        // Approve: Update inventory
        await prisma.$transaction(async (tx) => {
            await tx.inventoryAudit.update({
                where: { id: auditId },
                data: { status: 'APPROVED' }
            });

            for (const item of audit.items) {
                // Update specific user inventory or warehouse?
                // Audit belongs to a technician, so update their inventory
                await tx.inventoryItem.upsert({
                    where: {
                        productId_userId: {
                            productId: item.productId,
                            userId: audit.technicianId
                        }
                    },
                    update: { quantity: item.actualQuantity },
                    create: {
                        productId: item.productId,
                        userId: audit.technicianId,
                        quantity: item.actualQuantity
                    }
                });
            }
        });

        revalidatePath('/inventory');
        return { success: true, message: "Audit approved and inventory updated" };
    } catch (error) {
        console.error("Error reconciling audit:", error);
        return { success: false, message: "Error" };
    }
}

export async function getLastAudit(userId: string) {
    return await prisma.inventoryAudit.findFirst({
        where: { technicianId: userId },
        orderBy: { date: 'desc' }
    });
}
