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
    const product = await prisma.product.create({
        data: {
            name: data.name,
            description: data.description,
            unit: data.unit,
            usageDescription: data.usageDescription,
            activeIngredient: data.activeIngredient,
            recommendedConcentration: data.recommendedConcentration,
            stock: data.stock,
            price: data.price,
            cost: data.cost,
            division: data.division,
            type: data.type,
            // @ts-ignore
            isCommissionEligible: data.isCommissionEligible || false,
            // @ts-ignore
            warrantyInfo: data.warrantyInfo,
            // @ts-ignore
            durationMinutes: data.durationMinutes || 60,
            // @ts-ignore
            minTechnicians: data.minTechnicians || 1,
            materialsNeeded: {
                create: data.materials?.filter(m => m.id)?.map(m => ({
                    materialId: m.id,
                    quantity: m.quantity
                }))
            }
        }
    });
    revalidatePath('/products');
    return product;
}

export async function updateProduct(id: string, data: Partial<CreateProductData>) {
    // Transaction to update materials
    const [product] = await prisma.$transaction([
        prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                unit: data.unit,
                usageDescription: data.usageDescription,
                stock: data.stock !== undefined ? Number(data.stock) : undefined,
                price: data.price !== undefined ? Number(data.price) : undefined,
                cost: data.cost !== undefined ? Number(data.cost) : undefined,
                division: data.division,
                type: data.type,
                // @ts-ignore
                isCommissionEligible: data.isCommissionEligible,
                // @ts-ignore
                warrantyInfo: data.warrantyInfo,
                // @ts-ignore
                durationMinutes: data.durationMinutes,
                // @ts-ignore
                minTechnicians: data.minTechnicians,
            }
        }),
        // If materials provided, sync them
        ...(data.materials ? [
            // Delete old
            prisma.serviceMaterial.deleteMany({ where: { serviceId: id } }),
            // Create new
            prisma.serviceMaterial.createMany({
                data: data.materials.filter(m => m.id).map(m => ({
                    serviceId: id,
                    materialId: m.id,
                    quantity: m.quantity
                }))
            })
        ] : []),
        // Fetch updated to return
        prisma.product.findUnique({ where: { id } })
    ]);

    revalidatePath('/products');
    return product;
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
