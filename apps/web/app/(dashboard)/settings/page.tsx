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
            </div>
        </div>
    );
}
