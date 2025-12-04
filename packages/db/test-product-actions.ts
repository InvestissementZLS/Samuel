import { createProduct, updateProduct, deleteProduct } from '../apps/web/app/actions/product-actions';
import { prisma } from '../apps/web/lib/prisma';

async function main() {
    console.log('Starting Product Management Test...');

    // 1. Create Product
    console.log('Creating product...');
    const productName = `Test Product ${Date.now()}`;
    await createProduct({
        name: productName,
        description: 'Test Description',
        unit: 'liters',
        stock: 10,
    });

    const createdProduct = await prisma.product.findFirst({
        where: { name: productName },
    });

    if (!createdProduct) {
        throw new Error('Product creation failed');
    }
    console.log('Product created:', createdProduct);

    // 2. Update Product
    console.log('Updating product...');
    await updateProduct(createdProduct.id, {
        stock: 20,
        unit: 'gallons',
    });

    const updatedProduct = await prisma.product.findUnique({
        where: { id: createdProduct.id },
    });

    if (updatedProduct?.stock !== 20 || updatedProduct?.unit !== 'gallons') {
        throw new Error('Product update failed');
    }
    console.log('Product updated:', updatedProduct);

    // 3. Delete Product
    console.log('Deleting product...');
    await deleteProduct(createdProduct.id);

    const deletedProduct = await prisma.product.findUnique({
        where: { id: createdProduct.id },
    });

    if (deletedProduct) {
        throw new Error('Product deletion failed');
    }
    console.log('Product deleted successfully');

    console.log('All Product Management tests passed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
