import { prisma } from '@/lib/prisma';
import { ProductList } from '@/components/products/product-list';

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
                <p className="text-gray-500 mt-2">Manage your inventory, products, and services.</p>
            </div>

            <ProductList products={products} />
        </div>
    );
}
