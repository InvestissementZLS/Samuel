"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { confirmTransfer, rejectTransfer } from "@/app/actions/stock-container-actions";
import { formatQuantity } from "@/lib/constants/stock-units";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingTransfer {
  id: string;
  quantitySent: number;
  notes: string | null;
  requestedAt: Date;
  container: {
    id: string;
    maxQuantity: number | null;
    product: {
      name: string;
      unit: string;
      containerSize: number | null;
    };
  };
  fromUser: { id: string; name: string | null } | null;
}

interface PendingTransfersWidgetProps {
  transfers: PendingTransfer[];
  currentUserId: string | null; // null = admin/entrepôt
}

export function PendingTransfersWidget({
  transfers,
  currentUserId,
}: PendingTransfersWidgetProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (transfers.length === 0) return null;

  const handleConfirm = async (transfer: PendingTransfer) => {
    const raw = qtyInput[transfer.id];
    const qty = raw !== undefined ? parseFloat(raw) : transfer.quantitySent;
    if (isNaN(qty) || qty < 0) {
      toast.error("Quantité invalide.");
      return;
    }
    setProcessingId(transfer.id);
    try {
      await confirmTransfer(transfer.id, currentUserId, qty);
      toast.success(`✅ Transfert confirmé — ${formatQuantity(qty, transfer.container.product.unit)} reçu(s)`);
      setConfirmingId(null);
      setQtyInput(prev => { const n = { ...prev }; delete n[transfer.id]; return n; });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (transfer: PendingTransfer) => {
    if (!rejectReason.trim()) {
      toast.error("Veuillez indiquer la raison du rejet.");
      return;
    }
    setProcessingId(transfer.id);
    try {
      await rejectTransfer(transfer.id, currentUserId, rejectReason);
      toast.success("Transfert rejeté.");
      setRejectingId(null);
      setRejectReason("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500 px-4 py-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-white" />
        <span className="text-white font-semibold text-sm">
          {transfers.length} transfert{transfers.length > 1 ? "s" : ""} en attente de confirmation
        </span>
      </div>

      <div className="divide-y divide-amber-200">
        {transfers.map((t) => {
          const product = t.container.product;
          const isConfirming = confirmingId === t.id;
          const isRejecting = rejectingId === t.id;
          const isProcessing = processingId === t.id;

          return (
            <div key={t.id} className="p-4 bg-white">
              {/* Transfer info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{product.name}</span>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      {formatQuantity(t.quantitySent, product.unit)} déclaré(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <span className="font-medium text-gray-700">{t.fromUser?.name ?? "Entrepôt"}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium text-gray-700">Vous</span>
                    <span className="text-gray-400">·</span>
                    <span>{format(new Date(t.requestedAt), "d MMM à HH:mm", { locale: fr })}</span>
                  </div>
                  {t.notes && (
                    <p className="text-xs text-gray-500 italic mt-1">"{t.notes}"</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!isConfirming && !isRejecting && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setConfirmingId(t.id);
                      setQtyInput(prev => ({ ...prev, [t.id]: String(t.quantitySent) }));
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmer la réception
                  </button>
                  <button
                    onClick={() => setRejectingId(t.id)}
                    className="flex items-center gap-1 text-xs px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Signaler un écart
                  </button>
                </div>
              )}

              {/* Confirm panel */}
              {isConfirming && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-emerald-800">
                    Confirmez la quantité réelle reçue :
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={qtyInput[t.id] ?? t.quantitySent}
                      onChange={(e) => setQtyInput(prev => ({ ...prev, [t.id]: e.target.value }))}
                      className="w-28 border border-emerald-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <span className="text-sm text-gray-600 font-medium">{product.unit}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(t)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Valider
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Reject panel */}
              {isRejecting && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-medium text-red-800">
                    Raison du rejet (désaccord sur la quantité, contenant endommagé, etc.) :
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ex: La bouteille contenait 150ml, pas 200ml..."
                    rows={2}
                    className="w-full border border-red-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(t)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Rejeter
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
