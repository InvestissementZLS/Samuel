"use client";

import { useEffect, useState } from "react";
import { getInventory } from "@/app/actions/inventory-actions";
import { Hammer, Package } from "lucide-react";

interface TechnicianInventoryViewProps {
    technicianId: string;
}

export function TechnicianInventoryView({ technicianId }: TechnicianInventoryViewProps) {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const res = await getInventory(technicianId);
            if (res.success) setInventory(res.data || []);
            setLoading(false);
        };
        load();
    }, [technicianId]);

    if (loading) return <div className="p-4 text-center text-gray-500">Chargement de l'inventaire...</div>;
    if (inventory.length === 0) return <div className="p-4 text-center text-gray-400">Aucun inventaire assigné.</div>;

    const materials = inventory.filter(i => i.product.type === 'CONSUMABLE');
    const tools = inventory.filter(i => i.product.type === 'EQUIPMENT');

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            {/* Tools Section */}
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
                <div className="bg-[#2d2d2d] px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                    <Hammer className="text-orange-500 w-5 h-5" />
                    <h3 className="font-semibold text-white">Outils & Équipements</h3>
                    <span className="ml-auto bg-gray-700 text-xs px-2 py-1 rounded-full text-white">{tools.length}</span>
                </div>
                <div className="p-0">
                    {tools.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm italic">Aucun outil en possession.</div>
                    ) : (
                        <table className="w-full text-left bg-gray-900/50">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-2">Nom</th>
                                    <th className="px-4 py-2 text-right">Quantité</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {tools.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-800/30">
                                        <td className="px-4 py-3 text-sm text-gray-200">{item.product.name}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-white text-right">{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Materials Section */}
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
                <div className="bg-[#2d2d2d] px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                    <Package className="text-emerald-500 w-5 h-5" />
                    <h3 className="font-semibold text-white">Matériaux (Consommables)</h3>
                    <span className="ml-auto bg-gray-700 text-xs px-2 py-1 rounded-full text-white">{materials.length}</span>
                </div>
                <div className="p-0">
                    {materials.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm italic">Aucun matériel assigné.</div>
                    ) : (
                        <table className="w-full text-left bg-gray-900/50">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-2">Nom</th>
                                    <th className="px-4 py-2 text-right">Stock</th>
                                    <th className="px-4 py-2 text-right w-20">Unité</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {materials.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-800/30">
                                        <td className="px-4 py-3 text-sm text-gray-200">{item.product.name}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-white text-right">{item.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.product.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
