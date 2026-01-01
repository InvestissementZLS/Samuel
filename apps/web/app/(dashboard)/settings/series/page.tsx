import { prisma } from '@/lib/prisma';
import { SeriesBuilder } from '@/components/settings/series-builder';

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

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-2">Service Series / Packages</h1>
            <p className="text-gray-500 mb-8">Create multi-step service plans (e.g. Mice Treatment: 3 Visits).</p>

            <SeriesBuilder initialSeries={seriesList} availableProducts={products} />
        </div>
    );
}
