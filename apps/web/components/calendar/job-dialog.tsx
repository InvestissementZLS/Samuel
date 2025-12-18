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
            // Optimistically set clientId if we got the client back
            if (newClient) {
                setClientId(newClient.id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to create client");
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
            }
        }
    }, [isOpen, job, initialDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const scheduledAt = new Date(`${date}T${time}`);
            const scheduledEndAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000);

            if (job) {
                await updateCalendarJob(job.id, {
                    propertyId,
                    description,
                    scheduledAt,
                    scheduledEndAt,
                    technicianIds: techIds,
                    status,
                });
                toast.success("Job updated successfully");
            } else {
                await createCalendarJob({
                    propertyId,
                    description,
                    scheduledAt,
                    scheduledEndAt,
                    technicianIds: techIds,
                    status,
                    division,
                });
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={job ? "Edit Job" : "New Job"}
        >
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className={`grid gap-3 ${isCreatingClient ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium">Client</label>
                            <div className="flex gap-2">
                                {clientId && !isCreatingClient && (
                                    <a
                                        href={`/clients/${clientId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        View Client Profile
                                    </a>
                                )}
                                {!job && (
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingClient(!isCreatingClient)}
                                        className="text-xs text-indigo-600 hover:underline"
                                    >
                                        {isCreatingClient ? "Cancel" : "+ New"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {isCreatingClient ? (
                            <div className="space-y-2 p-2 bg-gray-50 rounded-md border">
                                <input
                                    type="text"
                                    placeholder="Client Name"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full rounded-md border px-2 py-1.5 text-sm bg-white text-gray-900"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={newClientEmail}
                                        onChange={(e) => setNewClientEmail(e.target.value)}
                                        className="w-full rounded-md border px-2 py-1.5 text-sm bg-white text-gray-900"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Address"
                                        value={newClientAddress}
                                        onChange={(e) => setNewClientAddress(e.target.value)}
                                        className="w-full rounded-md border px-2 py-1.5 text-sm bg-white text-gray-900"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateClient}
                                    disabled={!newClientName || loading}
                                    className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : "Save Client"}
                                </button>
                            </div>
                        ) : (
                            <select
                                value={clientId}
                                onChange={(e) => {
                                    setClientId(e.target.value);
                                    setPropertyId("");
                                }}
                                className="w-full rounded-md border px-2 py-1.5 bg-white text-gray-900 text-sm h-9"
                                required
                                disabled={!!job}
                            >
                                <option value="">Select Client</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className={isCreatingClient ? "hidden" : "block"}>
                        <label className="block text-sm font-medium mb-1">Property</label>
                        <select
                            value={propertyId}
                            onChange={(e) => setPropertyId(e.target.value)}
                            className="w-full rounded-md border px-2 py-1.5 bg-white text-gray-900 text-sm h-9"
                            required
                            disabled={!clientId}
                        >
                            <option value="">Select Property</option>
                            {selectedClient?.properties.map((property) => (
                                <option key={property.id} value={property.id}>
                                    {property.address}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-md border px-2 py-1.5 bg-white text-gray-900 text-sm h-9"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full rounded-md border px-2 py-1.5 bg-white text-gray-900 text-sm h-9"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Technicians</label>
                        <div className="border rounded-md p-1.5 max-h-24 overflow-y-auto bg-background">
                            {technicians.map((tech) => (
                                <label key={tech.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={techIds.includes(tech.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setTechIds([...techIds, tech.id]);
                                            } else {
                                                setTechIds(techIds.filter(id => id !== tech.id));
                                            }
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                    />
                                    <span className="text-xs">{tech.name || tech.email}</span>
                                </label>
                            ))}
                            {technicians.length === 0 && (
                                <div className="text-xs text-gray-500 italic p-1">No technicians found</div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as JobStatus)}
                            className="w-full rounded-md border px-2 py-1.5 bg-white text-gray-900 text-sm h-9"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-md border px-2 py-1.5 bg-white text-gray-900 text-sm"
                        rows={2}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {job && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                            disabled={loading}
                        >
                            Delete
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
