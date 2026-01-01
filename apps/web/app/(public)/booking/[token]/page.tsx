"use client";

import { useEffect, useState } from "react";
import { verifyBookingToken, confirmBooking, getClientServices, confirmGuestBooking, checkExistingClient, sendPortalLink } from "@/app/actions/booking-actions";
import { findSmartSlots, SmartSlot } from "@/app/actions/scheduling-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Calendar, MapPin, Package, User, Leaf } from "lucide-react";

import { useParams } from "next/navigation";
import { dictionary, Locale } from "@/lib/i18n/dictionary";

export default function ClientBookingPage() {
    const params = useParams();
    // casting to string to avoid array issues, though usually string in this case
    const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

    // Determine initial state based on token immediately
    const isNew = token === 'new';

    const [language, setLanguage] = useState<Locale>('fr'); // Default to French
    const t = dictionary[language];
    const b = t.booking;

    const [step, setStep] = useState(1); // Default to 1, adjust in effect
    const [isGuest, setIsGuest] = useState(false);
    const [guestInfo, setGuestInfo] = useState({ name: "", email: "", phone: "", street: "", city: "", postalCode: "" });
    const [loading, setLoading] = useState(true);
    const [clientData, setClientData] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);

    // Existing Client Detection State
    const [existingClient, setExistingClient] = useState<{ exists: boolean; name?: string; maskedEmail?: string; clientId?: string } | null>(null);
    const [showExistingClientModal, setShowExistingClientModal] = useState(false);
    const [sendingLink, setSendingLink] = useState(false);

    // Selections
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

    // Get unique dates sorted
    const availableDates = Object.keys(slotsByDate).sort();


    // Use token derived from params
    useEffect(() => {
        const init = async () => {
            if (!token) return; // Wait for token

            try {
                if (token === 'new') {
                    setIsGuest(true);
                    setStep(0);
                    const s = await getClientServices();
                    setServices(s);
                } else {
                    const link = await verifyBookingToken(token);
                    if (link) {
                        setClientData(link.client);
                        if (link.client.properties.length > 0) {
                            setSelectedPropertyId(link.client.properties[0].id);
                        }
                        const s = await getClientServices();
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
                    guestInfo,
                    selectedService.id,
                    new Date(selectedSlot.date),
                    selectedSlot.technicianId,
                    `Guest Self-Booking: ${selectedService.name}`
                ); // confirmGuestBooking now handles language if passed in clientInfo, but signature is (clientInfo, ...)
                // Wait, I need to pass language inside guestInfo or as separate arg?
                // logic in action: clientInfo: { ..., language?: string }
                // So I need to add language to guestInfo passed here.
                // But confirmGuestBooking calculates it from clientInfo.

                // Let's modify the call:
                await confirmGuestBooking(
                    { ...guestInfo, language },
                    selectedService.id,
                    new Date(selectedSlot.date),
                    selectedSlot.technicianId,
                    `Guest Self-Booking: ${selectedService.name}`
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

                    {/* STEP 1: SERVICES */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Package className="text-blue-600" /> {b.service.title}
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {services.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service)}
                                        className="text-left border p-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm"
                                    >
                                        <div className="font-bold text-lg">{service.name}</div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description || "Professional definition treatment."}</p>
                                        <div className="mt-3 font-semibold text-blue-600">{b.service.requestQuote}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SCHEDULE */}
                    {step === 2 && (
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
                                                const dateObj = new Date(dateStr + 'T00:00:00'); // Safe parsing for ISO date string yyyy-MM-dd
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
                                                {/* Deduplicate slots by time, picking the best one (already sorted by score from backend) */}
                                                {Array.from(
                                                    new Map(
                                                        slotsByDate[selectedDate]
                                                            .map(slot => [slot.startTime, slot])
                                                    ).values()
                                                )
                                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
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
