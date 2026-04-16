"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AssetStatus } from "@prisma/client";
import { getUserProfile } from "@/app/actions/user-actions";

/** 
 * Vérifier l'utilisateur
 */
async function requireUser() {
  const user = await getUserProfile();
  if (!user?.id) throw new Error("Non autorisé. Veuillez vous connecter.");
  return user;
}

// ─────────────────────────────────────────────────────────────
// LECTURE
// ─────────────────────────────────────────────────────────────

/** Obtenir tous les équipements de type 'EQUIPMENT' (cages, pièges, etc) pour une division */
export async function getEquipmentProducts(division: "EXTERMINATION" | "ENTREPRISES" | "RENOVATION" = "EXTERMINATION") {
  return prisma.product.findMany({
    where: {
      type: "EQUIPMENT",
      division,
    },
    orderBy: { name: "asc" }
  });
}

/** Obtenir tous les actifs physiques (cages) avec leur localisation */
export async function getAllEquipmentAssets(division: string = "EXTERMINATION") {
  return prisma.equipmentAsset.findMany({
    where: {
      product: {
        division: division as any
      }
    },
    include: {
      product: { select: { name: true, id: true } },
      locationUser: { select: { id: true, name: true } },
      locationClient: { select: { id: true, name: true, properties: { select: { address: true, city: true }, take: 1 } } }
    },
    orderBy: [
      { product: { name: 'asc' } },
      { assetTag: 'asc' }
    ]
  });
}

/** Obtenir l'historique d'un actif (Log) */
export async function getEquipmentLog(assetId: string) {
  return prisma.equipmentLog.findMany({
    where: { assetId },
    include: {
      movedByUser: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

// ─────────────────────────────────────────────────────────────
// CRÉATION & MODIFICATION
// ─────────────────────────────────────────────────────────────

export async function createEquipmentAsset(data: {
  productId: string;
  assetTag: string;
  notes?: string;
}) {
  const user = await requireUser();

  // Vérifier si le tag existe déjà
  const existing = await prisma.equipmentAsset.findFirst({
    where: { assetTag: data.assetTag }
  });
  if (existing) throw new Error("Une cage ou un équipement avec ce numéro existe déjà.");

  const asset = await prisma.equipmentAsset.create({
    data: {
      productId: data.productId,
      assetTag: data.assetTag,
      notes: data.notes,
      status: "AVAILABLE",
      locationUserId: null, // Par défaut: Entrepôt
      locationClientId: null,
      history: {
        create: {
          movedByUserId: user.id,
          action: "Création de l'équipement",
          fromLocation: null,
          toLocation: "Entrepôt",
        }
      }
    }
  });

  revalidatePath("/cages");
  revalidatePath("/stock");
  return asset;
}

export async function updateEquipmentAssetLocation(
  assetId: string, 
  data: {
    locationUserId: string | null;   // Technicien
    locationClientId: string | null; // Chez un client
    status: AssetStatus;
    notes?: string;
  }
) {
  const user = await requireUser();

  // On veut enregistrer d'où il vient (historique)
  const currentAsset = await prisma.equipmentAsset.findUnique({
    where: { id: assetId },
    include: { locationUser: true, locationClient: true }
  });

  if (!currentAsset) throw new Error("Équipement introuvable.");

  // Générer le texte 'from' et 'to' pour l'audit log
  const fromText = currentAsset.locationClientId 
    ? `Client (${currentAsset.locationClient?.name})` 
    : currentAsset.locationUserId 
      ? `Technicien (${currentAsset.locationUser?.name})` 
      : "Entrepôt";

  // Pour le 'to', il faut aller chercher les noms si possible
  let toText = "Entrepôt";
  if (data.locationClientId) {
    const cli = await prisma.client.findUnique({ where: { id: data.locationClientId } });
    toText = `Client (${cli?.name})`;
  } else if (data.locationUserId) {
    const tech = await prisma.user.findUnique({ where: { id: data.locationUserId } });
    toText = `Technicien (${tech?.name})`;
  }

  // Déterminer l'action principale
  let actionText = "Déplacement";
  if (!currentAsset.locationClientId && data.locationClientId) actionText = "Déployé chez le client";
  else if (currentAsset.locationClientId && !data.locationClientId) actionText = "Récupéré du client";
  else if (!currentAsset.locationUserId && data.locationUserId) actionText = "Assigné au technicien";
  else if (currentAsset.locationUserId && !data.locationUserId && !data.locationClientId) actionText = "Retourné à l'entrepôt";
  if (data.status !== currentAsset.status) actionText += ` (Statut: ${data.status})`;

  const updated = await prisma.equipmentAsset.update({
    where: { id: assetId },
    data: {
      locationUserId: data.locationUserId,
      locationClientId: data.locationClientId,
      status: data.status,
      notes: data.notes !== undefined ? data.notes : currentAsset.notes,
      history: {
        create: {
          movedByUserId: user.id,
          action: actionText,
          fromLocation: fromText,
          toLocation: toText
        }
      }
    }
  });

  revalidatePath("/cages");
  revalidatePath("/stock");
  return updated;
}

export async function deleteEquipmentAsset(assetId: string) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "OFFICE") {
    throw new Error("Seul un administrateur peut supprimer un actif.");
  }
  
  await prisma.equipmentAsset.delete({
    where: { id: assetId }
  });

  revalidatePath("/cages");
}
