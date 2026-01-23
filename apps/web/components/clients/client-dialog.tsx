"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createClient, updateClient, deleteClient } from "@/app/actions/client-actions";
import { Client } from "@prisma/client";

import { useDivision } from "@/components/providers/division-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";

interface ClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    client?: Client | null;
}

export function ClientDialog({ isOpen, onClose, client }: ClientDialogProps) {
    const { t } = useLanguage();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [language, setLanguage] = useState<"EN" | "FR">("FR");
    const [billingAddress, setBillingAddress] = useState("");
    const [divisions, setDivisions] = useState<("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[]>([]);
    const [loading, setLoading] = useState(false);
    const { division } = useDivision();
    const { user } = useUser();

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
            toast.error(t.clientDialog.selectDivisionError);
            setLoading(false);
            return;
        }

        try {
            if (client) {
                await updateClient(client.id, { name, email, phone, billingAddress, language, divisions });
                toast.success(t.clientDialog.updateSuccess);
            } else {
                await createClient({ name, email, phone, billingAddress, divisions, language });
                toast.success(t.clientDialog.createSuccess);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save client:", error);
            toast.error(t.clientDialog.saveError);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!client || !confirm(t.clientDialog.confirmDelete)) return;
        setLoading(true);
        try {
            await deleteClient(client.id);
            toast.success(t.clientDialog.deleteSuccess);
            onClose();
        } catch (error) {
            console.error("Failed to delete client:", error);
            toast.error(t.clientDialog.deleteError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={client ? t.clientDialog.editClient : t.clientDialog.newClient}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.clientDialog.name}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.clientDialog.email}</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.clientDialog.phone}</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.clientDialog.language}</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as "EN" | "FR")}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                    >
                        <option value="FR">Français</option>
                        <option value="EN">English</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.clientDialog.divisions}</label>
                    <div className="flex gap-4 flex-wrap">
                        {/* Extermination Option - Visible if user has access */}
                        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.divisions.includes("EXTERMINATION")) && (
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
                                <span className="text-sm text-foreground">{t.divisions.extermination}</span>
                            </label>
                        )}

                        {/* Entreprises Option - Visible if user has access */}
                        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.divisions.includes("ENTREPRISES")) && (
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
                                <span className="text-sm text-foreground">{t.divisions.entreprises}</span>
                            </label>
                        )}

                        {/* Renovation Option - Visible if user has access */}
                        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.divisions.includes("RENOVATION")) && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={divisions.includes("RENOVATION")}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setDivisions([...divisions, "RENOVATION"]);
                                        } else {
                                            setDivisions(divisions.filter(d => d !== "RENOVATION"));
                                        }
                                    }}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-foreground">Rénovation Esthéban</span>
                            </label>
                        )}
                    </div>

                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.clientDialog.billingAddress}</label>
                    <textarea
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
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
                            {t.clientDialog.delete}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                        disabled={loading}
                    >
                        {t.clientDialog.cancel}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        disabled={loading}
                    >
                        {loading ? t.clientDialog.saving : t.clientDialog.save}
                    </button>
                </div>
            </form>
        </Modal >
    );
}
