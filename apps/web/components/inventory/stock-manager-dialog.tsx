"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Plus, Minus, User as UserIcon } from "lucide-react";
import { getProductStockDetails, assignStockToUser, removeStockFromUser, getTechnicians } from "@/app/actions/inventory-actions";
import { toast } from "sonner";
import { Product } from "@prisma/client";

interface StockManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export function StockManagerDialog({ isOpen, onClose, product }: StockManagerDialogProps) {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<{ id: string, name: string | null }[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state for new assignment
    const [selectedTech, setSelectedTech] = useState("");
    const [quantityToAdd, setQuantityToAdd] = useState(1);

    const fetchData = async () => {
        if (!product) return;
        setLoading(true);
        try {
            const [stockData, techs] = await Promise.all([
                getProductStockDetails(product.id),
                getTechnicians()
            ]);
            setAssignments(stockData);
            setTechnicians(techs);
            if (techs.length > 0) setSelectedTech(techs[0].id);
        } catch (error) {
            toast.error("Error loading inventory data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && product) {
            fetchData();
        }
    }, [isOpen, product]);

    const handleAssign = async () => {
        if (!product || !selectedTech) return;

        // Simple client-side check: Don't allow assigning more than total stock? 
        // For now, we assume Product.stock is total, so we don't strictly enforce warehouse limits 
        // unless we calculate "Unassigned = Total - Assigned".
        // Let's assume infinite flexibility for now to be helpful.

        await assignStockToUser(product.id, selectedTech, Number(quantityToAdd));
        toast.success("Stock assigned");
        fetchData();
    };

    const handleRemove = async (userId: string, qty: number) => {
        if (!product) return;
        if (confirm(`Return ${qty} items to warehouse?`)) {
            await removeStockFromUser(product.id, userId, qty);
            toast.success("Stock returned");
            fetchData();
        }
    };

    if (!product) return null;

    // Calculate unassigned stats
    const totalAssigned = assignments.reduce((acc, curr) => acc + curr.quantity, 0);
    const unassigned = product.stock - totalAssigned;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Distribution: ${product.name}`}
            description="Assign equipment or materials to technicians."
        >
            <div className="space-y-6">
                {/* Global Stats */}
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg text-center">
                    <div>
                        <div className="text-xl font-bold text-gray-900">{product.stock}</div>
                        <div className="text-xs text-gray-500 uppercase">Total Assets</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-indigo-600">{totalAssigned}</div>
                        <div className="text-xs text-indigo-500 uppercase">Assigned</div>
                    </div>
                    <div>
                        <div className={`text-xl font-bold ${unassigned < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {unassigned}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Warehouse (Unassigned)</div>
                    </div>
                </div>

                {/* Assignment Form */}
                <div className="bg-gray-100 p-4 rounded-lg flex items-end gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Technician</label>
                        <select
                            value={selectedTech}
                            onChange={(e) => setSelectedTech(e.target.value)}
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm p-2"
                        >
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.name || "Unknown"}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                        <input
                            type="number"
                            min="1"
                            value={quantityToAdd}
                            onChange={(e) => setQuantityToAdd(Number(e.target.value))}
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm p-2"
                        />
                    </div>
                    <Button onClick={handleAssign} disabled={loading} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        Assign
                    </Button>
                </div>

                {/* Assignments List */}
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-4 py-2">Technician</th>
                                <th className="px-4 py-2 text-right">Possession</th>
                                <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {assignments.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                                        No items assigned to technicians.
                                    </td>
                                </tr>
                            ) : (
                                assignments.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                                                <UserIcon size={14} />
                                            </div>
                                            {item.user?.name || "Unknown"}
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold">
                                            {item.quantity} {product.unit}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                onClick={() => handleRemove(item.userId, item.quantity)}
                                                className="text-red-500 hover:text-red-700 text-xs underline"
                                            >
                                                Return All
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}
