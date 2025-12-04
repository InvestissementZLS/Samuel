'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AuditStatus, ProductType } from "@prisma/client";

export async function getInventory(userId?: string) {
    try {
        const inventory = await prisma.inventoryItem.findMany({
            where: {
                userId: userId || null // null for warehouse
            },
            include: {
                product: true
            }
        });
        return { success: true, data: inventory };
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return { success: false, error: "Failed to fetch inventory" };
    }
}

export async function getAllProducts() {
    return await prisma.product.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function transferStock(
    productId: string,
    fromUserId: string | null, // null = Warehouse
    toUserId: string | null,   // null = Warehouse
    quantity: number
) {
    try {
        if (quantity <= 0) throw new Error("Quantity must be positive");

        // 1. Check source availability
        const sourceItem = await prisma.inventoryItem.findFirst({
            where: {
                productId,
                userId: fromUserId
            }
        });

        if (!sourceItem || sourceItem.quantity < quantity) {
            return { success: false, message: "Insufficient stock in source location" };
        }

        // 2. Decrement source
        await prisma.inventoryItem.update({
            where: { id: sourceItem.id },
            data: { quantity: { decrement: quantity } }
        });

        // 3. Increment destination (create if not exists)
        const destItem = await prisma.inventoryItem.findFirst({
            where: {
                productId,
                userId: toUserId
            }
        });

        if (destItem) {
            await prisma.inventoryItem.update({
                where: { id: destItem.id },
                data: { quantity: { increment: quantity } }
            });
        } else {
            await prisma.inventoryItem.create({
                data: {
                    productId,
                    userId: toUserId,
                    quantity
                }
            });
        }

        revalidatePath('/inventory');
        return { success: true, message: "Transfer successful" };

    } catch (error) {
        console.error("Error transferring stock:", error);
        return { success: false, message: "Transfer failed" };
    }
}

export async function submitAudit(
    technicianId: string,
    items: { productId: string; actualQuantity: number; notes?: string }[]
) {
    try {
        // Fetch current expected quantities
        const currentInventory = await prisma.inventoryItem.findMany({
            where: { userId: technicianId }
        });

        const auditItems = items.map(item => {
            const current = currentInventory.find(i => i.productId === item.productId);
            return {
                productId: item.productId,
                expectedQuantity: current?.quantity || 0,
                actualQuantity: item.actualQuantity,
                notes: item.notes
            };
        });

        await prisma.inventoryAudit.create({
            data: {
                technicianId,
                status: 'PENDING',
                items: {
                    create: auditItems
                }
            }
        });

        revalidatePath('/inventory');
        return { success: true, message: "Audit submitted successfully" };

    } catch (error) {
        console.error("Error submitting audit:", error);
        return { success: false, message: "Failed to submit audit" };
    }
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

        if (!audit) throw new Error("Audit not found");

        if (action === 'REJECT') {
            await prisma.inventoryAudit.update({
                where: { id: auditId },
                data: { status: 'REJECTED' }
            });
            revalidatePath('/inventory');
            return { success: true, message: "Audit rejected" };
        }

        // If Approved, update inventory to match actual counts
        await prisma.$transaction(async (tx) => {
            for (const item of audit.items) {
                if (item.actualQuantity !== item.expectedQuantity) {
                    const existingItem = await tx.inventoryItem.findFirst({
                        where: {
                            productId: item.productId,
                            userId: audit.technicianId
                        }
                    });

                    if (existingItem) {
                        await tx.inventoryItem.update({
                            where: { id: existingItem.id },
                            data: { quantity: item.actualQuantity }
                        });
                    } else {
                        await tx.inventoryItem.create({
                            data: {
                                productId: item.productId,
                                userId: audit.technicianId,
                                quantity: item.actualQuantity
                            }
                        });
                    }
                }
            }

            await tx.inventoryAudit.update({
                where: { id: auditId },
                data: { status: 'APPROVED' }
            });
        });

        revalidatePath('/inventory');
        return { success: true, message: "Audit approved and inventory updated" };

    } catch (error) {
        console.error("Error reconciling audit:", error);
        return { success: false, message: "Failed to reconcile audit" };
    }
}

export async function getLastAudit(userId: string) {
    const audit = await prisma.inventoryAudit.findFirst({
        where: { technicianId: userId },
        orderBy: { date: 'desc' }
    });
    return audit;
}
