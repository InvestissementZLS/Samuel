"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createClient, updateClient, deleteClient } from "@/app/actions/client-actions";
import { Client } from "@prisma/client";

interface ClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    client?: Client | null;
}

import { useDivision } from "@/components/providers/division-provider";

export function ClientDialog({ isOpen, onClose, client }: ClientDialogProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [language, setLanguage] = useState<"EN" | "FR">("FR");
    const [billingAddress, setBillingAddress] = useState("");
    const [divisions, setDivisions] = useState<("EXTERMINATION" | "ENTREPRISES")[]>([]);
    const [loading, setLoading] = useState(false);
    const { division } = useDivision();

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setName(client.name);
                setEmail(client.email || "");
                setPhone(client.phone || "");
                setLanguage((client.language as "EN" | "FR") || "FR");
                setBillingAddress(client.billingAddress || "");
                // @ts-ignore
                setDivisions(client.divisions || ["EXTERMINATION"]);
            } else {
                setName("");
                setEmail("");
                setPhone("");
                setLanguage("FR");
                setBillingAddress("");
                setDivisions([division]); // Default to current division
            }
        }
    }, [isOpen, client, division]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (divisions.length === 0) {
            toast.error("Please select at least one division");
            setLoading(false);
            return;
        }

        try {
            if (client) {
                await updateClient(client.id, { name, email, phone, billingAddress, language, divisions });
                toast.success("Client updated successfully");
            } else {
                await createClient({ name, email, phone, billingAddress, divisions, language });
                toast.success("Client created successfully");
            }
            onClose();
        } catch (error) {
            console.error("Failed to save client:", error);
            toast.error("Failed to save client");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!client || !confirm("Are you sure you want to delete this client?")) return;
        setLoading(true);
        try {
            await deleteClient(client.id);
            toast.success("Client deleted successfully");
            onClose();
        } catch (error) {
            console.error("Failed to delete client:", error);
            toast.error("Failed to delete client (May have associated properties/jobs)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={client ? "Edit Client" : "New Client"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background"
                    />
                </div>



                <div>
                    <label className="block text-sm font-medium mb-1">Language</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as "EN" | "FR")}
                        className="w-full rounded-md border p-2 bg-background"
                    >
                        <option value="FR">Français</option>
                        <option value="EN">English</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Divisions</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={divisions.includes("EXTERMINATION")}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setDivisions([...divisions, "EXTERMINATION"]);
                                    } else {
                                        setDivisions(divisions.filter(d => d !== "EXTERMINATION"));
                                    }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">Extermination</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={divisions.includes("ENTREPRISES")}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setDivisions([...divisions, "ENTREPRISES"]);
                                    } else {
                                        setDivisions(divisions.filter(d => d !== "ENTREPRISES"));
                                    }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">Entreprises</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Billing Address</label>
                    <textarea
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background"
                        rows={3}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {client && (
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
        </Modal >
    );
}
