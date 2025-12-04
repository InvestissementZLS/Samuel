'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createClient(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    await prisma.client.create({
        data: {
            name,
            email,
            phone,
            billingAddress: address,
            properties: {
                create: {
                    address: address, // Default property is same as billing for now
                    type: 'RESIDENTIAL',
                },
            },
        },
    });

    revalidatePath('/clients');
    redirect('/clients');
}

export async function getClients() {
    return await prisma.client.findMany({
        include: {
            properties: true,
        },
        orderBy: {
            name: 'asc',
        },
    });
}
