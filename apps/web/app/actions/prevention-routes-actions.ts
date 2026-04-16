"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Crée de NOUVEAUX jobs de prévention pour la saison en cours.
 * (Ne modifie pas les anciens jobs — ils restent comme historique.)
 *
 * @param jobIds       IDs des jobs de référence (pour récupérer propertyId + produits)
 * @param technicianId Technicien à assigner
 * @param targetDateStr Date visée (YYYY-MM-DD)
 */
export async function batchAssignPreventionJobs(
  jobIds: string[],
  technicianId: string,
  targetDateStr: string
) {
  if (!jobIds || jobIds.length === 0) {
    throw new Error("Aucun client sélectionné.");
  }

  // Parse target date — 8h00 par défaut
  const targetDate = new Date(targetDateStr);
  if (isNaN(targetDate.getTime())) throw new Error("Date invalide.");
  targetDate.setHours(8, 0, 0, 0);
  const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000); // +1h

  // Récupérer les jobs sources pour copier propertyId + produits
  const sourceJobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    include: {
      products: true,
    },
  });

  if (sourceJobs.length === 0) {
    throw new Error("Aucun job source trouvé.");
  }

  // Créer un nouveau job par client dans une transaction
  const created = await prisma.$transaction(
    sourceJobs.map((job) =>
      prisma.job.create({
        data: {
          propertyId:     job.propertyId,
          division:       job.division,
          scheduledAt:    targetDate,
          scheduledEndAt: endDate,
          status:         "SCHEDULED",
          description:    "Arrosage Extérieur — Route Prévention",
          technicians: {
            connect: [{ id: technicianId }],
          },
          products: {
            create: job.products.map((p) => ({
              productId: p.productId,
              quantity:  p.quantity,
              price:     p.price,
            })),
          },
        },
      })
    )
  );

  // Invalider les caches des pages concernées
  revalidatePath("/prevention-routes");
  revalidatePath("/agenda");
  revalidatePath("/schedule");
  revalidatePath("/calendar");
  revalidatePath("/");

  return { success: true, count: created.length };
}
