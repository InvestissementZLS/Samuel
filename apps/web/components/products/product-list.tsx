"use client";

import { useState } from "react";
import { Product } from "@prisma/client";
import { ProductDialog } from "./product-dialog";
import { Pencil, Filter } from "lucide-react";

interface ProductListProps {
    products: Product[];
}

import { useDivision } from "@/components/providers/division-provider";

export function ProductList({ products }: ProductListProps) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { division } = useDivision();

    const [activeTab, setActiveTab] = useState<'INVENTORY' | 'EQUIPMENT' | 'SERVICES'>('INVENTORY');

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
                        {activeTab === 'INVENTORY' ? 'Consumables' : activeTab === 'EQUIPMENT' ? 'Equipment & Tools' : 'Service Templates'}
                    </h2>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg inline-block">
                        <button
                            onClick={() => setActiveTab('INVENTORY')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'INVENTORY'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Inventory
                        </button>
                        <button
                            onClick={() => setActiveTab('EQUIPMENT')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'EQUIPMENT'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Equipment
                        </button>
                        <button
                            onClick={() => setActiveTab('SERVICES')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'SERVICES'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Services
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAdd}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                        + Add {activeTab === 'INVENTORY' ? 'Consumable' : activeTab === 'EQUIPMENT' ? 'Equipment' : 'Service'}
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            {activeTab !== 'SERVICES' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                            {activeTab !== 'SERVICES' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            )}
                            {activeTab === 'SERVICES' && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                            )}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                                    No items found.
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
        </div>
    );
}
