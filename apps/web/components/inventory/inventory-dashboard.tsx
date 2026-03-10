'use client';

import { useState, useEffect } from 'react';
import { getInventory, getAudits, reconcileAudit, getAllProducts } from '@/app/actions/inventory-actions';
import { getTechnicians } from '@/app/actions/technician-actions';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { StockTransferModal } from './stock-transfer-modal';
import { TechnicianInventoryView } from './technician-inventory-view';
import { useDivision } from '@/components/providers/division-provider';
import { useLanguage } from '@/components/providers/language-provider';
import { Package, Wrench, ClipboardList, Warehouse, Users, ArrowLeftRight } from 'lucide-react';

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                {icon}
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
            <p className="text-sm text-gray-400 max-w-xs">{description}</p>
        </div>
    );
}

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                </td>
            ))}
        </tr>
    );
}

export function InventoryDashboard() {
    const { division } = useDivision();
    const { t } = useLanguage();
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
    }, [activeTab, selectedTech, division]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'WAREHOUSE') {
                const res = await getInventory(undefined);
                if (res.success) setInventory(res.data || []);
                const prods = await getAllProducts();
                setProducts(prods);
            } else if (activeTab === 'TECHNICIANS') {
                const techs = await getTechnicians(division);
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
            toast.error(t.common.loading + ' Error');
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async (auditId: string, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`${action === 'APPROVE' ? t.inventory.confirmApprove : t.inventory.confirmReject}`)) return;
        const res = await reconcileAudit(auditId, action);
        if (res.success) {
            toast.success(res.message);
            loadData();
        } else {
            toast.error(res.message);
        }
    };

    const consumables = products.filter(p => p.type === 'CONSUMABLE' && p.division === division);
    const equipment = products.filter(p => p.type === 'EQUIPMENT' && p.division === division);

    const tabs = [
        { key: 'WAREHOUSE', label: t.inventory.warehouse, icon: <Warehouse className="w-4 h-4" /> },
        { key: 'TECHNICIANS', label: t.inventory.technicians, icon: <Users className="w-4 h-4" /> },
        { key: 'AUDITS', label: t.inventory.audits, icon: <ClipboardList className="w-4 h-4" /> },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t.inventory.title}</h1>
                <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    <ArrowLeftRight className="w-4 h-4" />
                    {t.inventory.transferStock}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium transition-colors ${activeTab === tab.key
                            ? 'border-b-2 border-indigo-600 text-indigo-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab(tab.key as any)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* WAREHOUSE TAB */}
            {activeTab === 'WAREHOUSE' && (
                <div className="space-y-8">
                    {/* Consumables */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-500" />
                            {t.products.consumables}
                        </h3>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.products.name}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.inventory.warehouseStock}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.products.unit}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
                                    ) : consumables.length === 0 ? (
                                        <tr>
                                            <td colSpan={3}>
                                                <EmptyState
                                                    icon={<Package className="w-8 h-8" />}
                                                    title={t.inventory.noConsumables}
                                                    description={t.inventory.noConsumablesDesc}
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        consumables.map((product) => {
                                            const item = inventory.find(i => i.productId === product.id);
                                            const qty = item?.quantity ?? 0;
                                            const isLow = qty === 0;
                                            return (
                                                <tr key={product.id} className={isLow ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {qty}
                                                            {isLow && <span className="ml-2 text-xs font-normal text-red-500 bg-red-100 px-1.5 py-0.5 rounded">{t.inventory.outOfStock}</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Equipment */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-purple-500" />
                            {t.products.equipment}
                        </h3>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.products.name}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.inventory.warehouseStock}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} cols={2} />)
                                    ) : equipment.length === 0 ? (
                                        <tr>
                                            <td colSpan={2}>
                                                <EmptyState
                                                    icon={<Wrench className="w-8 h-8" />}
                                                    title={t.inventory.noEquipment}
                                                    description={t.inventory.noEquipmentDesc}
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        equipment.map((product) => {
                                            const item = inventory.find(i => i.productId === product.id);
                                            const qty = item?.quantity ?? 0;
                                            const isLow = qty === 0;
                                            return (
                                                <tr key={product.id} className={isLow ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`text-sm font-bold ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                                                            {qty}
                                                            {isLow && <span className="ml-2 text-xs font-normal text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded">{t.inventory.outOfStock}</span>}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TECHNICIANS TAB */}
            {activeTab === 'TECHNICIANS' && (
                <div className="space-y-4">
                    <select
                        className="w-full md:w-64 rounded-lg border border-gray-200 p-2.5 bg-white text-gray-900 text-sm shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                    >
                        <option value="">{t.inventory.selectTech}</option>
                        {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    {selectedTech ? (
                        <TechnicianInventoryView technicianId={selectedTech} />
                    ) : technicians.length === 0 && !loading ? (
                        <EmptyState
                            icon={<Users className="w-8 h-8" />}
                            title={t.settings.noTechnicians}
                            description=""
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="p-6 bg-white border rounded-xl animate-pulse">
                                        <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
                                        <div className="h-3 w-24 bg-gray-100 rounded" />
                                    </div>
                                ))
                            ) : (
                                technicians.map(tech => (
                                    <button
                                        key={tech.id}
                                        onClick={() => setSelectedTech(tech.id)}
                                        className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-3">
                                            {tech.name.charAt(0).toUpperCase()}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">{tech.name}</h3>
                                        <p className="text-xs text-gray-400 mt-1">{t.inventory.clickToView}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* AUDITS TAB */}
            {activeTab === 'AUDITS' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
                                    <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
                                    <div className="h-24 bg-gray-100 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : audits.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList className="w-8 h-8" />}
                            title={t.inventory.noAudits}
                            description={t.inventory.noAuditsDesc}
                        />
                    ) : (
                        audits.map((audit) => (
                            <div key={audit.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900">{audit.technician.name} — {format(new Date(audit.date), 'PPP')}</h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${audit.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            audit.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                            {audit.status}
                                        </span>
                                    </div>
                                    {audit.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReconcile(audit.id, 'APPROVE')}
                                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                            >
                                                {t.inventory.approve}
                                            </button>
                                            <button
                                                onClick={() => handleReconcile(audit.id, 'REJECT')}
                                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                                            >
                                                {t.inventory.reject}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t.products.name}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t.inventory.expected}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t.inventory.actual}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t.inventory.discrepancy}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {audit.items.map((item: any) => {
                                            const discrepancy = item.actualQuantity - item.expectedQuantity;
                                            return (
                                                <tr key={item.id} className={discrepancy !== 0 ? 'bg-red-50/50' : ''}>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">{item.expectedQuantity}</td>
                                                    <td className="px-4 py-2 text-sm font-bold text-gray-900">{item.actualQuantity}</td>
                                                    <td className={`px-4 py-2 text-sm font-bold ${discrepancy < 0 ? 'text-red-600' : discrepancy > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))
                    )}
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
