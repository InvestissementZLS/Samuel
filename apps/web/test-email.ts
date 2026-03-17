import { sendPortalAccessEmail } from './lib/email';
import { prisma } from './lib/prisma';
import { createBookingLink } from './app/actions/booking-actions';

// Suppress excessive prisma logs if any
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';

async function testFast() {
    try {
        console.log("Creating a temporary test client...");
        
        // Find existing or create dummy
        let client = await prisma.client.findFirst({
            where: { email: 'samuel.leveille.forex@gmail.com' }
        });

        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: "Samuel (Test)",
                    email: "samuel.leveille.forex@gmail.com",
                    phone: "555-555-5555",
                    language: "FR",
                    divisions: ["EXTERMINATION"]
                }
            });
            console.log("Created temporary client.");
        } else {
            console.log("Found existing client for that email.");
        }

        console.log(`Sending to: ${client.email}`);

        // Generate token
        const token = await createBookingLink(client.id);
        console.log(`Generated Token: ${token}`);

        console.log(`Calling sendPortalAccessEmail...`);
        const result = await sendPortalAccessEmail(client, token);
        
        console.log("--- RESEND API RESPONSE ---");
        console.log(JSON.stringify(result, null, 2));
        console.log("---------------------------");

    } catch (e) {
        console.error("Test failed with error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testFast();
