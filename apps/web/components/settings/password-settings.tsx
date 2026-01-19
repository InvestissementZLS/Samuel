"use client";

import { useState } from "react";
import { toast } from "sonner";
import { changePassword } from "@/app/actions/auth-actions";
import { useLanguage } from "@/components/providers/language-provider";

export function PasswordSettings() {
    const { t } = useLanguage();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error(t.settings.passwordsNoMatch);
            return;
        }

        if (newPassword.length < 5) {
            toast.error(t.settings.passwordMinLength);
            return;
        }

        setLoading(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                toast.success(t.settings.passwordChanged);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(result.message || t.settings.passwordChangeError);
            }
        } catch (error) {
            console.error("Change password error:", error);
            toast.error(t.jobs.unexpectedError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t.settings.changePassword}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.currentPassword}</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-md border p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.newPassword}</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-md border p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.confirmPassword}</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-md border p-2"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? t.settings.updating : t.settings.updatePassword}
                </button>
            </form>
        </div>
    );
}
