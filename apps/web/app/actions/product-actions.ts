'use server';

import { prisma } from '@/lib/prisma';
import { ProductType } from '@prisma/client';

export async function searchProducts(query: string) {
    if (!query) return [];

    return await prisma.product.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive' // Requires pg_trgm or adequate collation, or simple ILIKE
            }
        },
        take: 10
    });
}

export async function createQuickService(name: string) {
    // Check if exists
    const existing = await prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) return existing;

    return await prisma.product.create({
        data: {
            name,
            type: 'SERVICE' as ProductType, // Ensure TypeScript is happy with the enum
            unit: 'Service',
            price: 0 // Default
        }
    });
}
