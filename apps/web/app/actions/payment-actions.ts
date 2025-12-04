'use server';

import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Stripe with a secret key from env
// If not present, this will throw an error when called, which is expected until configured
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-11-17.clover', // Use latest API version
});

export async function createCheckoutSession(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                client: true,
            },
        });

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (invoice.items.length === 0) {
            throw new Error('Invoice has no items');
        }

        const headersList = await headers();
        const origin = headersList.get('origin') || 'http://localhost:3000';

        // Create line items for Stripe
        const lineItems = invoice.items.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.product.name,
                },
                unit_amount: Math.round(item.price * 100), // Stripe expects cents
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${origin}/pay/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice.id}`,
            cancel_url: `${origin}/pay/cancel?invoice_id=${invoice.id}`,
            customer_email: invoice.client.email || undefined,
            metadata: {
                invoiceId: invoice.id,
            },
        });

        return { url: session.url };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return { error: 'Failed to create checkout session. Make sure STRIPE_SECRET_KEY is set.' };
    }
}
