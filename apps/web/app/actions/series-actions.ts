'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getProductSeries() {
    // @ts-ignore
    return await prisma.productSeries.findMany({
        include: { steps: { include: { product: true } } },
        orderBy: { name: 'asc' }
    });
}

export async function createProductSeries(name: string, description: string) {
    // @ts-ignore
    const series = await prisma.productSeries.create({
        data: { name, description }
    });
    revalidatePath('/settings/series');
    return series;
}

export async function addSeriesStep(seriesId: string, productId: string, delayDays: number, seasonality: 'ALL_YEAR' | 'SPRING_ONLY', isWeatherDependent: boolean) {
    // @ts-ignore
    const existingSteps = await prisma.seriesStep.count({ where: { seriesId } });

    // @ts-ignore
    await prisma.seriesStep.create({
        data: {
            seriesId,
            productId,
            order: existingSteps + 1,
            delayDays,
            seasonality,
            isWeatherDependent
        }
    });
    revalidatePath('/settings/series');
}

export async function deleteProductSeries(id: string) {
    // @ts-ignore
    await prisma.productSeries.delete({ where: { id } });
    revalidatePath('/settings/series');
}
