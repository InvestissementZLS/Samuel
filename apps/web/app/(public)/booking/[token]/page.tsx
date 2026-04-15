"use client";

import { useEffect, useState, Suspense } from "react";
import { verifyBookingToken, confirmBooking, getClientServices, confirmGuestBooking, checkExistingClient, sendPortalLink } from "@/app/actions/booking-actions";
import { createBookingRequest } from "@/app/actions/booking-request-actions";
import { findSmartSlots, SmartSlot } from "@/app/actions/scheduling-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Calendar, Clock, Package, User, Leaf, ArrowLeft, X, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { dictionary, Locale } from "@/lib/i18n/dictionary";

export default function ClientBookingPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';
    const isNew = token === 'new';

    // Deep-link params from portal
    const deepCat = searchParams.get('cat') || null;          // e.g. 'souris'
    const deepService = searchParams.get('service') || null;  // e.g. 'Traitement Souris – Régulier'

    const [language, setLanguage] = useState<Locale>('fr');
    const t = dictionary[language];
    const b = t.booking;

    const [step, setStep] = useState(1);
    const [isGuest, setIsGuest] = useState(false);
    const [guestInfo, setGuestInfo] = useState({ name: "", email: "", phone: "", street: "", city: "", postalCode: "" });
    const [loading, setLoading] = useState(true);
    const [clientData, setClientData] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [bookingDivision, setBookingDivision] = useState<string>('EXTERMINATION');

    // Preferences
    const [preferredDays, setPreferredDays] = useState<string[]>([]);
    const [preferredPeriod, setPreferredPeriod] = useState<string | null>(null);

    // Existing Client Detection
    const [existingClient, setExistingClient] = useState<{ exists: boolean; name?: string; maskedEmail?: string; clientId?: string } | null>(null);
    const [showExistingClientModal, setShowExistingClientModal] = useState(false);
    const [sendingLink, setSendingLink] = useState(false);

    // ── Service detail modal ──────────────────────────────────────────────────
    const [detailService, setDetailService] = useState<any>(null); // service being previewed

    // ── Active category filter (from deep link) ───────────────────────────────
    const [activeCategory, setActiveCategory] = useState<string | null>(deepCat);

    // ── Availability Request Flow ─────────────────────────────────────────────
    const [isRequestMode, setIsRequestMode] = useState(false);
    const [requestDays, setRequestDays] = useState<string[]>([]);
    const [requestNotes, setRequestNotes] = useState('');
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);

    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [selectedSlot, setSelectedSlot] = useState<SmartSlot | null>(null);

    // Slots
    const [availableSlots, setAvailableSlots] = useState<SmartSlot[]>([]);
    const [analyzingSlots, setAnalyzingSlots] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Group slots by date
    const slotsByDate = availableSlots.reduce((acc, slot) => {
        const day = format(new Date(slot.date), "yyyy-MM-dd");
        if (!acc[day]) acc[day] = [];
        acc[day].push(slot);
        return acc;
    }, {} as Record<string, SmartSlot[]>);

    // Get unique dates sorted — filtered by preferredDays if set
    const allAvailableDates = Object.keys(slotsByDate).sort();
    const availableDates = preferredDays.length > 0
        ? allAvailableDates.filter(d => preferredDays.includes(d))
        : allAvailableDates;


    useEffect(() => {
        const init = async () => {
            if (!token) return;

            try {
                if (token === 'new') {
                    setIsGuest(true);
                    setStep(0);
                    // Guest bookings default to EXTERMINATION (the public booking page)
                    const s = await getClientServices('EXTERMINATION');
                    setServices(s);
                } else {
                    const link = await verifyBookingToken(token);
                    if (link) {
                        setClientData(link.client);
                        const div = (link as any).division || 'EXTERMINATION';
                        setBookingDivision(div);
                        // Load preferences set by admin
                        const adminPreferredDays = (link as any).preferredDays || [];
                        if (adminPreferredDays.length > 0) {
                            setPreferredDays(adminPreferredDays);
                        }
                        if ((link as any).preferredPeriod) {
                            setPreferredPeriod((link as any).preferredPeriod);
                        }
                        // ★ KEY: generic link (no preset days) → "request" mode
                        // Client picks preferred days, admin confirms before job is created
                        if (adminPreferredDays.length === 0) {
                            setIsRequestMode(true);
                        }
                        if (link.client.properties.length > 0) {
                            setSelectedPropertyId(link.client.properties[0].id);
                        }
                        const s = await getClientServices(div);
                        setServices(s);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [token]);

    const handleGuestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if client exists
        try {
            const check = await checkExistingClient(guestInfo.phone, guestInfo.email);
            if (check.exists) {
                setExistingClient(check);
                setShowExistingClientModal(true);
                return; // Stop here, wait for user choice
            }
        } catch (error) {
            console.error("Error checking client", error);
        }

        proceedAsGuest();
    };

    const proceedAsGuest = () => {
        const fullAddress = `${guestInfo.street}, ${guestInfo.city}, ${guestInfo.postalCode}`;
        setClientData({ name: guestInfo.name, properties: [{ id: 'temp', address: fullAddress }] }); // Temp data for UI
        setSelectedPropertyId('temp');
        setStep(1);
        setShowExistingClientModal(false);
    };

    const handleSendLink = async () => {
        if (!existingClient?.clientId) return;
        setSendingLink(true);
        try {
            await sendPortalLink(existingClient.clientId);
            toast.success("Magic link sent! Check your email.");
            setShowExistingClientModal(false);
        } catch (error) {
            toast.error("Failed to send link");
        } finally {
            setSendingLink(false);
        }
    };

    const handleServiceSelect = async (service: any) => {
        setSelectedService(service);
        setStep(2);

        // Find slots immediately
        if (selectedPropertyId) {
            setAnalyzingSlots(true);
            try {
                // For guest, we don't have a property ID in DB yet.
                // SmartSlots uses Property DB ID to calculate distance.
                // If ID is 'temp', we should pass the address directly or skip optimization (use default availability)
                // For now, if temp, we might fail unless we modify findSmartSlots to accept address string.
                // simpler hack: Just skip optimization logic if guest, or assume 0 distance.
                // Let's modify availableSlots to just be generic for now if guest.
                const slots = await findSmartSlots(service.id, selectedPropertyId === 'temp' ? '' : selectedPropertyId);
                setAvailableSlots(slots);

                // Auto-select first date
                if (slots.length > 0) {
                    setSelectedDate(format(new Date(slots[0].date), "yyyy-MM-dd"));
                }
            } catch (e: any) {
                console.error("Slot Finding Error:", e);
                // Display raw error for debugging
                const errorMsg = e.message || JSON.stringify(e) || "Unknown Error";
                toast.error(`Error: ${errorMsg}`);

                // Also set a visible error in the UI (temporary for debug)
                setAvailableSlots([{
                    date: new Date(),
                    startTime: "ERR",
                    technicianId: "error",
                    technicianName: "ERROR",
                    score: 0,
                    reason: `SYSTEM ERROR: ${errorMsg}`
                } as any]);
            } finally {
                setAnalyzingSlots(false);
            }
        }
    };

    const handleConfirm = async () => {
        if (!selectedSlot || !selectedService || !selectedPropertyId) return;
        setLoading(true);
        try {
            if (isGuest) {
                await confirmGuestBooking(
                    { ...guestInfo, language },
                    selectedService.id,
                    new Date(selectedSlot.date),
                    selectedSlot.technicianId,
                    `Guest Self-Booking: ${selectedService.name}`,
                    bookingDivision
                );
            } else {
                await confirmBooking(
                    token,
                    selectedPropertyId,
                    selectedService.id,
                    new Date(selectedSlot.date),
                    selectedSlot.technicianId,
                    `Self-Booking: ${selectedService.name}`
                );
            }
            setStep(3); // Success
            toast.success("Booking Confirmed!");
        } catch (e) {
            toast.error("Booking failed");
        } finally {
            setLoading(false);
        }
    };

    if (loading && step === 1 && !isGuest) return <div className="p-8 text-center">Loading Portal...</div>;
    if (loading && isGuest) return <div className="p-8 text-center">Loading Guest Portal...</div>;

    if (!clientData && !isGuest) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold mb-2">{b.errors.invalidToken}</h2>
                <p className="text-sm text-gray-500">Token ID: {token || "Missing"}</p>
                <p className="mt-4">{b.errors.requestNew}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">{b.title}</h1>
                        <p className="opacity-90">{b.welcome}{clientData ? `, ${clientData.name}` : ''}</p>
                    </div>
                    <div className="flex bg-blue-700 rounded-lg p-1">
                        {!isNew && (
                            <Link 
                                href={`/portal/${token}`}
                                className="mr-4 text-blue-100 hover:text-white flex items-center gap-1 text-sm font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {language === 'fr' ? 'Retour au portail' : 'Back to Portal'}
                            </Link>
                        )}
                        <button
                            onClick={() => setLanguage('fr')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${language === 'fr' ? 'bg-white text-blue-600' : 'text-blue-100 hover:bg-blue-600'}`}
                        >
                            FR
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${language === 'en' ? 'bg-white text-blue-600' : 'text-blue-100 hover:bg-blue-600'}`}
                        >
                            EN
                        </button>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex border-b">
                    {/* ... progress bar ... */}
                    {isGuest && (
                        <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 0 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>0. {b.steps.info}</div>
                    )}
                    <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 1 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>1. {b.steps.service}</div>
                    <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 2 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>2. {b.steps.schedule}</div>
                    <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 3 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>3. {b.steps.confirmation}</div>
                </div>

                {/* EXISTING CLIENT MODAL */}
                {showExistingClientModal && existingClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                                    <User className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Welcome back, {existingClient.name}!</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    We found an existing account linked to your information ({existingClient.maskedEmail}).
                                    Would you like to access your client portal instead?
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleSendLink}
                                        disabled={sendingLink}
                                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex justify-center items-center"
                                    >
                                        {sendingLink ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            "Send me a Portal Link"
                                        )}
                                    </button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200" />
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white text-gray-500">or</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={proceedAsGuest}
                                        className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Continue as Guest
                                    </button>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Continuing as guest will create a new booking record.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                <div className="p-6">
                    {/* Location Confirm (Skip for guest as they just entered it) */}
                    {clientData && clientData.properties.length > 1 && step < 3 && !isGuest && (
                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2">Service Location</label>
                            <select
                                className="w-full border p-2 rounded"
                                value={selectedPropertyId}
                                onChange={e => setSelectedPropertyId(e.target.value)}
                            >
                                {clientData.properties.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.address}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* STEP 0: GUEST INFO */}
                    {step === 0 && (
                        <form onSubmit={handleGuestSubmit} className="space-y-4">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <User className="text-blue-600" /> {b.guestInfo.title}
                            </h2>
                            <div>
                                <label className="block text-sm font-medium mb-1">{b.guestInfo.fullName}</label>
                                <input required className="w-full border p-2 rounded" value={guestInfo.name} onChange={e => setGuestInfo({ ...guestInfo, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{b.guestInfo.email}</label>
                                <input required type="email" className="w-full border p-2 rounded" value={guestInfo.email} onChange={e => setGuestInfo({ ...guestInfo, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{b.guestInfo.phone}</label>
                                <input required type="tel" className="w-full border p-2 rounded" value={guestInfo.phone} onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })} />
                            </div>

                            {/* Structured Address Fields */}
                            <div>
                                <label className="block text-sm font-medium mb-1">{b.guestInfo.street}</label>
                                <input
                                    required
                                    className="w-full border p-2 rounded"
                                    value={guestInfo.street}
                                    onChange={e => setGuestInfo({ ...guestInfo, street: e.target.value })}
                                    placeholder="123 Main St"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{b.guestInfo.city}</label>
                                    <input
                                        required
                                        className="w-full border p-2 rounded"
                                        value={guestInfo.city}
                                        onChange={e => setGuestInfo({ ...guestInfo, city: e.target.value })}
                                        placeholder="Montreal"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{b.guestInfo.postalCode}</label>
                                    <input
                                        required
                                        className="w-full border p-2 rounded"
                                        value={guestInfo.postalCode}
                                        onChange={e => setGuestInfo({ ...guestInfo, postalCode: e.target.value })}
                                        placeholder="H1A 1A1"
                                    />
                                </div>
                            </div>

                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                                {b.guestInfo.continue}
                            </button>
                        </form>
                    )}

                    {/* ── Service Detail Modal ──────────────────────────────────── */}
                    {detailService && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailService(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight pr-4">{detailService.name}</h3>
                                    <button onClick={() => setDetailService(null)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="px-6 py-5 space-y-4">
                                    {/* Price */}
                                    {detailService.price > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-gray-900">{detailService.price}$</span>
                                            <span className="text-sm text-gray-400">{language === 'fr' ? 'à partir de' : 'starting at'}</span>
                                        </div>
                                    )}

                                    {/* Warranty */}
                                    {detailService.warrantyInfo && (
                                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <span className="text-sm font-semibold text-emerald-800">{detailService.warrantyInfo}</span>
                                        </div>
                                    )}

                                    {/* Description */}
                                    {detailService.description && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                {language === 'fr' ? 'Description du service' : 'Service description'}
                                            </p>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                                {detailService.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Duration */}
                                    {detailService.durationMinutes && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            {language === 'fr' ? `Durée estimée : ${detailService.durationMinutes} min` : `Estimated duration: ${detailService.durationMinutes} min`}
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 pb-6 flex gap-3">
                                    <button
                                        onClick={() => setDetailService(null)}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        {language === 'fr' ? 'Retour' : 'Back'}
                                    </button>
                                    <button
                                        onClick={() => { handleServiceSelect(detailService); setDetailService(null); }}
                                        className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {language === 'fr' ? 'Choisir ce service' : 'Select this service'}
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: SERVICES — grouped by category, collapsible */}
                    {step === 1 && (() => {
                        const categories = [
                            { id: 'souris',      icon: '🐭', label: language === 'fr' ? 'Souris & Rongeurs' : 'Mice & Rodents',              color: { bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-400'   }, match: (n: string) => /souris|rongeur|calfeutrage.*bloc|mensuel.*rongeur|trimestriel.*rongeur|annuel.*souris/i.test(n) },
                            { id: 'guepes',      icon: '🐝', label: language === 'fr' ? 'Guêpes & Insectes Extérieurs' : 'Wasps & Outdoors', color: { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', ring: 'ring-yellow-400' }, match: (n: string) => /guêpe|arrosage|plan annuel/i.test(n) },
                            { id: 'fourmis',     icon: '🐜', label: language === 'fr' ? 'Fourmis Charpentières' : 'Carpenter Ants',          color: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', ring: 'ring-orange-400' }, match: (n: string) => /fourmi/i.test(n) },
                            { id: 'coquerelles', icon: '🪳', label: language === 'fr' ? 'Coquerelles' : 'Cockroaches',                       color: { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-700',    badge: 'bg-red-100 text-red-700',       ring: 'ring-red-400'   }, match: (n: string) => /coquerelle/i.test(n) },
                            { id: 'punaises',    icon: '🐞', label: language === 'fr' ? 'Punaises de Lit' : 'Bed Bugs',                      color: { bg: 'bg-pink-50',   border: 'border-pink-200',   title: 'text-pink-700',   badge: 'bg-pink-100 text-pink-700',     ring: 'ring-pink-400'  }, match: (n: string) => /punaise/i.test(n) },
                            { id: 'animaux',     icon: '🦝', label: language === 'fr' ? 'Animaux Sauvages' : 'Wildlife',                     color: { bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-700',  badge: 'bg-green-100 text-green-700',   ring: 'ring-green-400' }, match: (n: string) => /capture|marmotte|moufette|cage|cam/i.test(n) },
                            { id: 'inspection',  icon: '🔍', label: language === 'fr' ? 'Inspection & Administration' : 'Inspection & Admin', color: { bg: 'bg-gray-50',   border: 'border-gray-200',   title: 'text-gray-700',   badge: 'bg-gray-100 text-gray-700',     ring: 'ring-gray-400'  }, match: (n: string) => /inspection|ouverture de dossier/i.test(n) },
                        ];

                        return (
                            <div className="space-y-3">
                                <div className="mb-1">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Package className="text-blue-600" /> {b.service.title}
                                    </h2>
                                    {activeCategory && (
                                        <button onClick={() => setActiveCategory(null)} className="mt-1 text-xs text-blue-500 hover:underline flex items-center gap-1">
                                            ← {language === 'fr' ? 'Voir toutes les catégories' : 'See all categories'}
                                        </button>
                                    )}
                                </div>

                                {categories.map(cat => {
                                    const catServices = services.filter(s => cat.match(s.name));
                                    if (catServices.length === 0) return null;
                                    const isOpen = !activeCategory || activeCategory === cat.id;
                                    const isActive = activeCategory === cat.id;

                                    return (
                                        <div key={cat.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${isActive ? cat.color.border + ' ' + cat.color.bg : 'border-gray-100 bg-white'}`}>
                                            {/* Category header — clickable to expand */}
                                            <button
                                                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
                                                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{cat.icon}</span>
                                                    <div>
                                                        <span className={`font-bold text-sm ${isActive ? cat.color.title : 'text-gray-800'}`}>{cat.label}</span>
                                                        <span className="ml-2 text-xs text-gray-400">({catServices.length})</span>
                                                    </div>
                                                </div>
                                                {isActive ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </button>

                                            {/* Service cards — visible when open */}
                                            {isOpen && (
                                                <div className="px-3 pb-3 grid gap-2 sm:grid-cols-2 border-t border-gray-100">
                                                    {catServices.map(service => {
                                                        const isHighlighted = deepService && service.name.toLowerCase().includes(deepService.toLowerCase().slice(0, 15));
                                                        return (
                                                            <button
                                                                key={service.id}
                                                                onClick={() => setDetailService(service)}
                                                                className={`text-left bg-white rounded-xl border shadow-sm px-4 py-3.5 mt-2 hover:shadow-md hover:-translate-y-0.5 transition-all group ${isHighlighted ? `border-2 ${cat.color.ring} ring-2 ${cat.color.ring}` : 'border-gray-100 hover:border-blue-200'}`}
                                                            >
                                                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                                                    <span className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors leading-snug">
                                                                        {service.name}
                                                                        {isHighlighted && <span className="ml-1.5 text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase">Sélectionné</span>}
                                                                    </span>
                                                                    {service.price > 0 && (
                                                                        <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${cat.color.badge}`}>
                                                                            {service.price}$
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {service.description && (
                                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">
                                                                        {service.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center justify-between">
                                                                    {service.warrantyInfo ? (
                                                                        <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                                                            🛡️ {service.warrantyInfo.split('|')[0].trim()}
                                                                        </div>
                                                                    ) : <div />}
                                                                    <div className="text-[11px] font-semibold text-blue-500 group-hover:text-blue-700">
                                                                        {language === 'fr' ? 'Voir détails →' : 'View details →'}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* ──────────────────────────────────────────────────── */}
                    {/* STEP 2 — REQUEST MODE: Client picks preferred days  */}
                    {/* (generic link without admin-preset days)            */}
                    {/* ──────────────────────────────────────────────────── */}
                    {step === 2 && isRequestMode && !requestSubmitted && (
                        <div className="space-y-6">
                            {/* Service summary */}
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                <div>
                                    <span className="text-sm text-gray-500">{b.steps.service}</span>
                                    <div className="font-bold">{selectedService?.name}</div>
                                </div>
                                <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline">{b.service.change}</button>
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 flex gap-3">
                                <span className="text-2xl mt-0.5">📅</span>
                                <div>
                                    <p className="font-semibold text-blue-900 text-sm">
                                        {language === 'fr'
                                            ? 'Choisissez vos jours disponibles'
                                            : 'Choose your available days'}
                                    </p>
                                    <p className="text-blue-700 text-sm mt-0.5">
                                        {language === 'fr'
                                            ? 'Sélectionnez 1 à 5 jours qui vous conviennent. Votre technicien confirmera le meilleur créneau dans les 24h.'
                                            : 'Select 1 to 5 days that work for you. Your technician will confirm the best time within 24 hours.'}
                                    </p>
                                </div>
                            </div>

                            {/* Day picker — weekdays prominent, weekends → contact callout */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    {language === 'fr' ? 'Choisissez vos jours (14 prochains jours)' : 'Choose your days (next 14 days)'}
                                </p>

                                {/* ── Weekdays ── */}
                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2">
                                    {language === 'fr' ? '📅 Lundi – Vendredi' : '📅 Monday – Friday'}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {(() => {
                                        const today = new Date();
                                        const days = [];
                                        for (let i = 1; i <= 14; i++) {
                                            const d = new Date(today);
                                            d.setDate(today.getDate() + i);
                                            if (d.getDay() === 0 || d.getDay() === 6) continue;
                                            const iso = d.toISOString().split('T')[0];
                                            const dayName = d.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short' });
                                            const label = d.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
                                            const isSelected = requestDays.includes(iso);
                                            days.push(
                                                <button
                                                    key={iso}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) setRequestDays(requestDays.filter(d => d !== iso));
                                                        else if (requestDays.length < 5) setRequestDays([...requestDays, iso]);
                                                    }}
                                                    className={`flex flex-col items-center px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                                                        ${isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-[1.05]'
                                                            : 'bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                                                        }`}
                                                >
                                                    <span className={`text-[10px] uppercase font-bold mb-0.5 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`}>
                                                        {dayName}
                                                    </span>
                                                    <span className="text-sm">{label}</span>
                                                    {isSelected && <span className="text-[9px] text-blue-200 mt-0.5">✓</span>}
                                                </button>
                                            );
                                        }
                                        return days;
                                    })()}
                                </div>

                                {/* ── Weekend callout ── */}
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-1">
                                    <span className="text-xl mt-0.5">📞</span>
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">
                                            {language === 'fr'
                                                ? 'Disponible seulement la fin de semaine ?'
                                                : 'Only available on weekends?'}
                                        </p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            {language === 'fr'
                                                ? 'Nos créneaux en ligne sont réservés à la semaine. Contactez-nous directement et nous trouverons une solution :'
                                                : 'Online booking is weekdays only. Contact us directly and we\'ll find a solution:'}
                                        </p>
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            {/* Phone — same number for all divisions for now */}
                                            <a href="tel:+15149634010" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                                                📱 514-963-4010
                                            </a>
                                            {/* Email per division */}
                                            <a
                                                href={`mailto:${
                                                    bookingDivision === 'EXTERMINATION'
                                                        ? 'exterminationzls@gmail.com'
                                                        : bookingDivision === 'ENTREPRISES'
                                                            ? 'info@lesentrepriseszls.com'
                                                            : 'info@praxiszls.com'
                                                }`}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                ✉️ {bookingDivision === 'EXTERMINATION'
                                                    ? 'exterminationzls@gmail.com'
                                                    : bookingDivision === 'ENTREPRISES'
                                                        ? 'info@lesentrepriseszls.com'
                                                        : 'info@praxiszls.com'}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {requestDays.length > 0 && (
                                    <p className="mt-3 text-xs text-blue-600 font-semibold">
                                        ✓ {requestDays.length} {language === 'fr' ? `jour${requestDays.length > 1 ? 's' : ''} sélectionné${requestDays.length > 1 ? 's' : ''}` : `day${requestDays.length > 1 ? 's' : ''} selected`}
                                    </p>
                                )}
                            </div>

                            {/* Notes field */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    {language === 'fr' ? 'Notes (accès, animaux, instructions)' : 'Notes (access, pets, instructions)'} <span className="font-normal normal-case text-gray-400">— {language === 'fr' ? 'optionnel' : 'optional'}</span>
                                </label>
                                <textarea
                                    value={requestNotes}
                                    onChange={e => setRequestNotes(e.target.value)}
                                    placeholder={language === 'fr' ? 'Ex: Chien dans la cour, entrée par côté gauche...' : 'Ex: Dog in yard, enter from left side...'}
                                    rows={3}
                                    className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <button
                                disabled={requestDays.length === 0 || requestSubmitting}
                                onClick={async () => {
                                    setRequestSubmitting(true);
                                    try {
                                        const result = await createBookingRequest({
                                            bookingToken: token,
                                            serviceId: selectedService?.id,
                                            propertyId: selectedPropertyId || undefined,
                                            preferredDays: requestDays,
                                            notes: requestNotes || undefined,
                                            division: bookingDivision,
                                        });
                                        if (result.success) {
                                            setRequestSubmitted(true);
                                        } else {
                                            toast.error(result.error || 'Erreur lors de la soumission');
                                        }
                                    } catch (e: any) {
                                        toast.error(e.message || 'Erreur');
                                    } finally {
                                        setRequestSubmitting(false);
                                    }
                                }}
                                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all
                                    ${requestDays.length === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                                    }`}
                            >
                                {requestSubmitting
                                    ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> {language === 'fr' ? 'Envoi...' : 'Sending...'}</>
                                    : language === 'fr' ? '📅 Envoyer ma disponibilité' : '📅 Send my availability'
                                }
                            </button>
                        </div>
                    )}

                    {/* Request submitted — success screen */}
                    {step === 2 && isRequestMode && requestSubmitted && (
                        <div className="text-center py-12 space-y-4">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {language === 'fr' ? 'Demande envoyée ✓' : 'Request sent ✓'}
                            </h2>
                            <p className="text-gray-600 max-w-sm mx-auto">
                                {language === 'fr'
                                    ? 'Votre technicien a reçu votre demande et vous contactera dans les 24 heures pour confirmer le meilleur créneau.'
                                    : 'Your technician has received your request and will contact you within 24 hours to confirm the best time slot.'}
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 inline-block text-sm text-blue-700 font-medium">
                                📅 {requestDays.map(d => new Date(d + 'T00:00:00').toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short', day: 'numeric', month: 'short' })).join(' · ')}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SCHEDULE (classic AI slot mode — only shown when admin pre-selected days) */}
                    {step === 2 && !isRequestMode && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                <div>
                                    <span className="text-sm text-gray-500">{b.steps.service}</span>
                                    <div className="font-bold">{selectedService.name}</div>
                                </div>
                                <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline">{b.service.change}</button>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Calendar className="text-blue-600" /> {b.schedule.title}
                                </h2>

                                {/* Preference notice */}
                                {(preferredDays.length > 0 || preferredPeriod) && (
                                    <div className="mb-4 flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                                        <Clock className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                                        <span>
                                            {language === 'fr'
                                                ? <>Votre technicien a réservé ces créneaux pour vous{preferredPeriod ? ` (${preferredPeriod === 'AM' ? 'avant-midi' : 'après-midi'})` : ''}.</>
                                                : <>Your technician has pre-selected these slots for you{preferredPeriod ? ` (${preferredPeriod === 'AM' ? 'morning' : 'afternoon'})` : ''}.</>
                                            }
                                        </span>
                                    </div>
                                )}

                                {analyzingSlots ? (
                                    <div className="py-8 text-center text-gray-500">
                                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        {b.schedule.findingSlots}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Horizontal Date Picker */}
                                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                                            {availableDates.map((dateStr) => {
                                                const dateObj = new Date(dateStr + 'T00:00:00');
                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => setSelectedDate(dateStr)}
                                                        className={`flex-shrink-0 px-4 py-3 rounded-lg border text-center transition-all min-w-[100px] ${selectedDate === dateStr
                                                            ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                                                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div className={`text-xs uppercase font-semibold ${selectedDate === dateStr ? 'text-blue-100' : 'text-gray-500'}`}>
                                                            {format(dateObj, "EEE")}
                                                        </div>
                                                        <div className="text-lg font-bold">
                                                            {format(dateObj, "MMM d")}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Slots Grid for Selected Date */}
                                        {selectedDate && slotsByDate[selectedDate] ? (
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {/* Deduplicate slots by time, filter by preferredPeriod */}
                                                {Array.from(
                                                    new Map(
                                                        slotsByDate[selectedDate]
                                                            .map(slot => [slot.startTime, slot])
                                                    ).values()
                                                )
                                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                                    .filter(slot => {
                                                        if (!preferredPeriod) return true;
                                                        const hour = parseInt(slot.startTime.split(':')[0], 10);
                                                        if (preferredPeriod === 'AM') return hour < 12;
                                                        if (preferredPeriod === 'PM') return hour >= 12;
                                                        return true;
                                                    })
                                                    .map((slot, i) => {
                                                        const isEco = slot.score >= 70 || slot.reason === "Optimized Route";
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => setSelectedSlot(slot)}
                                                                className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${selectedSlot?.startTime === slot.startTime && selectedSlot?.date.toString() === slot.date.toString()
                                                                        ? 'border-blue-600 bg-blue-50 shadow-md ring-1 ring-blue-600'
                                                                        : isEco
                                                                            ? 'border-green-200 bg-green-50/50 hover:bg-green-100 dark:border-green-800'
                                                                            : 'hover:border-gray-300'
                                                                    }`}
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-bold text-gray-900">
                                                                            {slot.startTime}
                                                                        </div>
                                                                        {isEco && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                                                Eco <Leaf size={10} className="ml-1" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className={`text-xs ${isEco ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                                                                        {slot.reason.includes("Guest") ? b.schedule.available : (isEco ? "Optimized for Route 🌿" : b.schedule.bestSlot)}
                                                                    </div>
                                                                </div>
                                                                {selectedSlot?.startTime === slot.startTime && <Check className="h-4 w-4 text-blue-600" />}
                                                            </button>
                                                        )
                                                    })}
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg dashed border border-gray-200">
                                                {availableDates.length > 0 ? b.schedule.selectDate : b.schedule.noSlots}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!selectedSlot || loading}
                                onClick={handleConfirm}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {loading ? b.schedule.confirming : b.schedule.confirm}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">{b.success.title}</h2>
                            <p className="text-gray-600 mb-6">
                                {b.success.messagePart1} <strong>{selectedSlot && format(new Date(selectedSlot.date), "EEEE, MMMM d")} {b.success.messagePart2} {selectedSlot?.startTime}</strong>.
                            </p>
                            <p className="text-sm text-gray-500">
                                {b.success.emailConfirmation}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
