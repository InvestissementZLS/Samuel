"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Send,
  RotateCcw,
  Trash2,
  RefreshCw,
  Warehouse,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  addStockContainers,
  requestContainerTransfer,
  cancelTransferRequest,
  returnContainerToWarehouse,
} from "@/app/actions/stock-container-actions";
import { formatQuantity, isMeasurableUnit } from "@/lib/constants/stock-units";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Container {
  id: string;
  quantity: number;
  maxQuantity: number | null;
  status: "FULL" | "PARTIAL" | "EMPTY";
  notes: string | null;
  updatedAt: Date;
  locationUser: { id: string; name: string | null } | null;
  transfers: Array<{
    id: string;
    status: string;
    quantitySent: number;
    toUser: { id: string; name: string | null } | null;
    fromUser: { id: string; name: string | null } | null;
  }>;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  containerSize: number | null;
}

interface Technician {
  id: string;
  name: string | null;
}

interface ContainerManagerProps {
  product: Product;
  containers: Container[];
  technicians: Technician[];
  currentUserId: string | null; // null = admin/entrepôt
  isAdmin: boolean;
}

const STATUS_CONFIG = {
  FULL:    { label: "Plein",    bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  PARTIAL: { label: "Partiel",  bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
  EMPTY:   { label: "Vide",     bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400"    },
};

function ContainerCard({
  container,
  product,
  technicians,
  currentUserId,
  isAdmin,
  onAction,
}: {
  container: Container;
  product: Product;
  technicians: Technician[];
  currentUserId: string | null;
  isAdmin: boolean;
  onAction: () => void;
}) {
  const router = useRouter();
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferQty, setTransferQty] = useState(String(container.quantity));
  const [returnQty, setReturnQty] = useState(String(container.quantity));
  const [showReturn, setShowReturn] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusCfg = STATUS_CONFIG[container.status];
  const measurable = isMeasurableUnit(product.unit);
  const isOwner = container.locationUser?.id === currentUserId;
  const isWarehouse = !container.locationUser;
  const hasPendingTransfer = container.transfers.some(t => t.status === "PENDING");

  const pct = container.maxQuantity
    ? Math.round((container.quantity / container.maxQuantity) * 100)
    : null;

  const handleTransfer = async () => {
    if (!transferTo) { toast.error("Sélectionnez un destinataire."); return; }
    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantité invalide."); return; }
    setLoading(true);
    try {
      await requestContainerTransfer(container.id, currentUserId, transferTo || null, qty);
      toast.success("Demande de transfert envoyée — en attente de confirmation.");
      setShowTransfer(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleReturn = async () => {
    const qty = parseFloat(returnQty);
    if (isNaN(qty) || qty < 0) { toast.error("Quantité invalide."); return; }
    if (!currentUserId) return;
    setLoading(true);
    try {
      await returnContainerToWarehouse(container.id, currentUserId, qty);
      toast.success("Demande de retour envoyée — en attente de confirmation entrepôt.");
      setShowReturn(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleCancel = async (transferId: string) => {
    setLoading(true);
    try {
      await cancelTransferRequest(transferId, currentUserId);
      toast.success("Demande annulée.");
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
      hasPendingTransfer ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </span>
          {hasPendingTransfer && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              ⏳ Transfert en attente
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-bold text-gray-900">
            {formatQuantity(container.quantity, product.unit)}
          </span>
          {container.maxQuantity && (
            <span className="text-xs text-gray-400 ml-1">/ {container.maxQuantity} {product.unit}</span>
          )}
        </div>
      </div>

      {/* Progress bar (for measurable units) */}
      {pct !== null && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
          <div
            className={`h-1.5 rounded-full transition-all ${
              pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        {isWarehouse
          ? <><Warehouse className="h-3.5 w-3.5 text-blue-500" /><span className="text-blue-600 font-medium">Entrepôt</span></>
          : <><User className="h-3.5 w-3.5 text-gray-400" /><span>{container.locationUser?.name ?? "Inconnu"}</span></>
        }
        <span className="text-gray-300">·</span>
        <span>Mis à jour {format(new Date(container.updatedAt), "d MMM", { locale: fr })}</span>
      </div>

      {/* Pending transfers */}
      {hasPendingTransfer && container.transfers.filter(t => t.status === "PENDING").map(t => (
        <div key={t.id} className="bg-amber-50 rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-amber-800">
            En attente : <strong>{formatQuantity(t.quantitySent, product.unit)}</strong> → {t.toUser?.name ?? "Entrepôt"}
          </span>
          {(isOwner || isAdmin) && (
            <button
              onClick={() => handleCancel(t.id)}
              disabled={loading}
              className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Annuler
            </button>
          )}
        </div>
      ))}

      {/* Actions */}
      {!hasPendingTransfer && (isOwner || (isWarehouse && isAdmin)) && container.status !== "EMPTY" && (
        <div className="flex gap-2 mt-1">
          {/* Transfer */}
          <button
            onClick={() => { setShowTransfer(!showTransfer); setShowReturn(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium border transition-colors ${
              showTransfer
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-700"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            Transférer
            {showTransfer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Return to warehouse (only if held by technician) */}
          {isOwner && !isWarehouse && (
            <button
              onClick={() => { setShowReturn(!showReturn); setShowTransfer(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium border transition-colors ${
                showReturn
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retourner
              {showReturn ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      )}

      {/* Transfer form */}
      {showTransfer && (
        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
          <select
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            className="w-full text-sm border border-indigo-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">-- Destinataire --</option>
            {isWarehouse
              ? technicians.filter(t => t.id !== currentUserId).map(t => (
                  <option key={t.id} value={t.id}>{t.name ?? "Sans nom"}</option>
                ))
              : <>
                  <option value="">Entrepôt</option>
                  {technicians.filter(t => t.id !== currentUserId && t.id !== container.locationUser?.id).map(t => (
                    <option key={t.id} value={t.id}>{t.name ?? "Sans nom"}</option>
                  ))}
                </>
            }
          </select>
          {measurable && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                max={container.quantity}
                step="0.1"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-24 text-sm border border-indigo-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-sm text-gray-600">{product.unit}</span>
            </div>
          )}
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Envoyer la demande
          </button>
        </div>
      )}

      {/* Return form */}
      {showReturn && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-xs text-blue-800 font-medium">Quantité restante dans le contenant :</p>
          {measurable ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={container.quantity}
                step="0.1"
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                className="w-24 text-sm border border-blue-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-sm text-gray-600">{product.unit}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-600">Le contenant sera retourné tel quel.</p>
          )}
          <button
            onClick={handleReturn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Retourner à l'entrepôt
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────

export function ContainerManager({
  product,
  containers,
  technicians,
  currentUserId,
  isAdmin,
}: ContainerManagerProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCount, setAddCount] = useState(1);
  const [addQty, setAddQty] = useState(product.containerSize ? String(product.containerSize) : "1");
  const [adding, setAdding] = useState(false);

  const measurable = isMeasurableUnit(product.unit);

  const handleAdd = async () => {
    const qty = parseFloat(addQty);
    if (isNaN(qty) || qty <= 0) { toast.error("Quantité invalide."); return; }
    if (addCount < 1) { toast.error("Nombre de contenants invalide."); return; }
    setAdding(true);
    try {
      await addStockContainers(product.id, addCount, qty);
      toast.success(`✅ ${addCount} contenant${addCount > 1 ? "s" : ""} ajouté${addCount > 1 ? "s" : ""} à l'entrepôt.`);
      setShowAddForm(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const warehouseContainers = containers.filter(c => !c.locationUser);
  const techContainers = containers.filter(c => c.locationUser);

  return (
    <div className="space-y-4">
      {/* Header + Add button (admin only) */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{containers.length}</span> contenant{containers.length > 1 ? "s" : ""} total
            · <span className="text-blue-600">{warehouseContainers.length} en entrepôt</span>
            · <span className="text-indigo-600">{techContainers.length} chez techniciens</span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter du stock
          </button>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-900">Ajouter des contenants à l'entrepôt</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre de contenants</label>
              <input
                type="number"
                min="1"
                value={addCount}
                onChange={(e) => setAddCount(parseInt(e.target.value) || 1)}
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {measurable ? `Quantité par contenant (${product.unit})` : "Quantité"}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
            >
              {adding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Warehouse containers */}
      {warehouseContainers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Warehouse className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Entrepôt ({warehouseContainers.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {warehouseContainers.map(c => (
              <ContainerCard
                key={c.id}
                container={c}
                product={product}
                technicians={technicians}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onAction={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Technician containers */}
      {techContainers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Chez les techniciens ({techContainers.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {techContainers.map(c => (
              <ContainerCard
                key={c.id}
                container={c}
                product={product}
                technicians={technicians}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onAction={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {containers.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucun contenant enregistré pour ce produit.</p>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              + Ajouter du stock
            </button>
          )}
        </div>
      )}
    </div>
  );
}
