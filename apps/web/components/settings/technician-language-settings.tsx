'use client';

import { useState } from 'react';
import { updateUserLanguage } from '@/app/actions/user-actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Technician {
    id: string;
    name: string | null;
    email: string;
    language: 'EN' | 'FR';
}

interface TechnicianLanguageSettingsProps {
    technicians: Technician[];
}

export function TechnicianLanguageSettings({ technicians }: TechnicianLanguageSettingsProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleLanguageChange = async (userId: string, newLanguage: 'EN' | 'FR') => {
        setLoading(userId);
        try {
            await updateUserLanguage(userId, newLanguage);
            toast.success('Language updated');
        } catch (error) {
            toast.error('Failed to update language');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Technician Language</h3>
            <div className="space-y-4">
                {technicians.map((tech) => (
                    <div key={tech.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                        <div>
                            <p className="text-sm font-medium text-gray-900">{tech.name || tech.email}</p>
                            <p className="text-xs text-gray-500">{tech.email}</p>
                        </div>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
                            <button
                                type="button"
                                onClick={() => handleLanguageChange(tech.id, 'EN')}
                                disabled={loading === tech.id}
                                className={`text-xs h-7 px-2 rounded-sm font-medium transition-colors ${tech.language === 'EN'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                    }`}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLanguageChange(tech.id, 'FR')}
                                disabled={loading === tech.id}
                                className={`text-xs h-7 px-2 rounded-sm font-medium transition-colors ${tech.language === 'FR'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                    }`}
                            >
                                FR
                            </button>
                        </div>
                    </div>
                ))}
                {technicians.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No technicians found.</p>
                )}
            </div>
        </div>
    );
}
