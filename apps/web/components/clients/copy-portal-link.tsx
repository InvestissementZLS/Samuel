"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createBookingLink } from "@/app/actions/booking-actions";
import { Link as LinkIcon, Check, Loader2, Calendar, Clock, X, Send, Copy } from "lucide-react";

function DayPicker({ selected, onChange }: { selected: string[]; onChange: (days: string[]) => void }) {
    const today = new Date();
    const days: { iso: string; label: string; dayName: string }[] = [];
    for (let i = 1; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() === 0) continue; // Skip Sundays
        const iso = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('fr-CA', { weekday: 'short' });
        const label = d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
        days.push({ iso, label, dayName });
    }

    const toggle = (iso: string) => {
        if (selected.includes(iso)) onChange(selected.filter(d => d !== iso));
        else onChange([...selected, iso]);
    };

    return (
        <div className="flex flex-wrap gap-1.5">
            {days.map(d => (
                <button
                    key={d.iso}
                    type="button"
                    onClick={() => toggle(d.iso)}
                    className={`flex flex-col items-center px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                        selected.includes(d.iso)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                >
                    <span className={`text-[9px] uppercase font-bold ${selected.includes(d.iso) ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {d.dayName}
                    </span>
                    <span className="text-xs">{d.label}</span>
                </button>
            ))}
        </div>
    );
}

export function CopyPortalLink({ clientId, division = 'EXTERMINATION' }: {
    clientId: string;
    division?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const [preferredDays, setPreferredDays] = useState<string[]>([]);
    const [preferredPeriod, setPreferredPeriod] = useState<'AM' | 'PM' | 'ANY'>('ANY');

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const token = await createBookingLink(
                clientId,
                division,
                preferredDays,
                preferredPeriod !== 'ANY' ? preferredPeriod : undefined
            );
            if (!token) throw new Error("Could not generate token");

            const url = `${window.location.origin}/booking/${token}`;
            await navigator.clipboard.writeText(url);

            setCopied(true);
            toast.success("Lien de réservation copié !");
            setTimeout(() => {
                setCopied(false);
                setIsOpen(false);
                // Reset
                setPreferredDays([]);
                setPreferredPeriod('ANY');
            }, 2500);
        } catch (error) {
            console.error("Failed to generate booking link:", error);
            toast.error("Erreur lors de la génération du lien");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
            >
                <LinkIcon className="h-4 w-4" />
                Envoyer lien rendez-vous
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Send className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Lien de rendez-vous</h3>
                                    <p className="text-xs text-gray-500">Définissez les créneaux convenus</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* AM / PM */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Période de la journée
                                </p>
                                <div className="flex gap-2">
                                    {([
                                        { key: 'AM' as const, label: '🌅 Avant-midi', desc: 'avant 12h' },
                                        { key: 'PM' as const, label: '☀️ Après-midi', desc: 'après 12h' },
                                        { key: 'ANY' as const, label: '🔓 Peu importe', desc: 'tous les créneaux' },
                                    ]).map(({ key, label, desc }) => (
                                        <button
                                            key={key} type="button"
                                            onClick={() => setPreferredPeriod(key)}
                                            className={`flex-1 py-2.5 px-1 rounded-xl border text-center transition-all ${
                                                preferredPeriod === key
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="text-sm">{label.split(' ')[0]}</div>
                                            <div className="text-[11px] font-semibold">{label.split(' ').slice(1).join(' ')}</div>
                                            <div className={`text-[10px] mt-0.5 ${preferredPeriod === key ? 'text-indigo-200' : 'text-gray-400'}`}>{desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Day Picker */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Jours disponibles
                                    {preferredDays.length > 0 && (
                                        <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                                            {preferredDays.length}
                                        </span>
                                    )}
                                    <span className="text-gray-400 font-normal normal-case ml-auto">(optionnel)</span>
                                </p>
                                <DayPicker selected={preferredDays} onChange={setPreferredDays} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm disabled:opacity-60"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : copied ? (
                                    <><Check className="w-4 h-4" /> Copié !</>
                                ) : (
                                    <><Copy className="w-4 h-4" /> Générer & Copier le lien</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
