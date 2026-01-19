'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { SeriesBuilder } from '@/components/settings/series-builder';

export function SeriesView({ seriesList, products }: { seriesList: any[], products: any[] }) {
    const { t } = useLanguage();

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-2">{t.settings.subSeriesTitle}</h1>
            <p className="text-gray-500 mb-8">{t.settings.subSeriesDesc}</p>

            <SeriesBuilder initialSeries={seriesList} availableProducts={products} />
        </div>
    );
}
