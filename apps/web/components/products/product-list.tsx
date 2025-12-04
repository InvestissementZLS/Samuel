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
        return productDivision === division;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Inventory ({filteredProducts.length})</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleAdd}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                        + Add Product
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-500">
                                    {/* @ts-ignore */}
                                    {product.division === "EXTERMINATION" ? "EXO" : "ENT"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.name}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {product.description || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {product.unit}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${product.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {/* @ts-ignore */}
                                    ${(product.cost || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                    {product.stock}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(product)}
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
                                    No products found.
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
            />
        </div>
    );
}
