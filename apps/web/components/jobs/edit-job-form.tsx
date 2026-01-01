"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createCalendarJob, updateCalendarJob } from "@/app/actions/calendar-actions";
import { createClient } from "@/app/actions/client-actions";
import { searchProducts, createQuickService } from "@/app/actions/product-actions";
import { useRouter } from "next/navigation";
import { Job, Property, Client, User, JobStatus } from "@prisma/client";
import { format } from "date-fns";
import { useDivision } from "@/components/providers/division-provider";
import { Plus, X, Search, Sparkles } from "lucide-react";
import { findSmartSlots, SmartSlot } from "@/app/actions/scheduling-actions";

type ClientWithProperties = Client & { properties: Property[] };

interface EditJobFormProps {
    job?: (Job & { property: Property & { client: Client }; technicians: User[] }) | null;
    initialDate?: Date;
    clients: ClientWithProperties[];
    technicians: User[];
    onSuccess?: () => void;
    onCancel?: () => void;
    redirectOnSuccess?: string;
}

export function EditJobForm({ job, initialDate, clients, technicians, onSuccess, onCancel, redirectOnSuccess }: EditJobFormProps) {
    const router = useRouter();
    const { division } = useDivision();

    // Form State
    const [clientId, setClientId] = useState("");
    const [propertyId, setPropertyId] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [techIds, setTechIds] = useState<string[]>([]);
    const [status, setStatus] = useState<JobStatus>("SCHEDULED");
    const [loading, setLoading] = useState(false);

    // Dynamic Product/Service State
    const [selectedProducts, setSelectedProducts] = useState<{ productId: string; name: string; type: string; quantity: number }[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Smart Scheduling
    const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
    const [smartSlots, setSmartSlots] = useState<SmartSlot[]>([]);
    const [analyzing, setAnalyzing] = useState(false);

    // New Client State
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientAddress, setNewClientAddress] = useState("");

    // Initialize
    useEffect(() => {
        if (job) {
            setClientId(job.property.clientId);
            setPropertyId(job.propertyId);
            setDescription(job.description || "");
            setDate(format(new Date(job.scheduledAt), "yyyy-MM-dd"));
            setTime(format(new Date(job.scheduledAt), "HH:mm"));
            setTechIds(job.technicians?.map(t => t.id) || []);
            setStatus(job.status);
            // Products
            const anyJob = job as any;
            if (anyJob.products) {
                setSelectedProducts(anyJob.products.map((p: any) => ({
                    productId: p.productId,
                    name: p.product.name,
                    type: p.product.type,
                    quantity: p.quantity
                })));
            } else {
                setSelectedProducts([]);
            }
        } else {
            // Default Defaults
            if (initialDate) {
                setDate(format(initialDate, "yyyy-MM-dd"));
                setTime(format(initialDate, "HH:mm"));
            } else {
                setDate(format(new Date(), "yyyy-MM-dd"));
                setTime("09:00");
            }
            setStatus("SCHEDULED");
        }
    }, [job, initialDate]);

    // Search Products Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (productSearch.length > 1) {
                try {
                    const results = await searchProducts(productSearch);
                    setSearchResults(results);
                } catch (err) {
                    console.error(err);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [productSearch]);

    // Actions
    const handleCreateClient = async () => {
        if (!newClientName) return;
        setLoading(true);
        try {
            const newClient = await createClient({
                name: newClientName,
                email: newClientEmail,
                billingAddress: newClientAddress,
                divisions: [division],
            });
            toast.success("Client created");
            setIsCreatingClient(false);
            setNewClientName("");
            setNewClientEmail("");
            setNewClientAddress("");
            router.refresh();
            if (newClient) {
                setClientId(newClient.id);
                // @ts-ignore
                if (newClient.properties && newClient.properties.length > 0) {
                    // @ts-ignore
                    setPropertyId(newClient.properties[0].id);
                }
            }
        } catch (error) {
            toast.error("Failed to create client");
        } finally {
            setLoading(false);
        }
    };

    const addProduct = (product: any) => {
        if (selectedProducts.some(p => p.productId === product.id)) return;

        // Auto-fill description if empty and product has one (Service Template)
        if (!description && product.description) {
            setDescription(product.description);
        }

        setSelectedProducts([...selectedProducts, {
            productId: product.id,
            name: product.name,
            type: product.type,
            quantity: 1
        }]);
        setProductSearch("");
        setSearchResults([]);
    };

    const createAndAddService = async () => {
        if (!productSearch) return;
        setLoading(true);
        try {
            const newService = await createQuickService(productSearch);
            addProduct(newService);
            toast.success(`Service "${newService.name}" created`);
        } catch (error) {
            toast.error("Failed to create service");
        } finally {
            setLoading(false);
        }
    };

    const handleSmartAnalyze = async () => {
        if (!propertyId) {
            toast.error("Please select a property first");
            return;
        }
        if (selectedProducts.length === 0) {
            toast.error("Please add a service first (to estimate duration)");
            return;
        }

        setAnalyzing(true);
        setIsSmartModalOpen(true);
        try {
            // Use the first product as the "main" service for duration estimates
            const mainServiceId = selectedProducts[0].productId;
            const slots = await findSmartSlots(mainServiceId, propertyId);
            setSmartSlots(slots);
        } catch (error) {
            console.error(error);
            toast.error("Analysis failed");
        } finally {
            setAnalyzing(false);
        }
    };

    const applySmartSlot = (slot: SmartSlot) => {
        setDate(format(new Date(slot.date), "yyyy-MM-dd"));
        setTime(slot.startTime);
        setTechIds([slot.technicianId]);
        setIsSmartModalOpen(false);
        toast.success("Schedule optimized!");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const scheduledAt = new Date(`${date}T${time}`);
            const scheduledEndAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000);

            const payload = {
                propertyId,
                description,
                scheduledAt,
                scheduledEndAt,
                technicianIds: techIds,
                status,
                products: selectedProducts.map(p => ({ productId: p.productId, quantity: p.quantity }))
            };

            if (job) {
                await updateCalendarJob(job.id, payload);
                toast.success("Job updated");
            } else {
                await createCalendarJob({ ...payload, division });
                toast.success("Job created");
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save job");
        } finally {
            setLoading(false);
        }
    };

    const selectedClient = clients.find((c) => c.id === clientId);

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-1 rounded-lg">
                <div className={`grid gap-4 ${isCreatingClient ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {/* Client Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Client</label>
                            <div className="flex gap-2">
                                {!job && (
                                    <button type="button" onClick={() => setIsCreatingClient(!isCreatingClient)} className="text-xs text-indigo-600 hover:underline">
                                        {isCreatingClient ? "Cancel" : "+ New Client"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {isCreatingClient ? (
                            <div className="space-y-2 p-3 bg-gray-50 rounded-md border text-gray-900">
                                <input className="w-full rounded border p-2 text-sm" placeholder="Client Name" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                                <input className="w-full rounded border p-2 text-sm" placeholder="Email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
                                <input className="w-full rounded border p-2 text-sm" placeholder="Address" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} />
                                <button type="button" onClick={handleCreateClient} disabled={loading} className="w-full bg-indigo-600 text-white rounded py-1.5 text-sm">Create Client</button>
                            </div>
                        ) : (
                            <select className="w-full rounded border p-2 text-sm text-gray-900" value={clientId} onChange={(e) => { setClientId(e.target.value); setPropertyId(""); }} required disabled={!!job}>
                                <option value="">Select Client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Property Selection */}
                    <div className={isCreatingClient ? "hidden" : "block"}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                        <select className="w-full rounded border p-2 text-sm text-gray-900" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required disabled={!clientId}>
                            <option value="">Select Property</option>
                            {selectedClient?.properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                        </select>
                    </div>
                </div>

                {/* Date & Time */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium text-gray-700">Schedule</label>
                        <button
                            type="button"
                            onClick={handleSmartAnalyze}
                            className="text-xs flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-1 rounded shadow-sm hover:opacity-90 transition-all"
                        >
                            <Sparkles size={12} />
                            AI Suggest
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded border p-2 text-sm text-gray-900" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Time</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded border p-2 text-sm text-gray-900" required />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded border p-2 text-sm text-gray-900" rows={2} />
                </div>

                {/* Technicians & Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Technicians</label>
                        <div className="border rounded max-h-32 overflow-y-auto p-2 bg-white text-gray-900">
                            {technicians.map(tech => (
                                <label key={tech.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer text-sm">
                                    <input type="checkbox" checked={techIds.includes(tech.id)} onChange={e => {
                                        e.target.checked ? setTechIds([...techIds, tech.id]) : setTechIds(techIds.filter(id => id !== tech.id));
                                    }} />
                                    <span>{tech.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as JobStatus)} className="w-full rounded border p-2 text-sm text-gray-900">
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Services / Products */}
                <div className="border-t pt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Services & Products</label>

                    <div className="relative mb-3">
                        <input
                            type="text"
                            placeholder="Search service or product..."
                            className="w-full rounded border p-2 text-sm pl-8 text-gray-900"
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                        />
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />

                        {/* Create New Service Button */}
                        {productSearch && (
                            <div className="absolute right-2 top-1.5">
                                <button type="button" onClick={createAndAddService} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 border border-indigo-200">
                                    + Create "{productSearch}"
                                </button>
                            </div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(p => (
                                    <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left p-2 text-sm hover:bg-gray-50 border-b last:border-0 flex justify-between text-gray-900">
                                        <span>{p.name}</span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">{p.type}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {selectedProducts.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded border text-sm text-gray-900">
                                <div>
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">({p.type})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {p.type !== 'SERVICE' && (
                                        <span className="text-xs text-gray-500">Qty: {p.quantity}</span>
                                    )}
                                    <button type="button" onClick={() => setSelectedProducts(selectedProducts.filter(x => x.productId !== p.productId))} className="text-red-500 hover:text-red-700">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                    )}
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow-sm">
                        {loading ? "Saving..." : (job ? "Update Work Order" : "Create Work Order")}
                    </button>
                </div>
            </form>

            {/* Smart Scheduling Modal */}
            {
                isSmartModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Sparkles className="text-purple-600" size={18} />
                                    Optimization Assistant
                                </h3>
                                <button onClick={() => setIsSmartModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto">
                                {analyzing ? (
                                    <div className="py-8 text-center text-gray-500">
                                        <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        Analyzing routes & schedules...
                                    </div>
                                ) : smartSlots.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No optimized slots found for this week.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {smartSlots.map((slot, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => applySmartSlot(slot)}
                                                className="w-full text-left p-3 rounded border hover:border-purple-300 hover:bg-purple-50 transition-colors flex justify-between items-start group"
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {format(new Date(slot.date), "EEEE, MMM d")} @ {slot.startTime}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Tech: {slot.technicianName}
                                                    </div>
                                                    <div className="text-xs text-purple-700 mt-1 font-medium">
                                                        {slot.reason}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${slot.score > 80 ? 'bg-green-100 text-green-700' :
                                                        slot.score > 60 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {slot.score}% Efficient
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
