"use client";

import { useState } from "react";
import { Product } from "@prisma/client";
import { StockManagerDialog } from "@/components/inventory/stock-manager-dialog";
import { Pencil, Filter, Users } from "lucide-react";
import { ProductDialog } from "./product-dialog";

interface ProductListProps {
    products: Product[];
}

import { useDivision } from "@/components/providers/division-provider";
import { useLanguage } from "@/components/providers/language-provider";

export function ProductList({ products }: ProductListProps) {
    const { t } = useLanguage();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Stock Manager State
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [productToManage, setProductToManage] = useState<Product | null>(null);

    const { division } = useDivision();

    const [activeTab, setActiveTab] = useState<'INVENTORY' | 'EQUIPMENT' | 'SERVICES'>('INVENTORY');

    const handleManageStock = (product: Product) => {
        setProductToManage(product);
        setIsStockDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedProduct(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsDialogOpen(true);
    };

    const filteredProducts = products.filter(product => {
        // @ts-ignore
        const productDivision = product.division || "EXTERMINATION";
        // @ts-ignore
        const productType = product.type || "CONSUMABLE";

        const matchesDivision = productDivision === division;
        const matchesTab = activeTab === 'INVENTORY'
            ? (productType === 'CONSUMABLE')
            : activeTab === 'EQUIPMENT'
                ? (productType === 'EQUIPMENT')
                : (productType === 'SERVICE');

        return matchesDivision && matchesTab;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {activeTab === 'INVENTORY' ? t.products.consumables : activeTab === 'EQUIPMENT' ? t.products.equipment : t.products.serviceTemplates}
                    </h2>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg inline-block">
                        <button
                            onClick={() => setActiveTab('INVENTORY')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'INVENTORY'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t.products.inventory}
                        </button>
                        <button
                            onClick={() => setActiveTab('EQUIPMENT')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'EQUIPMENT'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t.products.equipment}
                        </button>
                        <button
                            onClick={() => setActiveTab('SERVICES')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'SERVICES'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t.products.services}
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAdd}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                        + {activeTab === 'INVENTORY' ? t.products.addConsumable : activeTab === 'EQUIPMENT' ? t.products.addEquipment : t.products.addService}
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.division}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.name}</th>
                            {activeTab !== 'SERVICES' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.unit}</th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.price}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.cost}</th>
                            {activeTab !== 'SERVICES' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.stock}</th>
                            )}
                            {activeTab === 'SERVICES' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.products.duration}</th>
                            )}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                            <tr
                                key={product.id}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleEdit(product)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-500">
                                    {/* @ts-ignore */}
                                    {product.division === "EXTERMINATION" ? "EXO" : "ENT"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.name}
                                </td>
                                {activeTab !== 'SERVICES' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.unit}
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${product.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {/* @ts-ignore */}
                                    ${(product.cost || 0).toFixed(2)}
                                </td>
                                {activeTab !== 'SERVICES' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                        {product.stock}
                                    </td>
                                )}
                                {activeTab === 'SERVICES' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* @ts-ignore */}
                                        {product.durationMinutes || 60} min
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(product);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-900"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    {(activeTab === 'EQUIPMENT' || activeTab === 'INVENTORY') && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageStock(product);
                                            }}
                                            className="text-emerald-600 hover:text-emerald-900 ml-3"
                                            title={t.products.manageStock}
                                        >
                                            <Users className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                                    {t.products.noItems}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ProductDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                product={selectedProduct}
                fixedType={
                    activeTab === 'INVENTORY' ? 'CONSUMABLE' :
                        activeTab === 'EQUIPMENT' ? 'EQUIPMENT' :
                            'SERVICE'
                }
            />

            <StockManagerDialog
                isOpen={isStockDialogOpen}
                onClose={() => setIsStockDialogOpen(false)}
                product={productToManage}
            />
        </div>
    );
}

