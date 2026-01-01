'use client';

import { useEffect, useState } from 'react';
import { getTechnicianForecast, LowStockAlert } from '@/app/actions/smart-inventory-actions';
import { AlertTriangle, Package } from 'lucide-react';

interface InventoryForecastProps {
    userId: string;
}

export function InventoryForecast({ userId }: InventoryForecastProps) {
    const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getTechnicianForecast(userId, 7).then(res => {
            setAlerts(res);
            setLoading(false);
        });
    }, [userId]);

    if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded"></div>;
    if (alerts.length === 0) return null; // No alerts, don't clutter

    return (
        <div className="bg-white p-4 rounded-lg shadow border border-orange-100">
            <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5" />
                Smart Inventory Alert (Next 7 Days)
            </h3>
            <div className="space-y-3">
                {alerts.map((alert, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-orange-50 p-3 rounded border border-orange-200">
                        <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-orange-600" />
                            <div>
                                <div className="font-medium text-gray-900">{alert.materialName}</div>
                                <div className="text-xs text-orange-700">
                                    Have: {alert.currentStock} | Need: {alert.required}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-bold text-red-600">
                                -{alert.shortfall} {alert.unit}
                            </span>
                            <span className="text-[10px] uppercase text-gray-500 font-bold">Shortfall</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
