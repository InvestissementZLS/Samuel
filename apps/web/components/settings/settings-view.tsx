'use client';

import { useLanguage } from "@/components/providers/language-provider";
import { PasswordSettings } from "./password-settings";
import { TechnicianLanguageSettings } from "./technician-language-settings";
import Link from 'next/link';

export function SettingsView({ technicians }: { technicians: any[] }) {
    const { t } = useLanguage();

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">{t.settings.title}</h1>
            <div className="grid gap-8 max-w-2xl">
                <PasswordSettings />
                <div className="border-t pt-8">
                    <TechnicianLanguageSettings technicians={technicians} />
                </div>
                {/* Warranties Section */}
                <div className="border-t pt-8">
                    <div className="bg-white p-6 rounded-lg border hover:shadow-sm transition-shadow">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.settings.warrantiesTitle}</h3>
                        <p className="text-gray-500 mb-4">{t.settings.warrantiesDesc}</p>
                        <Link
                            href="/settings/warranties"
                            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 mr-4"
                        >
                            {t.settings.manageWarranties}
                        </Link>
                        <Link
                            href="/settings/series"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700"
                        >
                            {t.settings.manageSeries}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
