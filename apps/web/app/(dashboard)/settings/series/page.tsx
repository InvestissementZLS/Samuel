import { prisma } from '@/lib/prisma';
import { SeriesView } from '@/components/settings/series-view';

export default async function SeriesPage() {
    // @ts-ignore
    const products = await prisma.product.findMany({
        where: { type: 'SERVICE' },
        orderBy: { name: 'asc' }
    });

    // @ts-ignore
    const seriesList = await prisma.productSeries.findMany({
        include: { steps: { include: { product: true }, orderBy: { order: 'asc' } } },
        orderBy: { name: 'asc' }
    });

    return <SeriesView seriesList={seriesList} products={products} />;
}
