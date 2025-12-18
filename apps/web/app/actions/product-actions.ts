'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createProduct(data: {
    name: string;
    description?: string;
    unit: string;
    usageDescription?: string;
    activeIngredient?: string;
    recommendedConcentration?: string;
    stock: number;
    price: number;
    cost: number;
    division: "EXTERMINATION" | "ENTREPRISES";
    type: "CONSUMABLE" | "EQUIPMENT";
}) {
    await prisma.product.create({
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
        },
    });
    revalidatePath('/products');
}

export async function updateProduct(id: string, data: {
    name?: string;
    description?: string;
    unit?: string;
    usageDescription?: string;
    activeIngredient?: string;
    recommendedConcentration?: string;
    stock?: number;
    price?: number;
    cost?: number;
    division?: "EXTERMINATION" | "ENTREPRISES";
    type?: "CONSUMABLE" | "EQUIPMENT";
}) {
    await prisma.product.update({
        where: { id },
        data,
    });
    revalidatePath('/products');
}

export async function deleteProduct(id: string) {
    await prisma.product.delete({
        where: { id },
    });
    revalidatePath('/products');
}
