import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/app/actions/user-actions";
import { redirect } from "next/navigation";
import { ContainerManager } from "@/components/inventory/container-manager";
import { PendingTransfersWidget } from "@/components/inventory/pending-transfers-widget";
import { Package, ShieldCheck, AlertTriangle, Warehouse } from "lucide-react";

export const metadata = {
  title: "Gestion du Stock | ZLS",
  description: "Suivi des contenants physiques et transferts entre techniciens",
};

async function getPageData(userId: string, isAdmin: boolean) {
  // Tous les produits CONSUMABLE de la division extermination
  const products = await prisma.product.findMany({
    where: {
      type:     "CONSUMABLE",
      division: "EXTERMINATION",
    },
    include: {
      containers: {
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
      },
    },
    orderBy: { name: "asc" },
  });

  // Transferts en attente pour cet utilisateur
  const pendingTransfers = await prisma.stockTransferRequest.findMany({
    where: {
      toUserId: isAdmin ? undefined : userId,
      status:   "PENDING",
      ...(isAdmin ? { toUserId: null } : {}), // admin voit les retours entrepôt
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

  // Techniciens actifs
  const technicians = await prisma.user.findMany({
    where: {
      role:     { in: ["ADMIN", "TECHNICIAN"] },
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { products, pendingTransfers, technicians };
}

export default async function StockPage() {
  const user = await getUserProfile();
  if (!user?.id) redirect("/login");

  const isAdmin = user.role === "ADMIN" || user.role === "OFFICE";
  const { products, pendingTransfers, technicians } = await getPageData(
    user.id,
    isAdmin
  );

  // Stats globales
  const allContainers = products.flatMap(p => p.containers);
  const warehouseTotal = allContainers.filter(c => !c.locationUser).length;
  const fieldTotal     = allContainers.filter(c =>  c.locationUser).length;
  const pendingCount   = allContainers.filter(c => c.transfers.some(t => t.status === "PENDING")).length;

  // Filtrer les produits qui ont au moins 1 contenant (ou montrer tous si admin)
  const visibleProducts = isAdmin
    ? products // Admin voit tous les produits pour pouvoir ajouter le premier stock
    : products.filter(p =>
        p.containers.some(c => c.locationUser?.id === user.id)
      );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
              </div>
              <p className="text-sm text-gray-500 ml-10">
                Suivi des contenants par technicien — transferts validés
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <div className="flex items-center justify-center gap-1">
                  <Warehouse className="h-4 w-4 text-blue-600" />
                  <span className="text-xl font-bold text-blue-700">{warehouseTotal}</span>
                </div>
                <div className="text-xs text-blue-600 font-medium">Entrepôt</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <div className="text-xl font-bold text-indigo-700">{fieldTotal}</div>
                <div className="text-xs text-indigo-600 font-medium">Sur le terrain</div>
              </div>
              {pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-xl font-bold text-amber-700">{pendingCount}</span>
                  </div>
                  <div className="text-xs text-amber-600 font-medium">En transit</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Pending transfers — toujours en haut */}
        {pendingTransfers.length > 0 && (
          <PendingTransfersWidget
            transfers={pendingTransfers as any}
            currentUserId={isAdmin ? null : user.id}
          />
        )}

        {/* Products with containers */}
        {visibleProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {isAdmin
                ? "Aucun contenant enregistré. Ajoutez du stock depuis cette page."
                : "Vous n'avez aucun contenant en votre possession."
              }
            </p>
          </div>
        ) : (
          visibleProducts.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Product header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{product.name}</h2>
                  <span className="text-xs text-gray-500">
                    Unité : <strong>{product.unit}</strong>
                    {product.containerSize && (
                      <> · Contenant : <strong>{product.containerSize} {product.unit}</strong></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                    {product.containers.length} contenant{product.containers.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <ContainerManager
                  product={product}
                  containers={product.containers as any}
                  technicians={technicians}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
