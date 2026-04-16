"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function batchAssignPreventionJobs(
  jobIds: string[],
  technicianId: string,
  targetDateStr: string
) {
  if (!jobIds || jobIds.length === 0) {
    throw new Error("Aucun client sélectionné.");
  }

  // Parse target date (expecting YYYY-MM-DD from the frontend)
  const targetDate = new Date(targetDateStr);
  // Optional: Set time to 8:00 AM by default for clarity
  targetDate.setHours(8, 0, 0, 0);

  try {
    const operations = jobIds.map((jobId) => {
      return prisma.job.update({
        where: { id: jobId },
        data: {
          scheduledAt: targetDate,
          status: "SCHEDULED", // It moves out of PENDING
          technicians: {
            // Disconnect all existing first if any, then connect the selected one
            // We can just push it by 'set' to override all
            set: [{ id: technicianId }]
          }
        }
      });
    });

    await prisma.$transaction(operations);

    // Revalidate paths that use job data
    revalidatePath("/prevention-routes");
    revalidatePath("/agenda");
    revalidatePath("/");

    return { success: true, count: jobIds.length };
  } catch (error: any) {
    console.error("Erreur lors de l'assignation de masse :", error);
    throw new Error(error.message || "Impossible d'assigner les routes.");
  }
}
