'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { WarrantySettings } from '@/components/settings/warranty-settings';

export function WarrantyView({ warranties }: { warranties: any[] }) {
    const { t } = useLanguage();

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">{t.settings.subWarrantyTitle}</h1>
            <p className="text-gray-500 mb-8">{t.settings.subWarrantyDesc}</p>

            <WarrantySettings initialWarranties={warranties} />
        </div>
    );
}
