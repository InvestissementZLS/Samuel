import { getTechnicians } from "@/app/actions/technician-actions";
const getDivisionSettings = async (...args: any) => [];
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const technicians = await getTechnicians();
    const divisionSettings = await getDivisionSettings();

    // Ensure technicians have a language property, default to 'FR' if missing (though DB default handles it)
    const techniciansWithLanguage = technicians.map(t => ({
        ...t,
        language: (t as any).language || 'FR'
    }));

    return <SettingsView technicians={techniciansWithLanguage} divisionSettings={divisionSettings} />;
}


