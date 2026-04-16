"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ContainerStatus } from "@prisma/client";

// ─────────────────────────────────────────────────
// LECTURE
// ─────────────────────────────────────────────────

/** Tous les contenants d'un produit (entrepôt + techniciens) */
export async function getContainersByProduct(productId: string) {
  return prisma.stockContainer.findMany({
    where: { productId },
    include: {
      locationUser: { select: { id: true, name: true } },
      transfers: {
        where: { status: "PENDING" },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser:   { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Contenants d'un technicien spécifique */
export async function getContainersByUser(userId: string | null) {
  return prisma.stockContainer.findMany({
    where: { locationUserId: userId },
    include: {
      product: { select: { id: true, name: true, unit: true, containerSize: true } },
      transfers: {
        where: { status: "PENDING" },
      },
    },
    orderBy: [{ productId: "asc" }, { status: "asc" }],
  });
}

/** Transferts EN ATTENTE de confirmation pour un utilisateur (il doit valider) */
export async function getPendingTransfersForUser(userId: string) {
  return prisma.stockTransferRequest.findMany({
    where: {
      toUserId: userId,
      status:   "PENDING",
    },
    include: {
      container: {
        include: {
          product: { select: { id: true, name: true, unit: true, containerSize: true } },
        },
      },
      fromUser: { select: { id: true, name: true } },
    },
    orderBy: { requestedAt: "desc" },
  });
}

/** Transferts en attente pour l'entrepôt (toUserId = null) — pour admin */
export async function getPendingWarehouseTransfers() {
  return prisma.stockTransferRequest.findMany({
    where: { toUserId: null, status: "PENDING" },
    include: {
      container: {
        include: {
          product: { select: { id: true, name: true, unit: true, containerSize: true } },
        },
      },
      fromUser: { select: { id: true, name: true } },
    },
    orderBy: { requestedAt: "desc" },
  });
}

/** Résumé de stock par produit (pour le dashboard entrepôt) */
export async function getWarehouseStockSummary() {
  const containers = await prisma.stockContainer.findMany({
    where: { locationUserId: null },
    include: {
      product: { select: { id: true, name: true, unit: true, containerSize: true } },
    },
    orderBy: [{ productId: "asc" }],
  });

  // Grouper par produit
  const byProduct = new Map<string, typeof containers>();
  for (const c of containers) {
    const arr = byProduct.get(c.productId) ?? [];
    arr.push(c);
    byProduct.set(c.productId, arr);
  }

  return Array.from(byProduct.entries()).map(([productId, items]) => {
    const product = items[0].product;
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    return {
      productId,
      productName: product.name,
      unit: product.unit,
      containerSize: product.containerSize,
      totalQuantity: totalQty,
      containerCount: items.length,
      fullCount:    items.filter(i => i.status === "FULL").length,
      partialCount: items.filter(i => i.status === "PARTIAL").length,
      emptyCount:   items.filter(i => i.status === "EMPTY").length,
    };
  });
}

// ─────────────────────────────────────────────────
// AJOUT DE STOCK (entrepôt)
// ─────────────────────────────────────────────────

/**
 * Ajoute N contenants neufs (pleins) à l'entrepôt.
 * @param productId    ID du produit
 * @param count        Nombre de contenants à créer
 * @param quantityEach Quantité dans chaque contenant (ex: 400 pour 400ml)
 */
export async function addStockContainers(
  productId: string,
  count: number,
  quantityEach: number
) {
  if (count < 1 || quantityEach <= 0) throw new Error("Paramètres invalides.");

  await prisma.$transaction(
    Array.from({ length: count }, () =>
      prisma.stockContainer.create({
        data: {
          productId,
          quantity:    quantityEach,
          maxQuantity: quantityEach,
          status:      "FULL",
          locationUserId: null, // entrepôt
        },
      })
    )
  );

  revalidatePath("/inventory");
  revalidatePath("/stock");
}

// ─────────────────────────────────────────────────
// TRANSFERTS
// ─────────────────────────────────────────────────

/**
 * Demande de transfert d'un contenant vers un technicien (ou entrepôt).
 * Crée un StockTransferRequest PENDING — le récepteur doit confirmer.
 */
export async function requestContainerTransfer(
  containerId:   string,
  fromUserId:    string | null,  // null = entrepôt
  toUserId:      string | null,  // null = retour entrepôt
  quantitySent:  number,
  notes?:        string
) {
  // Vérifier que le contenant existe et appartient bien à fromUser
  const container = await prisma.stockContainer.findUnique({
    where: { id: containerId },
  });
  if (!container) throw new Error("Contenant introuvable.");
  if (container.locationUserId !== fromUserId)
    throw new Error("Ce contenant ne vous appartient pas.");
  if (quantitySent <= 0 || quantitySent > container.quantity)
    throw new Error(`Quantité invalide. Disponible: ${container.quantity}`);

  // Annuler les anciens transferts PENDING pour ce contenant
  await prisma.stockTransferRequest.updateMany({
    where: { containerId, status: "PENDING" },
    data:  { status: "CANCELLED" },
  });

  await prisma.stockTransferRequest.create({
    data: {
      containerId,
      fromUserId,
      toUserId,
      quantitySent,
      notes,
      status: "PENDING",
    },
  });

  revalidatePath("/inventory");
  revalidatePath("/stock");
}

/**
 * Le récepteur confirme la réception et saisit la quantité réelle reçue.
 * Met à jour le contenant + clôture la demande.
 */
export async function confirmTransfer(
  transferRequestId: string,
  receiverUserId:    string | null,  // null = admin/entrepôt
  quantityReceived:  number,
  responseNotes?:    string
) {
  const transfer = await prisma.stockTransferRequest.findUnique({
    where: { id: transferRequestId },
    include: { container: true },
  });
  if (!transfer) throw new Error("Demande de transfert introuvable.");
  if (transfer.status !== "PENDING") throw new Error("Cette demande n'est plus en attente.");

  // Vérifier que c'est bien le bon récepteur
  if (transfer.toUserId !== receiverUserId)
    throw new Error("Vous n'êtes pas le destinataire de ce transfert.");

  if (quantityReceived < 0) throw new Error("La quantité reçue ne peut pas être négative.");

  // Déterminer le nouveau statut du contenant
  const newStatus: ContainerStatus =
    quantityReceived <= 0
      ? "EMPTY"
      : transfer.container.maxQuantity && quantityReceived >= transfer.container.maxQuantity
      ? "FULL"
      : "PARTIAL";

  await prisma.$transaction([
    // Mettre à jour la demande
    prisma.stockTransferRequest.update({
      where: { id: transferRequestId },
      data: {
        status:           "CONFIRMED",
        quantityReceived,
        responseNotes,
        respondedAt:      new Date(),
      },
    }),
    // Déplacer le contenant
    prisma.stockContainer.update({
      where: { id: transfer.containerId },
      data: {
        locationUserId: transfer.toUserId,
        quantity:       quantityReceived,
        status:         newStatus,
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath("/stock");
}

/**
 * Le récepteur signale un désaccord sur la quantité — rejette le transfert.
 */
export async function rejectTransfer(
  transferRequestId: string,
  receiverUserId:    string | null,
  reason:            string
) {
  const transfer = await prisma.stockTransferRequest.findUnique({
    where: { id: transferRequestId },
  });
  if (!transfer) throw new Error("Demande introuvable.");
  if (transfer.status !== "PENDING") throw new Error("Cette demande n'est plus en attente.");
  if (transfer.toUserId !== receiverUserId) throw new Error("Non autorisé.");

  await prisma.stockTransferRequest.update({
    where: { id: transferRequestId },
    data: {
      status:        "REJECTED",
      responseNotes: reason,
      respondedAt:   new Date(),
    },
  });

  revalidatePath("/inventory");
  revalidatePath("/stock");
}

/**
 * L'expéditeur annule sa propre demande de transfert.
 */
export async function cancelTransferRequest(
  transferRequestId: string,
  senderUserId:      string | null
) {
  const transfer = await prisma.stockTransferRequest.findUnique({
    where: { id: transferRequestId },
  });
  if (!transfer) throw new Error("Demande introuvable.");
  if (transfer.fromUserId !== senderUserId) throw new Error("Non autorisé.");
  if (transfer.status !== "PENDING") throw new Error("La demande n'est plus en attente.");

  await prisma.stockTransferRequest.update({
    where: { id: transferRequestId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/inventory");
  revalidatePath("/stock");
}

/**
 * Retourner un contenant partiellement utilisé à l'entrepôt.
 * Raccourci qui crée directement la demande depuis un technicien → null (entrepôt).
 */
export async function returnContainerToWarehouse(
  containerId:    string,
  fromUserId:     string,
  remainingQty:   number,
  notes?:         string
) {
  return requestContainerTransfer(containerId, fromUserId, null, remainingQty, notes);
}
