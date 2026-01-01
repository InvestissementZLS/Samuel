"use client";

import { useEffect, useState } from "react";
import { verifyBookingToken, confirmBooking, getClientServices, confirmGuestBooking } from "@/app/actions/booking-actions";
import { findSmartSlots, SmartSlot } from "@/app/actions/scheduling-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Calendar, MapPin, Package, User } from "lucide-react";

import { useParams } from "next/navigation";

export default function ClientBookingPage() {
    const params = useParams();
    // casting to string to avoid array issues, though usually string in this case
    const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

    // Determine initial state based on token immediately
    const isNew = token === 'new';

    // We cannot reliably initialize state from useParams during first render on some Next.js versions 
    // because useParams might be empty initially during hydration.
    // However, for standard pages it should be fine. 
    // To be safe, let's use useEffect to set isGuest if token changes.
    // OR just rely on derived state if we can. 

    const [step, setStep] = useState(1); // Default to 1, adjust in effect
    const [isGuest, setIsGuest] = useState(false);
    const [guestInfo, setGuestInfo] = useState({ name: "", email: "", phone: "", address: "" });
    const [loading, setLoading] = useState(true);
    const [clientData, setClientData] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);

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

    const handleGuestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setClientData({ name: guestInfo.name, properties: [{ id: 'temp', address: guestInfo.address }] }); // Temp data for UI
        setSelectedPropertyId('temp');
        setStep(1);
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
                toast.error(e.message || "Could not find slots. Please try again.");
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
                <h2 className="text-xl font-bold mb-2">Invalid or Expired Link</h2>
                <p className="text-sm text-gray-500">Token ID: {token || "Missing"}</p>
                <p className="mt-4">Please request a new booking link.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white">
                    <h1 className="text-2xl font-bold">Booking Portal</h1>
                    <p className="opacity-90">Welcome{clientData ? `, ${clientData.name}` : ''}</p>
                </div>

                {/* Progress */}
                <div className="flex border-b">
                    {isGuest && (
                        <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 0 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>0. Info</div>
                    )}
                    <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 1 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>1. Service</div>
                    <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 2 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>2. Schedule</div>
                    <div className={`flex-1 p-3 text-center text-sm font-medium ${step >= 3 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>3. Confirmation</div>
                </div>

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
                                <User className="text-blue-600" /> Your Information
                            </h2>
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input required className="w-full border p-2 rounded" value={guestInfo.name} onChange={e => setGuestInfo({ ...guestInfo, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input required type="email" className="w-full border p-2 rounded" value={guestInfo.email} onChange={e => setGuestInfo({ ...guestInfo, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input required type="tel" className="w-full border p-2 rounded" value={guestInfo.phone} onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Service Address</label>
                                <input required className="w-full border p-2 rounded" value={guestInfo.address} onChange={e => setGuestInfo({ ...guestInfo, address: e.target.value })} />
                            </div>
                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
                                Continue
                            </button>
                        </form>
                    )}

                    {/* STEP 1: SERVICES */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Package className="text-blue-600" /> Select a Service
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
                                        <div className="mt-3 font-semibold text-blue-600">Request Quote</div>
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
                                    <span className="text-sm text-gray-500">Service</span>
                                    <div className="font-bold">{selectedService.name}</div>
                                </div>
                                <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline">Change</button>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Calendar className="text-blue-600" /> Choose a Time
                                </h2>

                                {analyzingSlots ? (
                                    <div className="py-8 text-center text-gray-500">
                                        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        Finding best availability...
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
                                                    .map((slot, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setSelectedSlot(slot)}
                                                            className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${selectedSlot?.startTime === slot.startTime && selectedSlot?.date.toString() === slot.date.toString()
                                                                ? 'border-blue-600 bg-blue-50 shadow-md ring-1 ring-blue-600'
                                                                : 'hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-gray-900">
                                                                    {slot.startTime}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {slot.reason.includes("Guest") ? "Available" : "Best Slot"}
                                                                </div>
                                                            </div>
                                                            {selectedSlot?.startTime === slot.startTime && <Check className="h-4 w-4 text-blue-600" />}
                                                        </button>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg dashed border border-gray-200">
                                                {availableDates.length > 0 ? "Select a date to view times." : "No slots available."}
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
                                {loading ? "Confirming..." : "Confirm Booking"}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                            <p className="text-gray-600 mb-6">
                                We have scheduled your appointment for <strong>{selectedSlot && format(new Date(selectedSlot.date), "EEEE, MMMM d")} at {selectedSlot?.startTime}</strong>.
                            </p>
                            <p className="text-sm text-gray-500">
                                You will receive a confirmation email shortly.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
