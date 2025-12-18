"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createTechnician, updateTechnician, deleteTechnician } from "@/app/actions/technician-actions";
import { User } from "@prisma/client";

interface TechnicianDialogProps {
    isOpen: boolean;
    onClose: () => void;
    technician?: User | null;
}

export function TechnicianDialog({ isOpen, onClose, technician }: TechnicianDialogProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [internalHourlyRate, setInternalHourlyRate] = useState(0);
    const [commissionPercentageSales, setCommissionPercentageSales] = useState(0);
    const [commissionPercentageSupervision, setCommissionPercentageSupervision] = useState(0);
    const [canManageCommissions, setCanManageCommissions] = useState(false);
    const [divisions, setDivisions] = useState<("EXTERMINATION" | "ENTREPRISES")[]>([]);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (technician) {
                setName(technician.name || "");
                setEmail(technician.email);
                // @ts-ignore
                setInternalHourlyRate(technician.internalHourlyRate || 0);
                // @ts-ignore
                setCommissionPercentageSales(technician.commissionPercentageSales || 0);
                // @ts-ignore
                setCommissionPercentageSupervision(technician.commissionPercentageSupervision || 0);
                // @ts-ignore
                // @ts-ignore
                setCanManageCommissions(technician.canManageCommissions || false);
                // @ts-ignore
                setDivisions(technician.divisions || ["EXTERMINATION"]);
            } else {
                setName("");
                setEmail("");
                setInternalHourlyRate(0);
                setCommissionPercentageSales(0);
                setCommissionPercentageSupervision(0);
                setCanManageCommissions(false);
                setDivisions(["EXTERMINATION"]);
            }
        }
    }, [isOpen, technician]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (technician) {
                await updateTechnician(technician.id, {
                    name,
                    email,
                    internalHourlyRate,
                    commissionPercentageSales,
                    commissionPercentageSupervision,
                    canManageCommissions,
                    password: password || undefined,
                    divisions,
                });
                toast.success("Technician updated successfully");
            } else {
                await createTechnician({
                    name,
                    email,
                    password,
                    internalHourlyRate,
                    commissionPercentageSales,
                    commissionPercentageSupervision,
                    canManageCommissions,
                    divisions
                });
                toast.success("Technician created successfully");
            }
            onClose();
        } catch (error) {
            console.error("Failed to save technician:", error);
            toast.error("Failed to save technician");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!technician || !confirm("Are you sure you want to delete this technician?")) return;
        setLoading(true);
        try {
            await deleteTechnician(technician.id);
            toast.success("Technician deleted successfully");
            onClose();
        } catch (error) {
            console.error("Failed to delete technician:", error);
            toast.error("Failed to delete technician (User may have assigned jobs)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={technician ? "Edit Technician" : "New Technician"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">
                        {technician ? "New Password (leave blank to keep current)" : "Password"}
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        placeholder={technician ? "********" : "Required for login"}
                        required={!technician}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Hourly Rate ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={internalHourlyRate}
                            onChange={(e) => setInternalHourlyRate(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Sales Comm. (%)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={commissionPercentageSales}
                            onChange={(e) => setCommissionPercentageSales(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Supervision Comm. (%)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={commissionPercentageSupervision}
                            onChange={(e) => setCommissionPercentageSupervision(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="canManageCommissions"
                        checked={canManageCommissions}
                        onChange={(e) => setCanManageCommissions(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="canManageCommissions" className="text-sm font-medium text-foreground">
                        Can Manage Commissions (Pay & View All)
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Divisions</label>
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
                            <span className="text-sm text-foreground">Extermination</span>
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
                            <span className="text-sm text-foreground">Entreprises</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {technician && (
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
