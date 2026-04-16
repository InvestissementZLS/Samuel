import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/app/actions/user-actions";
import { redirect } from "next/navigation";
import { AssetManager } from "@/components/equipment/asset-manager";
import { Crosshair } from "lucide-react";

export const metadata = {
  title: "Cages & Caméras | ZLS",
  description: "Suivi des cages et équipements de capture",
};

export default async function CagesPage() {
  const user = await getUserProfile();
  if (!user?.id) redirect("/login");

  const isAdmin = user.role === "ADMIN" || user.role === "OFFICE";

  // Get data for extermination division
  const DIVISION = "EXTERMINATION";

  const [assets, products, users, clients] = await Promise.all([
    prisma.equipmentAsset.findMany({
      where: { product: { division: DIVISION, isClientDeployable: true } },
      include: {
        product: { select: { name: true, id: true } },
        locationUser: { select: { id: true, name: true } },
        locationClient: { select: { id: true, name: true, properties: { select: { address: true, city: true }, take: 1 } } }
      },
      orderBy: [ { product: { name: 'asc' } }, { assetTag: 'asc' } ]
    }),
    prisma.product.findMany({
      where: { type: "EQUIPMENT", division: DIVISION, isClientDeployable: true },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.client.findMany({
      where: { isDeleted: false, divisions: { has: DIVISION } },
      select: { id: true, name: true, properties: { select: { city: true }, take: 1 } },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <Crosshair className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cages & Caméras (Capture)</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            Système de suivi 100% fiable des équipements déployés chez les clients.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <AssetManager 
          assets={assets} 
          products={products} 
          users={users} 
          clients={clients} 
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
