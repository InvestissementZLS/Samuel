'use server';

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { Client, Environment } from 'square';

// Initialize Square Client
// It uses sandbox by default if the token is missing or if we specify SANDBOX.
const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN || '';
const squareLocationId = process.env.SQUARE_LOCATION_ID || '';
const isProduction = process.env.SQUARE_ENVIRONMENT === 'production';

const squareClient = new Client({
    environment: isProduction ? Environment.Production : Environment.Sandbox,
    accessToken: squareAccessToken,
});

export async function createSquareCheckoutLink(invoiceId: string) {
    try {
        if (!squareAccessToken || !squareLocationId) {
            return { error: "Système de paiement (Square) non configuré. Veuillez contacter l'administrateur." };
        }

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
            return { error: 'Facture introuvable.' };
        }

        if (invoice.items.length === 0) {
            return { error: 'La facture ne contient aucun article.' };
        }

        const amountPaid = invoice.amountPaid || 0;
        const total = invoice.total;
        const balanceDue = total - amountPaid;

        if (balanceDue <= 0) {
            return { error: 'Cette facture est déjà payée.' };
        }

        const headersList = await headers();
        const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://praxiszls.com';

        // Create line items for Square
        // Since the invoice total already includes taxes, discounts, etc.,
        // we send a single line item for the exact balance due to avoid penny discrepancies.
        const lineItems = [{
            name: `Paiement Facture #${invoice.number || invoice.id.slice(0, 8)}`,
            quantity: '1',
            basePriceMoney: {
                amount: BigInt(Math.round(balanceDue * 100)), // Cents
                currency: 'CAD',
            },
        }];

        const response = await squareClient.checkoutApi.createPaymentLink({
            idempotencyKey: `${invoice.id}-${Date.now()}`, // Unique key for this attempt
            order: {
                locationId: squareLocationId,
                customerId: undefined, // Could map to Square customers if synchronized
                lineItems: lineItems,
                taxes: [], // Note: Since the invoice total already includes tax, we just send the basePrice Money including tax if we map exactly, or we use the Solde Restant approach. 
                           // Wait, if amountPaid == 0, the sum of lineItems might not equal invoice.total because of taxes.
                           // Best practice for invoice payments: just send one line item "Facture #X" with the exact total amount.
            },
            checkoutOptions: {
                redirectUrl: `${origin}/portal/${invoice.clientId}/invoice/${invoice.id}?success=true`, // We send them back to the invoice page
            },
            prePopulatedData: {
                buyerEmail: invoice.client.email || undefined,
            }
        });

        if (response.result && response.result.paymentLink && response.result.paymentLink.url) {
            return { url: response.result.paymentLink.url };
        } else {
            console.error('Square Error:', response.result.errors);
            return { error: 'Erreur lors de la création du lien de paiement.' };
        }
    } catch (error) {
        console.error('Error creating checkout link:', error);
        return { error: 'Impossible de se connecter au système de paiement.' };
    }
}
