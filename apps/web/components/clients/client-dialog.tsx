import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createClient, updateClient, deleteClient, checkClientDuplicates } from "@/app/actions/client-actions";
import { Client } from "@prisma/client";

import { useDivision } from "@/components/providers/division-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useUser } from "@/components/providers/user-provider";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

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

    // Duplicate Detection State
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    // Use Partial<Client> or Pick<Client, ...> because checkClientDuplicates returns a subset
    const [potentialDuplicates, setPotentialDuplicates] = useState<Partial<Client>[]>([]);

    // Add router
    const { push } = useRouter();

    const { division } = useDivision();
    const { user } = useUser();

    useEffect(() => {
        if (isOpen) {
            setShowDuplicateWarning(false);
            setPotentialDuplicates([]);
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

        // New Client Duplicate Check
        if (!client && !showDuplicateWarning) {
            try {
                const duplicates = await checkClientDuplicates({ name, email, phone, division });

                // Filter out exact matches if any logic needed, but server returns duplicates
                // Also check if we are creating "Human" vs "Company" if that matters? 
                // For now, simple check.

                if (duplicates.length > 0) {
                    setPotentialDuplicates(duplicates as any[]); // types might mismatch slightly on createdAt
                    setShowDuplicateWarning(true);
                    setLoading(false);
                    return;
                }
            } catch (error) {
                console.error("Duplicate check failed", error);
                // Continue despite error? Or block?
                // Let's continue to avoid blocking creation if check fails
            }
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

            // Allow force delete if initial delete fails (likely due to constraints)
            if (confirm(language === 'FR'
                ? "Impossible de supprimer ce client car il a des données associées (Propriétés, Jobs, Factures, etc.). Voulez-vous FORCER la suppression de TOUTES ses données ? Cette action est irréversible."
                : "Cannot delete client because they have associated data (Properties, Jobs, Invoices, etc.). Do you want to FORCE delete ALL their data? This cannot be undone."
            )) {
                try {
                    await deleteClient(client.id, true);
                    toast.success(t.clientDialog.deleteSuccess);
                    onClose();
                } catch (forceError) {
                    console.error("Force delete failed:", forceError);
                    toast.error(t.clientDialog.deleteError);
                }
            } else {
                toast.error(t.clientDialog.deleteError);
            }
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
                    <AddressAutocomplete 
                        value={billingAddress}
                        onChange={(val) => setBillingAddress(val)}
                        onSelectAddress={(val) => setBillingAddress(val)}
                        placeholder={t.clientDialog.billingAddress}
                    />
                </div>

                {showDuplicateWarning && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                            {language === 'FR' ? 'Clients similaires trouvés' : 'Similar clients found'}
                        </h4>
                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                            {potentialDuplicates.map((dup) => (
                                <div key={dup.id} className="text-sm text-yellow-800 bg-yellow-100 p-3 rounded border border-yellow-200 flex justify-between items-center gap-2">
                                    <div className="flex-1">
                                        <div className="font-bold">{dup.name}</div>
                                        <div className="text-xs mt-1">
                                            {dup.email && <span className="block">{dup.email}</span>}
                                            {dup.phone && <span className="block">{dup.phone}</span>}
                                        </div>
                                        {dup.billingAddress && (
                                            <div className="text-xs text-yellow-700 mt-1 opacity-80">
                                                {dup.billingAddress}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (dup.id) {
                                                push(`/clients/${dup.id}`);
                                                onClose();
                                            }
                                        }}
                                        className="shrink-0 px-3 py-1.5 bg-white border border-yellow-300 rounded text-xs font-semibold hover:bg-yellow-50 text-yellow-900 shadow-sm"
                                    >
                                        {language === 'FR' ? 'Voir Fiche' : 'View Profile'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-end border-t border-yellow-200 pt-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDuplicateWarning(false);
                                    setPotentialDuplicates([]);
                                    setLoading(false);
                                }}
                                className="text-xs text-yellow-800 hover:text-yellow-900 underline px-2"
                            >
                                {language === 'FR' ? 'Ignorer et annuler' : 'Ignore & Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="text-xs bg-yellow-600 text-white px-3 py-2 rounded hover:bg-yellow-700 font-medium"
                            >
                                {language === 'FR' ? 'Créer un nouveau client quand même' : 'Create New Client Anyway'}
                            </button>
                        </div>
                    </div>
                )}

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
