'use client';

import { useState } from 'react';
import { useLanguage } from '../providers/language-provider';
import { Division } from '@prisma/client';
const upsertDivisionSetting = async (...args: any) => ({ success: false, error: 'Not implemented' });
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

interface DivisionSettingsProps {
    initialSettings: any[];
}

export function DivisionEmailSettings({ initialSettings }: DivisionSettingsProps) {
    const { language } = useLanguage();
    const isEn = language === 'EN';

    const [settings, setSettings] = useState<Record<string, { name: string, email: string }>>(() => {
        // Initialize with existing data or defaults
        const defaults = {
            'EXTERMINATION': { name: 'Extermination ZLS', email: 'extermination@praxiszls.com' },
            'ENTREPRISES': { name: 'Les Entreprises ZLS', email: 'Lesentrepriseszls@praxiszls.com' },
            'RENOVATION': { name: 'Rénovation Esthéban', email: 'renovation@praxiszls.com' } // placeholder
        };

        const current = { ...defaults };
        for (const s of initialSettings) {
            if (current[s.division]) {
                current[s.division] = {
                    name: s.emailSenderName,
                    email: s.emailSenderAddress
                };
            }
        }
        return current;
    });

    const [saving, setSaving] = useState<string | null>(null);

    const handleSave = async (division: Division) => {
        setSaving(division);
        try {
            const data = settings[division];
            if (!data.name || !data.email) {
                toast.error(isEn ? 'Name and Email are required' : 'Le nom et le courriel sont requis');
                return;
            }

            const res = await upsertDivisionSetting({
                division,
                emailSenderName: data.name,
                emailSenderAddress: data.email
            });

            if (res.success) {
                toast.success(isEn ? 'Settings saved successfully' : 'Paramètres sauvegardés avec succès');
            } else {
                toast.error(res.error || 'Failed to save');
            }
        } catch (e) {
            toast.error(isEn ? 'An error occurred' : 'Une erreur est survenue');
        } finally {
            setSaving(null);
        }
    };

    const handleChange = (division: string, field: 'name' | 'email', value: string) => {
        setSettings(prev => ({
            ...prev,
            [division]: {
                ...prev[division],
                [field]: value
            }
        }));
    };

    return (
        <div className="bg-white p-6 rounded-lg border hover:shadow-sm transition-shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-500" />
                {isEn ? 'Email Addresses by Division' : 'Adresses courriel par Division'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
                {isEn 
                    ? 'Configure the sender name and email address that clients will see when they receive quotes, invoices, and portal links from each division.' 
                    : 'Configurez le nom de l\'expéditeur et l\'adresse courriel que les clients verront lorsqu\'ils recevront des soumissions, des factures et des liens vers le portail pour chaque division.'
                }
            </p>

            <div className="space-y-6">
                {(['EXTERMINATION', 'ENTREPRISES', 'RENOVATION'] as Division[]).map((division) => (
                    <div key={division} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900 capitalize">
                                {division.toLowerCase()}
                            </h4>
                            <button
                                onClick={() => handleSave(division)}
                                disabled={saving === division}
                                className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {saving === division 
                                    ? (isEn ? 'Saving...' : 'Sauvegarde...') 
                                    : (isEn ? 'Save' : 'Sauvegarder')}
                            </button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {isEn ? 'Sender Name' : "Nom de l'expéditeur"}
                                </label>
                                <input
                                    type="text"
                                    value={settings[division].name}
                                    onChange={(e) => handleChange(division, 'name', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                    placeholder={isEn ? "Company Name" : "Nom de l'entreprise"}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {isEn ? 'Sender Email' : "Courriel de l'expéditeur"}
                                </label>
                                <input
                                    type="email"
                                    value={settings[division].email}
                                    onChange={(e) => handleChange(division, 'email', e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                    placeholder="email@example.com"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
