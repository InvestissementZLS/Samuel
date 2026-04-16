"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MapPin, User, Warehouse, AlertTriangle, CheckCircle, RefreshCcw, Search, Plus, Map, History } from "lucide-react";

import { createEquipmentAsset, updateEquipmentAssetLocation, getEquipmentLog } from "@/app/actions/equipment-actions";

type Asset = any; // we'll use duck typing for simplicity based on the prisma query

interface AssetManagerProps {
  assets: Asset[];
  products: any[];
  users: any[];
  clients: any[];
  isAdmin: boolean;
  currentUserId: string;
}

export function AssetManager({ assets, products, users, clients, isAdmin, currentUserId }: AssetManagerProps) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState<"ALL"|"CLIENT"|"TECH"|"WAREHOUSE">("ALL");

  // Modals
  const [addingAsset, setAddingAsset] = useState(false);
  const [movingAsset, setMovingAsset] = useState<Asset | null>(null);
  const [viewingLog, setViewingLog] = useState<Asset | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Forms
  const [newAssetTag, setNewAssetTag] = useState("");
  const [newAssetProductId, setNewAssetProductId] = useState("");
  const [moveDestType, setMoveDestType] = useState<"WAREHOUSE"|"TECH"|"CLIENT">("WAREHOUSE");
  const [moveDestId, setMoveDestId] = useState("");
  const [loading, setLoading] = useState(false);

  // Computed
  const filteredAssets = assets.filter(a => {
    // text search
    if (search && !a.assetTag.toLowerCase().includes(search.toLowerCase()) && !a.product.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    // location filter
    if (filterLocation === "CLIENT" && !a.locationClientId) return false;
    if (filterLocation === "TECH" && !a.locationUserId) return false;
    if (filterLocation === "WAREHOUSE" && (a.locationClientId || a.locationUserId)) return false;
    
    return true;
  });

  const handleCreate = async () => {
    if (!newAssetTag || !newAssetProductId) return toast.error("Complétez tous les champs.");
    setLoading(true);
    try {
      await createEquipmentAsset({ productId: newAssetProductId, assetTag: newAssetTag });
      toast.success("Cage / Équipement ajouté !");
      setAddingAsset(false);
      setNewAssetTag("");
      router.refresh();
    } catch(e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleMove = async () => {
    if (!movingAsset) return;
    setLoading(true);
    try {
      let locationUserId = null;
      let locationClientId = null;
      let status = movingAsset.status;

      if (moveDestType === "TECH") {
        if(!moveDestId) throw new Error("Sélectionnez un technicien.");
        locationUserId = moveDestId;
        status = "AVAILABLE"; // Repasse en disponible dans le camion
      } else if (moveDestType === "CLIENT") {
        if(!moveDestId) throw new Error("Sélectionnez un client.");
        locationClientId = moveDestId;
        status = "DEPLOYED";
      } else {
        // Warehouse
        status = "AVAILABLE";
      }

      await updateEquipmentAssetLocation(movingAsset.id, {
        locationUserId,
        locationClientId,
        status
      });

      toast.success("Emplacement mis à jour.");
      setMovingAsset(null);
      router.refresh();
    } catch(e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const fetchLogs = async (asset: Asset) => {
    setViewingLog(asset);
    setLogs([]);
    try {
      const hist = await getEquipmentLog(asset.id);
      setLogs(hist);
    } catch (e) { toast.error("Erreur historique"); }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "AVAILABLE": return "bg-emerald-100 text-emerald-800";
      case "DEPLOYED": return "bg-amber-100 text-amber-800";
      case "MAINTENANCE": return "bg-orange-100 text-orange-800";
      case "LOST": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  const getStatusLabel = (status: string) => {
    switch(status) {
      case "AVAILABLE": return "Disponible";
      case "DEPLOYED": return "Déployé";
      case "MAINTENANCE": return "En Réparation";
      case "LOST": return "Perdu";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Chercher N°, modèle..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 border"
            />
          </div>
          <select 
            value={filterLocation} 
            onChange={e => setFilterLocation(e.target.value as any)}
            className="w-full sm:w-auto px-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 border"
          >
            <option value="ALL">📍 Tous les emplacements</option>
            <option value="CLIENT">🏠 Chez les clients</option>
            <option value="TECH">🚚 Dans les camions (Tech)</option>
            <option value="WAREHOUSE">🏢 À l'entrepôt</option>
          </select>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setAddingAsset(true)}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
          >
            <Plus className="h-4 w-4" /> Nouvelle Cage
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase">Total des cages</div>
          <div className="mt-1 text-2xl font-bold">{assets.length}</div>
        </div>
        <div className="bg-amber-50 border-amber-200 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-1 text-amber-700 text-xs font-semibold uppercase">
            <MapPin className="h-3.5 w-3.5" /> Chez clients
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900">
            {assets.filter(a => a.locationClientId).length}
          </div>
        </div>
        <div className="bg-indigo-50 border-indigo-200 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-1 text-indigo-700 text-xs font-semibold uppercase">
            <User className="h-3.5 w-3.5" /> Dans les camions
          </div>
          <div className="mt-1 text-2xl font-bold text-indigo-900">
            {assets.filter(a => a.locationUserId && !a.locationClientId).length}
          </div>
        </div>
        <div className="bg-emerald-50 border-emerald-200 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold uppercase">
            <Warehouse className="h-3.5 w-3.5" /> À l'entrepôt
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">
            {assets.filter(a => !a.locationUserId && !a.locationClientId).length}
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map(asset => {
          const isAtClient = !!asset.locationClientId;
          const isAtTech = !!asset.locationUserId && !isAtClient;
          const isWarehouse = !isAtClient && !isAtTech;
          
          return (
          <div key={asset.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col ${
            isAtClient ? "border-amber-200 ring-1 ring-amber-100" : 
            isAtTech ? "border-indigo-200" : "border-gray-200"
          }`}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  {asset.assetTag}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{asset.product.name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(asset.status)}`}>
                {getStatusLabel(asset.status)}
              </span>
            </div>

            <div className="p-4 flex-1">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-2 rounded-lg ${
                  isAtClient ? "bg-amber-100 text-amber-700" :
                  isAtTech ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {isAtClient ? <MapPin className="h-4 w-4" /> : isAtTech ? <User className="h-4 w-4" /> : <Warehouse className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Localisation actuelle</p>
                  
                  {isWarehouse && <p className="font-bold text-gray-800 mt-0.5">Entrepôt ZLS</p>}
                  
                  {isAtTech && (
                    <p className="font-bold text-indigo-900 mt-0.5">Camion — {asset.locationUser.name}</p>
                  )}
                  
                  {isAtClient && (
                    <>
                      <p className="font-bold text-amber-900 mt-0.5">{asset.locationClient.name}</p>
                      {asset.locationClient.properties?.[0] && (
                        <p className="text-sm text-gray-600 mt-0.5">{asset.locationClient.properties[0].address}, {asset.locationClient.properties[0].city}</p>
                      )}
                      <p className="text-xs text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> 
                        Déployé {formatDistanceToNow(new Date(asset.updatedAt), { addSuffix: true, locale: fr })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 flex gap-2 border-t border-gray-100">
              <button 
                onClick={() => setMovingAsset(asset)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCcw className="h-3 w-3" /> Déplacer
              </button>
              <button 
                onClick={() => fetchLogs(asset)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5"
              >
                <History className="h-3 w-3" /> Historique
              </button>
            </div>
          </div>
        )})}
        
        {filteredAssets.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            Aucun équipement trouvé avec ces filtres.
          </div>
        )}
      </div>

      {/* --- ADD MODAL --- */}
      {addingAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Nouvelle Cage / Équipement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Modèle d'équipement (Produit)</label>
                <select 
                  className="w-full border p-2 rounded-lg"
                  value={newAssetProductId} onChange={e => setNewAssetProductId(e.target.value)}
                >
                  <option value="">Sélectionnez le type...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Identifiant Unique (Tag)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg" 
                  placeholder="Ex: CAGE-RATON-003"
                  value={newAssetTag} onChange={e => setNewAssetTag(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Écrivez ce numéro sur la cage avec un marqueur pour ne pas la perdre.</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleCreate} disabled={loading} className="flex-1 bg-amber-600 text-white rounded-lg py-2 font-medium hover:bg-amber-700">Créer l'équipement</button>
              <button onClick={() => setAddingAsset(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 font-medium hover:bg-gray-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOVE MODAL --- */}
      {movingAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-indigo-600" />
              Déplacer: {movingAsset.assetTag}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{movingAsset.product.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Où envoyer cet équipement ?</label>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => {setMoveDestType("WAREHOUSE"); setMoveDestId("");}} className={`flex-1 py-1.5 text-xs rounded-md border font-medium ${moveDestType === "WAREHOUSE" ? "bg-amber-50 border-amber-600 text-amber-700" : "bg-white border-gray-200"}`}>🏢 Entrepôt</button>
                  <button onClick={() => {setMoveDestType("TECH"); setMoveDestId("");}} className={`flex-1 py-1.5 text-xs rounded-md border font-medium ${moveDestType === "TECH" ? "bg-indigo-50 border-indigo-600 text-indigo-700" : "bg-white border-gray-200"}`}>🚚 Technicien</button>
                  {movingAsset.product.isClientDeployable && (
                      <button onClick={() => {setMoveDestType("CLIENT"); setMoveDestId("");}} className={`flex-1 py-1.5 text-xs rounded-md border font-medium ${moveDestType === "CLIENT" ? "bg-emerald-50 border-emerald-600 text-emerald-700" : "bg-white border-gray-200"}`}>🏠 Client</button>
                  )}
                </div>
              </div>

              {moveDestType === "TECH" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Quel technicien ?</label>
                  <select className="w-full border p-2 rounded-lg" value={moveDestId} onChange={e => setMoveDestId(e.target.value)}>
                    <option value="">Sélectionnez...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              {moveDestType === "CLIENT" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Quel client ?</label>
                  <select className="w-full border p-2 rounded-lg" value={moveDestId} onChange={e => setMoveDestId(e.target.value)}>
                    <option value="">Rechercher un client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.properties?.[0] ? `(${c.properties[0].city})` : ''}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleMove} disabled={loading} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700">Enregistrer</button>
              <button onClick={() => setMovingAsset(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 font-medium hover:bg-gray-200">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* --- LOG MODAL --- */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-gray-500" />
              Journal d'audit : {viewingLog.assetTag}
            </h3>
            <p className="text-sm text-gray-500 mb-4 pb-4 border-b">Traçabilité 100% fiable de chaque mouvement.</p>

            <div className="overflow-y-auto flex-1 pr-2 space-y-4">
              {logs.length === 0 ? <p className="text-sm text-gray-500 text-center">Aucun historique disponible.</p> : null}
              {logs.map((log, i) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-gray-200 pb-2">
                  <div className="absolute w-3 h-3 bg-white border-2 border-amber-500 rounded-full -left-[7px] top-1"></div>
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-xs font-bold text-gray-800">{log.action}</span>
                    <span className="text-[10px] text-gray-400">{format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: fr })}</span>
                  </div>
                  {(log.fromLocation || log.toLocation) && (
                    <div className="text-xs text-gray-600 mb-1 bg-gray-50 p-1.5 rounded inline-block mt-1">
                      <span className="line-through text-gray-400">{log.fromLocation || 'Inconnu'}</span> 
                      <span className="mx-1 text-gray-400">→</span> 
                      <span className="font-semibold text-gray-700">{log.toLocation}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-1">Fait par: {log.movedByUser?.name}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 text-right">
              <button onClick={() => setViewingLog(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
