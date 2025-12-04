'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function calculateJobCosts(jobId: string) {
    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                products: {
                    include: {
                        product: true
                    }
                },
                technicians: true,
                invoices: true,
            }
        });

        if (!job) throw new Error("Job not found");

        // 1. Calculate Material Cost
        const totalMaterialCost = job.products.reduce((sum, item) => {
            return sum + (item.quantity * (item.product.cost || 0));
        }, 0);

        // 2. Calculate Labor Cost
        let durationHours = 1; // Default
        if (job.completedAt && job.startedAt) {
            const diff = job.completedAt.getTime() - job.startedAt.getTime();
            durationHours = diff / (1000 * 60 * 60);
        } else if (job.scheduledEndAt && job.scheduledAt) {
            const diff = job.scheduledEndAt.getTime() - job.scheduledAt.getTime();
            durationHours = diff / (1000 * 60 * 60);
        }

        const hourlyRateSum = job.technicians.reduce((sum, tech) => {
            return sum + (tech.internalHourlyRate || 0);
        }, 0);

        const totalLaborCost = durationHours * hourlyRateSum;

        // 3. Other Costs (Placeholder for now)
        const otherDirectCosts = job.otherDirectCosts || 0;

        // 4. Total Cost
        const totalJobCost = totalMaterialCost + totalLaborCost + otherDirectCosts;

        // 5. Net Selling Price (Revenue)
        // Look for a non-cancelled invoice
        const invoice = job.invoices.find(i => i.status !== 'CANCELLED');
        const netSellingPrice = invoice ? invoice.total : 0; // Assuming invoice.total is HT? Prompt says "Facture HT". Usually total is with tax, but let's assume total for now or we need subtotal. 
        // Schema has 'tax' field, so 'total' might be inclusive. 
        // Let's assume 'total' - 'tax' if we want HT, or just 'total' if the user meant the final amount.
        // Prompt says "Prix de Vente Net (Facture HT)".
        // If Invoice model has 'total' and 'tax', then HT = total - tax.
        const revenue = invoice ? (invoice.total - (invoice.tax || 0)) : 0;

        // 6. Profit & Margin
        const totalProfit = revenue - totalJobCost;
        const grossMarginPercentage = revenue > 0 ? ((totalProfit / revenue) * 100) : 0;

        // Update Job
        await prisma.job.update({
            where: { id: jobId },
            data: {
                totalMaterialCost,
                totalLaborCost,
                totalJobCost,
                netSellingPrice: revenue,
                totalProfit,
                grossMarginPercentage
            }
        });

        revalidatePath(`/jobs/${jobId}`);
        revalidatePath('/jobs');

        return { success: true, message: "Costs calculated successfully" };

    } catch (error) {
        console.error("Error calculating costs:", error);
        return { success: false, message: "Failed to calculate costs" };
    }
}
