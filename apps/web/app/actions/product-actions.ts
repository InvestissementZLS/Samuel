'use server';

import { prisma } from '@/lib/prisma';
import { ProductType, Division } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function searchProducts(query: string) {
    if (!query) return [];

    return await prisma.product.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive'
            }
        },
        take: 10
    });
}

export async function createQuickService(name: string) {
    const existing = await prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) return existing;

    return await prisma.product.create({
        data: {
            name,
            type: 'SERVICE' as ProductType,
            unit: 'Service',
            price: 0
        }
    });
}

interface CreateProductData {
    name: string;
    description?: string;
    unit: string;
    usageDescription?: string;
    activeIngredient?: string;
    recommendedConcentration?: string;
    stock: number;
    price: number;
    cost: number;
    division: Division;
    type: ProductType;
    isCommissionEligible?: boolean;
    warrantyInfo?: string;
    durationMinutes?: number;
    minTechnicians?: number;
    materials?: { id: string; quantity: number }[];
}

export async function createProduct(data: CreateProductData) {
    try {
        const materialsToCreate = data.materials?.filter(m => m.id) || [];

        const product = await prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                unit: data.unit || 'ml',
                usageDescription: data.usageDescription,
                activeIngredient: data.activeIngredient,
                recommendedConcentration: data.recommendedConcentration,
                stock: Math.round(data.stock || 0), // Ensure Integer
                price: Number(data.price || 0),
                cost: Number(data.cost || 0),
                division: data.division,
                type: data.type,
                // @ts-ignore
                isCommissionEligible: data.isCommissionEligible || false,
                // @ts-ignore
                warrantyInfo: data.warrantyInfo,
                // @ts-ignore
                durationMinutes: Number(data.durationMinutes || 60),
                // @ts-ignore
                minTechnicians: Number(data.minTechnicians || 1),
                ...(materialsToCreate.length > 0 && {
                    materialsNeeded: {
                        create: materialsToCreate.map(m => ({
                            materialId: m.id,
                            quantity: Number(m.quantity || 0)
                        }))
                    }
                })
            }
        });
        revalidatePath('/products');
        return product;
    } catch (error) {
        console.error("Error creating product:", error);
        throw error;
    }
}

export async function updateProduct(id: string, data: Partial<CreateProductData>) {
    try {
        const materialsToSync = data.materials?.filter(m => m.id) || [];

        // Transaction to update materials
        const [product] = await prisma.$transaction([
            prisma.product.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    unit: data.unit,
                    usageDescription: data.usageDescription,
                    stock: data.stock !== undefined ? Math.round(Number(data.stock)) : undefined,
                    price: data.price !== undefined ? Number(data.price) : undefined,
                    cost: data.cost !== undefined ? Number(data.cost) : undefined,
                    division: data.division,
                    type: data.type,
                    // @ts-ignore
                    isCommissionEligible: data.isCommissionEligible,
                    // @ts-ignore
                    warrantyInfo: data.warrantyInfo,
                    // @ts-ignore
                    durationMinutes: data.durationMinutes !== undefined ? Number(data.durationMinutes) : undefined,
                    // @ts-ignore
                    minTechnicians: data.minTechnicians !== undefined ? Number(data.minTechnicians) : undefined,
                }
            }),
            // If materials provided (array exists), sync them
            ...(data.materials ? [
                // Delete old
                prisma.serviceMaterial.deleteMany({ where: { serviceId: id } }),
                // Create new
                prisma.serviceMaterial.createMany({
                    data: materialsToSync.map(m => ({
                        serviceId: id,
                        materialId: m.id,
                        quantity: Number(m.quantity || 0)
                    }))
                })
            ] : []),
            // Fetch updated to return
            prisma.product.findUnique({ where: { id } })
        ]);

        revalidatePath('/products');
        return product;
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}

export async function getConsumables() {
    return await prisma.product.findMany({
        where: { type: 'CONSUMABLE' },
        select: { id: true, name: true, unit: true }
    });
}

export async function getProductDetails(id: string) {
    return await prisma.product.findUnique({
        where: { id },
        include: {
            materialsNeeded: {
                include: { material: true }
            }
        }
    });
}

export async function deleteProduct(id: string) {
    await prisma.product.delete({
        where: { id }
    });
    revalidatePath('/products');
}
