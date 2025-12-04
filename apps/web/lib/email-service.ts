export async function sendEmail(to: string, subject: string, body: string) {
    // Mock email sending
    console.log("---------------------------------------------------");
    console.log(`[Mock Email Service] Sending email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:`);
    console.log(body);
    console.log("---------------------------------------------------");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
}
