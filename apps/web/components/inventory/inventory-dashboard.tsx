'use client';

import { useState, useEffect } from 'react';
import { getInventory, getAudits, reconcileAudit, getAllProducts } from '@/app/actions/inventory-actions';
import { getTechnicians } from '@/app/actions/technician-actions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { StockTransferModal } from './stock-transfer-modal';

export function InventoryDashboard() {
    const [activeTab, setActiveTab] = useState<'WAREHOUSE' | 'TECHNICIANS' | 'AUDITS'>('WAREHOUSE');
    const [inventory, setInventory] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [audits, setAudits] = useState<any[]>([]);
    const [selectedTech, setSelectedTech] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab, selectedTech]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'WAREHOUSE') {
                const res = await getInventory(undefined); // Warehouse
                if (res.success) setInventory(res.data || []);
                const prods = await getAllProducts();
                setProducts(prods);
            } else if (activeTab === 'TECHNICIANS') {
                const techs = await getTechnicians();
                setTechnicians(techs);
                if (selectedTech) {
                    const res = await getInventory(selectedTech);
                    if (res.success) setInventory(res.data || []);
                } else {
                    setInventory([]);
                }
            } else if (activeTab === 'AUDITS') {
                const auditList = await getAudits();
                setAudits(auditList);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async (auditId: string, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this audit?`)) return;

        const res = await reconcileAudit(auditId, action);
        if (res.success) {
            toast.success(res.message);
            loadData();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Inventory Management</h1>
                <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Transfer Stock
                </button>
            </div>

            <div className="flex space-x-4 border-b">
                <button
                    className={`pb-2 px-4 ${activeTab === 'WAREHOUSE' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('WAREHOUSE')}
                >
                    Warehouse
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'TECHNICIANS' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('TECHNICIANS')}
                >
                    Technicians
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'AUDITS' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('AUDITS')}
                >
                    Audits & Discrepancies
                </button>
            </div>

            {loading && <div className="text-gray-500">Loading...</div>}

            {!loading && activeTab === 'WAREHOUSE' && (
                <div className="space-y-8">
                    {/* Consumables */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Consumables</h3>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse Stock</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {products.filter(p => p.type === 'CONSUMABLE').map((product) => {
                                        const item = inventory.find(i => i.productId === product.id);
                                        return (
                                            <tr key={product.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{item?.quantity || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Equipment */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Equipment (Tools & Machines)</h3>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {products.filter(p => p.type === 'EQUIPMENT').map((product) => {
                                        const item = inventory.find(i => i.productId === product.id);
                                        return (
                                            <tr key={product.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{item?.quantity || 0}</td>
                                            </tr>
                                        );
                                    })}
                                    {products.filter(p => p.type === 'EQUIPMENT').length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">No equipment defined.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {!loading && activeTab === 'TECHNICIANS' && (
                <div className="space-y-4">
                    <select
                        className="w-full md:w-64 rounded-md border p-2 text-gray-900"
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                    >
                        <option value="">Select Technician</option>
                        {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    {selectedTech && (
                        <div className="space-y-8">
                            {/* Consumables */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Consumables</h3>
                                <div className="bg-white rounded-lg shadow overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity On Hand</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {inventory.filter(i => i.product.type === 'CONSUMABLE').length > 0 ? (
                                                inventory.filter(i => i.product.type === 'CONSUMABLE').map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{item.quantity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">No consumables found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Equipment */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Equipment (Tools & Machines)</h3>
                                <div className="bg-white rounded-lg shadow overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity On Hand</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {inventory.filter(i => i.product.type === 'EQUIPMENT').length > 0 ? (
                                                inventory.filter(i => i.product.type === 'EQUIPMENT').map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{item.quantity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">No equipment found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!loading && activeTab === 'AUDITS' && (
                <div className="space-y-6">
                    {audits.map((audit) => (
                        <div key={audit.id} className="bg-white rounded-lg shadow p-4 border">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold">{audit.technician.name} - {format(new Date(audit.date), 'PPP')}</h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${audit.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                        audit.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {audit.status}
                                    </span>
                                </div>
                                {audit.status === 'PENDING' && (
                                    <div className="space-x-2">
                                        <button
                                            onClick={() => handleReconcile(audit.id, 'APPROVE')}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                        >
                                            Approve & Update Stock
                                        </button>
                                        <button
                                            onClick={() => handleReconcile(audit.id, 'REJECT')}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>

                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual (Counted)</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discrepancy</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {audit.items.map((item: any) => {
                                        const discrepancy = item.actualQuantity - item.expectedQuantity;
                                        return (
                                            <tr key={item.id} className={discrepancy !== 0 ? 'bg-red-50' : ''}>
                                                <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{item.expectedQuantity}</td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900">{item.actualQuantity}</td>
                                                <td className={`px-4 py-2 text-sm font-bold ${discrepancy < 0 ? 'text-red-600' : discrepancy > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    {audits.length === 0 && <div className="text-gray-500">No audits found.</div>}
                </div>
            )}

            <StockTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
}
