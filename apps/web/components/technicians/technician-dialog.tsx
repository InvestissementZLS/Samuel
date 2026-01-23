"use client";


import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createTechnician, updateTechnician, deleteTechnician } from "@/app/actions/technician-actions";

import { User, Division, Role, UserDivisionAccess } from "@prisma/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Plus, Trash, Shield } from "lucide-react";

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

    // Legacy state for display reference, but we rely on divisionAccesses
    const [divisions, setDivisions] = useState<("EXTERMINATION" | "ENTREPRISES" | "RENOVATION")[]>([]);

    // New Access State
    const [accesses, setAccesses] = useState<Partial<UserDivisionAccess>[]>([]);

    const [password, setPassword] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    const { user: currentUser } = useCurrentUser();
    const isMaster = currentUser?.canManageDivisions;

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

                // Load Accesses
                // @ts-ignore
                if (technician.accesses) {
                    // @ts-ignore
                    setAccesses(technician.accesses);
                } else if (technician.divisions) {
                    // Backwards compat for display if accesses missing
                    setAccesses(technician.divisions.map(d => ({
                        division: d,
                        role: technician.role,
                        canViewReports: technician.canViewReports,
                        canManageTimesheets: technician.canManageTimesheets,
                        canManageExpenses: technician.canManageExpenses,
                        canManageUsers: technician.canManageUsers,
                        canManageCommissions: technician.canManageCommissions
                    })));
                }

                // @ts-ignore
                setDivisions(technician.divisions || ["EXTERMINATION"]);
                // @ts-ignore
                setIsActive(technician.isActive ?? true);
            } else {
                setName("");
                setEmail("");
                setInternalHourlyRate(0);
                setCommissionPercentageSales(0);
                setCommissionPercentageSupervision(0);
                setCommissionPercentageSupervision(0);
                setCanManageCommissions(false);
                setAccesses([]);
                setDivisions(["EXTERMINATION"]);
                setIsActive(true);
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
                    // Pass legacy global flags as false/defaults or derived from first access
                    // Ideally API should handle this translation
                    password: password || undefined,
                    divisions,
                    accesses: accesses, // New field
                    isActive,
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
                    divisions,
                    accesses: accesses, // New field
                    isActive
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

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                        Active (Visible to everyone)
                    </label>
                </div>

                {/* Only Master Admin can manage Granular Permissions & Divisions */}
                {isMaster && (
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Access & Permissions (Per Division)
                        </h3>

                        <div className="space-y-4">
                            {accesses.map((access, index) => (
                                <div key={access.division} className="p-4 border rounded-md bg-muted/20 relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newAccesses = [...accesses];
                                            newAccesses.splice(index, 1);
                                            setAccesses(newAccesses);
                                        }}
                                        className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Division</label>
                                            <div className="font-medium text-foreground">{access.division}</div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Role</label>
                                            <select
                                                value={access.role}
                                                onChange={(e) => {
                                                    const newAccesses = [...accesses];
                                                    // @ts-ignore
                                                    newAccesses[index].role = e.target.value;
                                                    setAccesses(newAccesses);
                                                }}
                                                className="w-full text-sm border rounded p-1 bg-background text-foreground"
                                            >
                                                <option value="TECHNICIAN">Technician</option>
                                                <option value="OFFICE">Office</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={access.canViewReports}
                                                onChange={(e) => {
                                                    const newAccesses = [...accesses];
                                                    // @ts-ignore
                                                    newAccesses[index].canViewReports = e.target.checked;
                                                    setAccesses(newAccesses);
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm text-foreground">View Reports</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={access.canManageTimesheets}
                                                onChange={(e) => {
                                                    const newAccesses = [...accesses];
                                                    // @ts-ignore
                                                    newAccesses[index].canManageTimesheets = e.target.checked;
                                                    setAccesses(newAccesses);
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm text-foreground">Manage Timesheets</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={access.canManageExpenses}
                                                onChange={(e) => {
                                                    const newAccesses = [...accesses];
                                                    // @ts-ignore
                                                    newAccesses[index].canManageExpenses = e.target.checked;
                                                    setAccesses(newAccesses);
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm text-foreground">Manage Expenses</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={access.canManageUsers}
                                                onChange={(e) => {
                                                    const newAccesses = [...accesses];
                                                    // @ts-ignore
                                                    newAccesses[index].canManageUsers = e.target.checked;
                                                    setAccesses(newAccesses);
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm text-foreground">Manage Users</span>
                                        </label>
                                    </div>
                                </div>
                            ))}

                            <div className="flex gap-2">
                                {["EXTERMINATION", "ENTREPRISES", "RENOVATION"]
                                    .filter(d => !accesses.find(a => a.division === d))
                                    .map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => {
                                                setAccesses([...accesses, {
                                                    // @ts-ignore
                                                    division: d,
                                                    role: "TECHNICIAN",
                                                    canViewReports: false,
                                                    canManageTimesheets: false,
                                                    canManageExpenses: false,
                                                    canManageUsers: false,
                                                    canManageCommissions: false
                                                }]);
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-gray-50 border-dashed"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add {d}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

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
