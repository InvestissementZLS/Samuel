import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    // We don't throw an error here to prevent build failures during rapid dev
    // But it will fail if used without the key.
    console.warn("STRIPE_SECRET_KEY is missing from environment variables.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'mock_key_for_build', {
    apiVersion: '2024-04-10', // Use latest API version compatible with the package
    typescript: true,
});
