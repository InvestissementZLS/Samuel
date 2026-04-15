import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import {
  isExteriorPreventionProduct,
  getSecteurFromPostalCode,
  PreventionClient,
  SecteurGroup,
} from "@/lib/constants/prevention-product-keywords";

/**
 * GET /api/prevention-routes
 *
 * Retourne tous les clients EXTERMINATION qui ont une prévention extérieure à faire,
 * regroupés par secteur géographique et triés par proximité.
 *
 * Query params:
 *   - secteur?: string   — filtrer par secteur (ex: "Laval")
 *   - all?: "true"       — inclure aussi les clients déjà visités cette saison
 */
export async function GET(request: NextRequest) {
  const currentUser = await validateAuth(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const secteurFilter = searchParams.get("secteur");

  try {
    // -------------------------------------------------------------------------
    // 1. Trouver TOUS les jobs EXTERMINATION complétés qui ont un produit de
    //    prévention extérieure — on s'en sert pour trouver les clients concernés
    // -------------------------------------------------------------------------
    const preventionJobs = await prisma.job.findMany({
      where: {
        division: "EXTERMINATION",
        isDeleted: false,
        products: {
          some: {
            product: {
              // Chercher dans les produits de prévention extérieure
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
          include: {
            client: true,
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        technicians: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    // -------------------------------------------------------------------------
    // 2. Grouper par propriété — garder uniquement le dernier job par propriété
    //    et calculer l'année de contrat (garantie)
    // -------------------------------------------------------------------------
    const latestByProperty = new Map<string, (typeof preventionJobs)[0]>();
    const visitCountByProperty = new Map<string, number>();

    // Compter les visites par propriété (pour calculer l'année de contrat)
    for (const job of preventionJobs) {
      const key = job.propertyId;
      const count = visitCountByProperty.get(key) ?? 0;
      visitCountByProperty.set(key, count + 1);

      // Garder seulement le job le plus récent
      const existing = latestByProperty.get(key);
      if (!existing || job.scheduledAt > existing.scheduledAt) {
        latestByProperty.set(key, job);
      }
    }

    // -------------------------------------------------------------------------
    // 3. Construire la liste des PreventionClient
    // -------------------------------------------------------------------------
    const currentYear = new Date().getFullYear();
    const preventionClients: PreventionClient[] = [];

    for (const [propertyId, latestJob] of latestByProperty.entries()) {
      const property = latestJob.property;
      const client = property.client;

      if (!property || !client) continue;
      if (client.isDeleted || property.isDeleted) continue;

      // Compter le nombre d'années de contrat
      const visitCount = visitCountByProperty.get(propertyId) ?? 1;
      const guaranteeYear = visitCount; // 1ère visite = AN1, etc.
      const isWarrantyActive = guaranteeYear >= 2;

      // La garantie expire au début de la prochaine saison (1er Mai de l'année suivante)
      const warrantyExpiresAt = latestJob.scheduledAt
        ? new Date(new Date(latestJob.scheduledAt).getFullYear() + 1, 4, 1) // 4 = index mois pour Mai
        : null;

      const isRenewalDue =
        warrantyExpiresAt !== null &&
        warrantyExpiresAt <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // dans les 60 prochains jours

      // Identifier le type de service
      const productNames = latestJob.products.map((p) => p.product.name);
      const isAnnualPlan = productNames.some((n) =>
        n.toLowerCase().includes("plan annuel")
      );
      const serviceType = isAnnualPlan ? "PLAN_ANNUEL" : "INCLUS_AUTRE_SERVICE";
      const serviceLabel = isAnnualPlan
        ? "Plan Annuel – Arrosage Extérieur"
        : productNames.find((n) => isExteriorPreventionProduct(n)) ?? "Prévention Extérieure";

      // Déterminer le statut de garantie
      let statusLabel: PreventionClient["statusLabel"];
      if (guaranteeYear === 1) {
        statusLabel = "PREMIERE_ANNEE";
      } else if (
        warrantyExpiresAt &&
        warrantyExpiresAt < new Date()
      ) {
        statusLabel = isRenewalDue ? "RENOUVELLEMENT_DU" : "EXPIRE";
      } else {
        statusLabel = isWarrantyActive ? "GARANTIE_ACTIVE" : "PREMIERE_ANNEE";
      }

      if (isRenewalDue && isWarrantyActive) statusLabel = "RENOUVELLEMENT_DU";

      const secteur = getSecteurFromPostalCode(property.postalCode ?? client.billingAddress);

      // Filtrer par secteur si demandé
      if (secteurFilter && secteur !== secteurFilter) continue;

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

    // -------------------------------------------------------------------------
    // 4. Grouper par secteur
    // -------------------------------------------------------------------------
    const secteurMap = new Map<string, PreventionClient[]>();
    for (const c of preventionClients) {
      const existing = secteurMap.get(c.secteur) ?? [];
      existing.push(c);
      secteurMap.set(c.secteur, existing);
    }

    const secteurGroups: SecteurGroup[] = [];
    for (const [secteur, clients] of secteurMap.entries()) {
      // Trier les clients: renouvellements dus en premier, puis par nom
      clients.sort((a, b) => {
        const priority: Record<string, number> = {
          RENOUVELLEMENT_DU: 0,
          EXPIRE: 1,
          GARANTIE_ACTIVE: 2,
          PREMIERE_ANNEE: 3,
        };
        const pa = priority[a.statusLabel] ?? 4;
        const pb = priority[b.statusLabel] ?? 4;
        if (pa !== pb) return pa - pb;
        return a.clientName.localeCompare(b.clientName);
      });

      secteurGroups.push({
        secteur,
        clients,
        totalCount: clients.length,
        renewalDueCount: clients.filter(
          (c) => c.statusLabel === "RENOUVELLEMENT_DU" || c.statusLabel === "EXPIRE"
        ).length,
        warrantyActiveCount: clients.filter((c) => c.isWarrantyActive).length,
      });
    }

    // Trier les secteurs: ceux avec des renouvellements en premier
    secteurGroups.sort((a, b) => {
      if (b.renewalDueCount !== a.renewalDueCount)
        return b.renewalDueCount - a.renewalDueCount;
      return b.totalCount - a.totalCount;
    });

    return NextResponse.json({
      secteurs: secteurGroups,
      totalClients: preventionClients.length,
      totalRenewalsDue: preventionClients.filter(
        (c) => c.statusLabel === "RENOUVELLEMENT_DU" || c.statusLabel === "EXPIRE"
      ).length,
    });
  } catch (error) {
    console.error("[GET /api/prevention-routes] error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
