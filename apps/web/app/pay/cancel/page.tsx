import Link from "next/link";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage({
    searchParams,
}: {
    searchParams: { invoice_id?: string };
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50">
            <div className="flex flex-col items-center gap-2 text-center">
                <XCircle className="w-16 h-16 text-red-600" />
                <h1 className="text-3xl font-bold text-gray-900">Payment Cancelled</h1>
                <p className="text-gray-600">
                    You have cancelled the payment process. No charges were made.
                </p>
            </div>
            <div className="flex gap-4">
                <Link
                    href={`/clients`}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
