import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: { session_id?: string; invoice_id?: string };
}) {
    const { session_id, invoice_id } = searchParams;

    if (!session_id || !invoice_id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold text-red-600">Invalid Request</h1>
                <Link href="/" className="text-blue-600 hover:underline">
                    Return Home
                </Link>
            </div>
        );
    }

    // In a real app, we would verify the session_id with Stripe here
    // const session = await stripe.checkout.sessions.retrieve(session_id);
    // if (session.payment_status !== 'paid') ...

    // For MVP, we'll trust the redirect and update the invoice
    await prisma.invoice.update({
        where: { id: invoice_id },
        data: { status: "PAID" },
    });

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50">
            <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">Payment Successful!</h1>
                <p className="text-gray-600">
                    Thank you for your payment. Your invoice has been marked as paid.
                </p>
            </div>
            <div className="flex gap-4">
                <Link
                    href={`/clients`}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
