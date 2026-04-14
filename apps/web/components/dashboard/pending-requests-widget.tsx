"use client";

import { useEffect, useState, useCallback } from "react";
import { getPendingBookingRequests, confirmBookingRequest, cancelBookingRequest } from "@/app/actions/booking-request-actions";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Phone, Mail, User, CheckCircle, X, ChevronDown, Loader2, MessageSquare } from "lucide-react";

// ─── Day picker for admin modal ───────────────────────────────────────────────
function AdminDayPicker({ clientDays, selected, onChange }: {
    clientDays: string[];
    selected: string;
    onChange: (day: string) => void;
}) {
    const today = new Date();
    const days: { iso: string; label: string; dayName: string; isClientDay: boolean }[] = [];
    for (let i = 1; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() === 0) continue; // Skip Sundays
        const iso = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('fr-CA', { weekday: 'short' });
        const label = d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
        days.push({ iso, label, dayName, isClientDay: clientDays.includes(iso) });
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {days.map(d => (
                <button
                    key={d.iso}
                    type="button"
                    onClick={() => onChange(d.iso)}
                    className={`flex flex-col items-center px-2.5 py-2 rounded-lg border text-xs font-medium transition-all relative ${
                        selected === d.iso
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : d.isClientDay
                                ? 'bg-green-50 border-green-400 text-green-800 hover:bg-green-100'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                >
                    <span className={`text-[9px] uppercase font-bold ${selected === d.iso ? 'text-indigo-200' : d.isClientDay ? 'text-green-500' : 'text-gray-400'}`}>
                        {d.dayName}
                    </span>
                    <span>{d.label}</span>
                    {d.isClientDay && selected !== d.iso && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white" />
                    )}
                </button>
            ))}
            <p className="w-full text-xs text-green-700 font-medium mt-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Jours demandés par le client
            </p>
        </div>
    );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ request, onClose, onConfirmed }: {
    request: any;
    onClose: () => void;
    onConfirmed: () => void;
}) {
    const [selectedDay, setSelectedDay] = useState(request.preferredDays?.[0] || '');
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
    const [adminNotes, setAdminNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!selectedDay) { toast.error('Choisissez une journée'); return; }
        setSubmitting(true);
        try {
            const result = await confirmBookingRequest(request.id, {
                confirmedDate: `${selectedDay}T00:00:00`,
                confirmedPeriod: period,
                adminNotes: adminNotes || undefined,
                serviceId: request.serviceId || undefined,
            });
            if (result.success) {
                toast.success(`✅ RDV confirmé — Job créé${result.jobId ? ` (#${result.jobId.slice(0, 8)})` : ''}`);
                onConfirmed();
            } else {
                toast.error(result.error || 'Erreur');
            }
        } catch (e: any) {
            toast.error(e.message || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    const dayLabel = selectedDay
        ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
        : '—';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Confirmer le rendez-vous</h3>
                        <p className="text-xs text-gray-500">{request.client?.name}{request.client?.companyName ? ` — ${request.client.companyName}` : ''}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Client info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {request.property?.address && (
                            <div className="col-span-2 flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{request.property.address}</span>
                            </div>
                        )}
                        {request.client?.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {request.client.phone}
                            </div>
                        )}
                        {request.notes && (
                            <div className="col-span-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span className="text-amber-800 text-xs italic">"{request.notes}"</span>
                            </div>
                        )}
                    </div>

                    {/* AM / PM */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Période</p>
                        <div className="flex gap-2">
                            {(['AM', 'PM'] as const).map(p => (
                                <button
                                    key={p} type="button"
                                    onClick={() => setPeriod(p)}
                                    className={`flex-1 py-3 rounded-xl border text-center font-bold transition-all ${
                                        period === p
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                                    }`}
                                >
                                    {p === 'AM' ? '🌅 Avant-midi' : '☀️ Après-midi'}
                                    <div className={`text-xs font-normal mt-0.5 ${period === p ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {p === 'AM' ? 'avant 12h' : 'après 12h'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Day picker */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Choisir la journée</p>
                        <AdminDayPicker
                            clientDays={request.preferredDays || []}
                            selected={selectedDay}
                            onChange={setSelectedDay}
                        />
                    </div>

                    {/* Admin notes */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Note pour le client <span className="font-normal normal-case text-gray-400">(optionnel)</span>
                        </label>
                        <input
                            type="text"
                            value={adminNotes}
                            onChange={e => setAdminNotes(e.target.value)}
                            placeholder="Ex: Veuillez laisser accès à la cour avant 9h"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Summary */}
                    {selectedDay && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm">
                            <p className="font-semibold text-indigo-900">Récapitulatif</p>
                            <p className="text-indigo-700 mt-0.5 capitalize">{dayLabel} — {period === 'AM' ? 'Avant-midi' : 'Après-midi'}</p>
                            <p className="text-indigo-500 text-xs mt-0.5">Un email de confirmation sera envoyé à {request.client?.email}</p>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedDay || submitting}
                        className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmation...</>
                            : <><CheckCircle className="w-4 h-4" /> Confirmer & Envoyer</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export function PendingRequestsWidget() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRequest, setActiveRequest] = useState<any>(null);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPendingBookingRequests();
            setRequests(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const handleCancel = async (id: string) => {
        setCancelling(id);
        try {
            await cancelBookingRequest(id);
            toast.success('Demande annulée');
            setRequests(prev => prev.filter(r => r.id !== id));
        } finally {
            setCancelling(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500">Chargement des demandes...</span>
            </div>
        );
    }

    if (requests.length === 0) return null;

    return (
        <>
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                            <span className="text-white text-lg">📬</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Demandes de rendez-vous</h2>
                            <p className="text-xs text-indigo-600 font-medium">{requests.length} en attente de confirmation</p>
                        </div>
                    </div>
                    <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{requests.length}</span>
                </div>

                {/* Request list */}
                <div className="divide-y divide-gray-100">
                    {requests.map(req => (
                        <div key={req.id} className="p-5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {/* Client */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                                            {req.client?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900 text-sm">{req.client?.name}</span>
                                            {req.client?.companyName && (
                                                <span className="text-xs text-gray-500 ml-1">— {req.client.companyName}</span>
                                            )}
                                        </div>
                                        <span className="ml-auto text-xs text-gray-400">
                                            {new Date(req.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>

                                    {/* Address */}
                                    {req.property?.address && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 ml-9">
                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                            {req.property.address}
                                        </div>
                                    )}

                                    {/* Preferred days */}
                                    {req.preferredDays?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 ml-9 mb-2">
                                            {req.preferredDays.map((d: string) => (
                                                <span key={d} className="text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                                                    📅 {new Date(d + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Client notes */}
                                    {req.notes && (
                                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 ml-9 italic flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                            "{req.notes}"
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => setActiveRequest(req)}
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Confirmer
                                    </button>
                                    <button
                                        onClick={() => handleCancel(req.id)}
                                        disabled={cancelling === req.id}
                                        className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 justify-center"
                                    >
                                        {cancelling === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Confirm Modal */}
            {activeRequest && (
                <ConfirmModal
                    request={activeRequest}
                    onClose={() => setActiveRequest(null)}
                    onConfirmed={() => {
                        setActiveRequest(null);
                        reload();
                    }}
                />
            )}
        </>
    );
}
