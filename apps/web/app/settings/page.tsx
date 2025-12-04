import { PasswordSettings } from "@/components/settings/password-settings";

export default function SettingsPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <div className="space-y-6">
                <PasswordSettings />
                {/* Other settings can go here */}
            </div>
        </div>
    );
}
