import { PasswordSettings } from "@/components/settings/password-settings";
import { TechnicianLanguageSettings } from "@/components/settings/technician-language-settings";
import { getTechnicians } from "@/app/actions/technician-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const technicians = await getTechnicians();

    // Ensure technicians have a language property, default to 'FR' if missing (though DB default handles it)
    const techniciansWithLanguage = technicians.map(t => ({
        ...t,
        language: (t as any).language || 'FR'
    }));

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <div className="grid gap-8 max-w-2xl">
                <PasswordSettings />
                <div className="border-t pt-8">
                    <TechnicianLanguageSettings technicians={techniciansWithLanguage as any} />
                </div>
                {/* Warranties Section */}
                <div className="border-t pt-8">
                    {/* We fetch warranties inside the component or pass them? Logic says pass them. */}
                    {/* But wait, SettingsPage is server component. I need to simple link to the sub-page OR fetch data here. */}
                    {/* I'll fetch data here to inline it. */}
                    <WarrantyLinkSection />
                </div>
            </div>
        </div>
    );
}

function WarrantyLinkSection() {
    return (
        <div className="bg-white p-6 rounded-lg border hover:shadow-sm transition-shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Service Warranties</h3>
            <p className="text-gray-500 mb-4">Manage reusable warranty templates for your invoices.</p>
            <a
                href="/settings/warranties"
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 mr-4"
            >
                Manage Warranties
            </a>
            <a
                href="/settings/series"
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700"
            >
                Manage Series & Packages
            </a>
        </div>
    );
}


