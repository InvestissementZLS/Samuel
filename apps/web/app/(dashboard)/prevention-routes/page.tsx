import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { PreventionRoutesView } from "@/components/prevention/prevention-routes-view";
import {
  isExteriorPreventionProduct,
  getSecteurFromPostalCode,
  SECTEUR_SORT_ORDER,
  PreventionClient,
  SecteurGroup,
} from "@/lib/constants/prevention-product-keywords";

export const metadata = {
  title: "Routes Prévention Extérieure | ZLS",
  description: "Planification des routes de prévention extérieure par secteur géographique",
};

async function getPreventionData(): Promise<{
  secteurs: SecteurGroup[];
  totalClients: number;
  totalRenewalsDue: number;
  allTechnicians: { id: string; name: string }[];
}> {
  // Charger tous les jobs EXTERMINATION avec produits de prévention extérieure
  const preventionJobs = await prisma.job.findMany({
    where: {
      division: "EXTERMINATION",
      isDeleted: false,
      products: {
        some: {
          product: {
            OR: [
              { name: { contains: "Arrosage Extérieur", mode: "insensitive" } },
              { name: { contains: "Plan Annuel", mode: "insensitive" } },
              { name: { contains: "Prévention Extérieure", mode: "insensitive" } },
              { name: { contains: "Traitement Extérieur", mode: "insensitive" } },
            ],
          },
        },
      },
    },
    include: {
      property: {
        include: { client: true },
      },
      products: {
        include: {
          product: { select: { id: true, name: true, type: true } },
        },
      },
      technicians: {
        select: { id: true, name: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Grouper par propriété — garder le job le plus récent + compter les visites
  const latestByProperty = new Map<string, (typeof preventionJobs)[0]>();
  const visitCountByProperty = new Map<string, number>();

  for (const job of preventionJobs) {
    const key = job.propertyId;
    visitCountByProperty.set(key, (visitCountByProperty.get(key) ?? 0) + 1);
    const existing = latestByProperty.get(key);
    
    if (!existing) {
      latestByProperty.set(key, job);
    } else {
      const isExistingPending = existing.status === 'PENDING';
      const isJobPending = job.status === 'PENDING';
      
      if (isJobPending && !isExistingPending) {
          latestByProperty.set(key, job);
      } else if (isJobPending && isExistingPending) {
          if (job.scheduledAt < existing.scheduledAt) {
              latestByProperty.set(key, job);
          }
      } else if (!isJobPending && !isExistingPending) {
          if (job.scheduledAt > existing.scheduledAt) {
              latestByProperty.set(key, job);
          }
      }
    }
  }

  const preventionClients: PreventionClient[] = [];

  for (const [propertyId, latestJob] of latestByProperty.entries()) {
    const property = latestJob.property;
    const client = property?.client;
    if (!property || !client || client.isDeleted || property.isDeleted) continue;

    const visitCount = visitCountByProperty.get(propertyId) ?? 1;
    const guaranteeYear = visitCount;
    const isWarrantyActive = guaranteeYear >= 2;

    // Garantie expire au début de la prochaine saison (1er Mai de l'année suivante)
    const warrantyExpiresAt = latestJob.scheduledAt
      ? new Date(new Date(latestJob.scheduledAt).getFullYear() + 1, 4, 1) // 4 = index mois pour Mai
      : null;

    const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const isRenewalDue = warrantyExpiresAt !== null && warrantyExpiresAt <= sixtyDaysFromNow;
    const isExpired = warrantyExpiresAt !== null && warrantyExpiresAt < new Date();

    const productNames = latestJob.products.map((p) => p.product.name);
    const isAnnualPlan = productNames.some((n) => n.toLowerCase().includes("plan annuel"));
    const serviceType: PreventionClient["serviceType"] = isAnnualPlan ? "PLAN_ANNUEL" : "INCLUS_AUTRE_SERVICE";
    const serviceLabel = isAnnualPlan
      ? "Plan Annuel – Arrosage Extérieur"
      : productNames.find((n) => isExteriorPreventionProduct(n)) ?? "Prévention Extérieure";

    let statusLabel: PreventionClient["statusLabel"];
    if (isExpired && isWarrantyActive) {
      statusLabel = "RENOUVELLEMENT_DU";
    } else if (isRenewalDue && isWarrantyActive) {
      statusLabel = "RENOUVELLEMENT_DU";
    } else if (isWarrantyActive) {
      statusLabel = "GARANTIE_ACTIVE";
    } else {
      statusLabel = "PREMIERE_ANNEE";
    }

    const secteur = getSecteurFromPostalCode(property.postalCode ?? undefined);

    preventionClients.push({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      propertyId: property.id,
      propertyAddress: property.address,
      city: property.city,
      postalCode: property.postalCode,
      latitude: property.latitude,
      longitude: property.longitude,
      secteur,
      guaranteeYear,
      warrantyExpiresAt,
      contractRenewedAt: latestJob.scheduledAt,
      isWarrantyActive,
      lastVisitDate: latestJob.scheduledAt,
      lastJobId: latestJob.id,
      serviceType,
      serviceLabel,
      statusLabel,
      technicianIds: latestJob.technicians.map((t) => t.id),
      technicianNames: latestJob.technicians.map((t) => t.name ?? "Sans nom"),
    });
  }

  // Grouper par secteur
  const secteurMap = new Map<string, PreventionClient[]>();
  for (const c of preventionClients) {
    const arr = secteurMap.get(c.secteur) ?? [];
    arr.push(c);
    secteurMap.set(c.secteur, arr);
  }

  const secteurGroups: SecteurGroup[] = [];
  for (const [secteur, clients] of secteurMap.entries()) {
    // Trier: renouvellements en premier, puis garantie active, puis 1ère année
    const priority: Record<string, number> = {
      RENOUVELLEMENT_DU: 0,
      EXPIRE: 1,
      GARANTIE_ACTIVE: 2,
      PREMIERE_ANNEE: 3,
    };
    clients.sort((a, b) => {
      const diff = (priority[a.statusLabel] ?? 4) - (priority[b.statusLabel] ?? 4);
      return diff !== 0 ? diff : a.clientName.localeCompare(b.clientName);
    });

    secteurGroups.push({
      secteur,
      clients,
      totalCount: clients.length,
      renewalDueCount: clients.filter((c) => c.statusLabel === "RENOUVELLEMENT_DU").length,
      warrantyActiveCount: clients.filter((c) => c.isWarrantyActive).length,
    });
  }

  // Trier les secteurs : d'abord par ordre géographique logique, puis par urgence
  secteurGroups.sort((a, b) => {
    const orderA = SECTEUR_SORT_ORDER[a.secteur] ?? 99;
    const orderB = SECTEUR_SORT_ORDER[b.secteur] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    // Même secteur → les plus urgents en premier
    if (b.renewalDueCount !== a.renewalDueCount) return b.renewalDueCount - a.renewalDueCount;
    return b.totalCount - a.totalCount;
  });

  // Obtenir tous les utilisateurs ADMIN ou TECHNICIAN du système
  const allUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "TECHNICIAN"] }, isActive: true },
    select: { id: true, name: true }
  });
  const allTechnicians = allUsers.map(u => ({ id: u.id, name: u.name ?? "Sans nom" }));

  return {
    secteurs: secteurGroups,
    totalClients: preventionClients.length,
    totalRenewalsDue: preventionClients.filter((c) => c.statusLabel === "RENOUVELLEMENT_DU").length,
    allTechnicians,
  };
}

export default async function PreventionRoutesPage() {
  const data = await getPreventionData();

  return (
    <PreventionRoutesView
      secteurs={data.secteurs}
      totalClients={data.totalClients}
      totalRenewalsDue={data.totalRenewalsDue}
      allTechnicians={data.allTechnicians}
    />
  );
}
