import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { invoiceId } = await req.json();

        if (!invoiceId) {
            return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { client: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const amountRemaining = invoice.total - invoice.amountPaid;

        if (amountRemaining <= 0) {
            return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
        }

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amountRemaining * 100), // Stripe expects cents
            currency: "cad", // Assuming CAD based on user location (Quebec)
            metadata: {
                invoiceId: invoice.id,
                clientId: invoice.clientId,
                number: invoice.number || "unknown"
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error("Stripe Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
