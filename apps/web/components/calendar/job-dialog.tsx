"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";

import { createCalendarJob, updateCalendarJob, deleteCalendarJob } from "@/app/actions/calendar-actions";
import { createClient } from "@/app/actions/client-actions";
import { useRouter } from "next/navigation";
import { Job, Property, Client, User } from "@prisma/client";
import { format } from "date-fns";

type ClientWithProperties = Client & { properties: Property[] };

interface JobDialogProps {
    isOpen: boolean;
    onClose: () => void;
    job?: (Job & { property: Property & { client: Client }; technicians: User[] }) | null;
    initialDate?: Date;
    clients: ClientWithProperties[];
    technicians: User[];
}

import { JobStatus } from "@prisma/client";

// ... (keep existing imports)

import { useDivision } from "@/components/providers/division-provider";

import { searchProducts, createQuickService } from "@/app/actions/product-actions";
import { Plus, X, Search } from "lucide-react";

export function JobDialog({ isOpen, onClose, job, initialDate, clients, technicians }: JobDialogProps) {
    const [clientId, setClientId] = useState("");
    const [propertyId, setPropertyId] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [techIds, setTechIds] = useState<string[]>([]);
    const [status, setStatus] = useState<JobStatus>("SCHEDULED");
    const [loading, setLoading] = useState(false);
    const { division } = useDivision();

    // Product/Service Selection State
    const [selectedProducts, setSelectedProducts] = useState<{ productId: string; name: string; type: string; quantity: number }[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Quick Client Create State
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientAddress, setNewClientAddress] = useState("");
    const router = useRouter();

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
            if (newClient) setClientId(newClient.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create client");
        } finally {
            setLoading(false);
        }
    };

    // Product Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (productSearch.length > 1) {
                setIsSearching(true);
                try {
                    const results = await searchProducts(productSearch);
                    setSearchResults(results);
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [productSearch]);

    const addProduct = (product: any) => {
        if (selectedProducts.some(p => p.productId === product.id)) return;
        setSelectedProducts([...selectedProducts, {
            productId: product.id,
            name: product.name,
            type: product.type,
            quantity: 1
        }]);
        setProductSearch("");
        setSearchResults([]);
    };

    const removeProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
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

    useEffect(() => {
        if (isOpen) {
            if (job) {
                setClientId(job.property.clientId);
                setPropertyId(job.propertyId);
                setDescription(job.description || "");
                setDate(format(new Date(job.scheduledAt), "yyyy-MM-dd"));
                setTime(format(new Date(job.scheduledAt), "HH:mm"));
                setTechIds(job.technicians?.map(t => t.id) || []);
                setStatus(job.status);
                // Load existing products if they were passed in via props (need to modify parent fetch to include them)
                // Assuming job prop might not have products yet, but for now we initialize empty or need parent update.
                // TODO: Ensure parent component fetches 'products' relation.
                // For this edit, we'll assume job might have it or we start empty.
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
                setClientId("");
                setPropertyId("");
                setDescription("");
                if (initialDate) {
                    setDate(format(initialDate, "yyyy-MM-dd"));
                    setTime(format(initialDate, "HH:mm"));
                } else {
                    setDate(format(new Date(), "yyyy-MM-dd"));
                    setTime("09:00");
                }
                setTechIds([]);
                setStatus("SCHEDULED");
                setSelectedProducts([]);
            }
        }
    }, [isOpen, job, initialDate]);

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
                toast.success("Job updated successfully");
            } else {
                await createCalendarJob({ ...payload, division });
                toast.success("Job created successfully");
            }
            onClose();
        } catch (error) {
            console.error("Failed to save job:", error);
            toast.error("Failed to save job");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!job || !confirm("Are you sure you want to delete this job?")) return;
        setLoading(true);
        try {
            await deleteCalendarJob(job.id);
            toast.success("Job deleted successfully");
            onClose();
        } catch (error) {
            console.error("Failed to delete job:", error);
            toast.error("Failed to delete job");
        } finally {
            setLoading(false);
        }
    };

    const selectedClient = clients.find((c) => c.id === clientId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={job ? "Edit Job" : "New Job"}>
            <form onSubmit={handleSubmit} className="space-y-3">
                {/* ... (Client/Property/Date/Tech/Status sections kept same logic, just reducing verbosity here) ... */}
                {/* Re-implementing the grid structure for context */}
                <div className={`grid gap-3 ${isCreatingClient ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-foreground">Client</label>
                            <div className="flex gap-2">
                                {clientId && !isCreatingClient && (
                                    <a href={`/clients/${clientId}`} target="_blank" className="text-xs text-blue-600 hover:underline">View Profile</a>
                                )}
                                {!job && (
                                    <button type="button" onClick={() => setIsCreatingClient(!isCreatingClient)} className="text-xs text-indigo-600 hover:underline">
                                        {isCreatingClient ? "Cancel" : "+ New"}
                                    </button>
                                )}
                            </div>
                        </div>
                        {isCreatingClient ? (
                            <div className="space-y-2 p-2 bg-muted/50 rounded-md border">
                                <input type="text" placeholder="Client Name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="email" placeholder="Email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                                    <input type="text" placeholder="Address" value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" />
                                </div>
                                <button type="button" onClick={handleCreateClient} disabled={!newClientName || loading} className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded text-xs">Save Client</button>
                            </div>
                        ) : (
                            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setPropertyId(""); }} className="w-full rounded-md border px-2 py-1.5 text-sm h-9" required disabled={!!job}>
                                <option value="">Select Client</option>
                                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div className={isCreatingClient ? "hidden" : "block"}>
                        <label className="block text-sm font-medium mb-1 text-foreground">Property</label>
                        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm h-9" required disabled={!clientId}>
                            <option value="">Select Property</option>
                            {selectedClient?.properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm h-9" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Time</label>
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm h-9" required />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Technicians</label>
                        <div className="border rounded-md p-1.5 max-h-24 overflow-y-auto bg-background">
                            {technicians.map((tech) => (
                                <label key={tech.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded cursor-pointer">
                                    <input type="checkbox" checked={techIds.includes(tech.id)} onChange={(e) => { e.target.checked ? setTechIds([...techIds, tech.id]) : setTechIds(techIds.filter(id => id !== tech.id)); }} className="rounded h-3 w-3" />
                                    <span className="text-xs text-foreground">{tech.name || tech.email}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} className="w-full rounded-md border px-2 py-1.5 text-sm h-9">
                            <option value="PENDING">Pending</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* --- SERVICE / PRODUCT SELECTION --- */}
                <div className="border-t pt-3">
                    <label className="block text-sm font-medium mb-2 text-foreground">Services & Products</label>

                    {/* Search Input */}
                    <div className="relative mb-2">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search or Create Service (e.g. 'Inspection')"
                                    className="w-full rounded-md border pl-9 pr-4 py-1.5 text-sm"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>
                            {/* Create button shows if search is not empty and no exact match (simplified logic) */}
                            {productSearch && (
                                <button
                                    type="button"
                                    onClick={createAndAddService}
                                    className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-md whitespace-nowrap hover:bg-indigo-100"
                                >
                                    + Create "{productSearch}"
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {searchResults.map(prod => (
                                    <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() => addProduct(prod)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center"
                                    >
                                        <span>{prod.name}</span>
                                        <span className="text-xs text-muted-foreground bg-gray-100 px-1 rounded">{prod.type}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Items List */}
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedProducts.length === 0 && <p className="text-xs text-muted-foreground italic">No services or products added.</p>}
                        {selectedProducts.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded-md border">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${p.type === 'SERVICE' ? 'bg-indigo-500' : 'bg-gray-400'}`} />
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-xs text-muted-foreground">({p.type})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Only show qty for non-service? Or allow multiple services? Keep logic standard for now */}
                                    {p.type !== 'SERVICE' && (
                                        <span className="text-xs text-muted-foreground">Qty: {p.quantity}</span>
                                    )}
                                    <button type="button" onClick={() => removeProduct(p.productId)} className="text-red-500 hover:text-red-700">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" rows={2} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {job && (
                        <button type="button" onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md" disabled={loading}>Delete</button>
                    )}
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted" disabled={loading}>Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                </div>
            </form>
        </Modal>
    );
}
