"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe outside of component to avoid recreating it
// Replace with your actual Publishable Key from Stripe Dashboard
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string;
    amount: number;
    onSuccess: () => void;
}

function PaymentForm({ amount, onSuccess, onClose }: { amount: number, onSuccess: () => void, onClose: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is required for some payment methods (e.g. 3DS security)
                // For this MVP we might handle it inline if possible, or redirect back to invoice
                return_url: window.location.href,
            },
            redirect: "if_required", // Important: handling without redirect if 3DS not needed
        });

        if (error) {
            setMessage(error.message ?? "An unexpected error occurred.");
            toast.error(error.message);
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
            toast.success("Payment successful!");
            onSuccess();
        } else {
            setMessage("Unexpected state.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {message && <div className="text-red-500 text-sm mt-2">{message}</div>}
            <div className="mt-4 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancel
                </button>
                <button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isLoading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
                </button>
            </div>
        </form>
    );
}

export function PaymentModal({ isOpen, onClose, invoiceId, amount, onSuccess }: PaymentModalProps) {
    const [clientSecret, setClientSecret] = useState("");

    useEffect(() => {
        if (isOpen && invoiceId) {
            // Fetch PaymentIntent
            fetch("/api/payments/create-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.clientSecret) {
                        setClientSecret(data.clientSecret);
                    } else {
                        console.error("Failed to load payment intent", data.error);
                        toast.error("Could not initialize payment system.");
                    }
                });
        }
    }, [isOpen, invoiceId]);

    const appearance = {
        theme: 'stripe' as const,
    };

    const options = {
        clientSecret,
        appearance,
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Secure Payment">
            {clientSecret ? (
                <Elements options={options} stripe={stripePromise}>
                    <PaymentForm amount={amount} onSuccess={onSuccess} onClose={onClose} />
                </Elements>
            ) : (
                <div className="p-4 text-center">Loading payment options...</div>
            )}
        </Modal>
    );
}
