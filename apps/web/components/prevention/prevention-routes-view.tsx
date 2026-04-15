"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Route,
  ShieldCheck,
  AlertTriangle,
  Star,
  Phone,
  Navigation,
  Users,
  RefreshCw,
  Copy,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  UserCheck,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { PreventionClient, SecteurGroup } from "@/lib/constants/prevention-product-keywords";

// ---------------------------------------------------------------------------
// Helpers & Sub-components
// ---------------------------------------------------------------------------

function statusConfig(status: PreventionClient["statusLabel"]) {
  switch (status) {
    case "GARANTIE_ACTIVE":
      return {
        label: "Garantie active",
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
        icon: ShieldCheck,
      };
    case "RENOUVELLEMENT_DU":
      return {
        label: "Renouvellement dû",
        bg: "bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
        dot: "bg-amber-500",
        icon: AlertTriangle,
      };
    case "PREMIERE_ANNEE":
      return {
        label: "1ère année",
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-200",
        dot: "bg-blue-400",
        icon: Star,
      };
    case "EXPIRE":
      return {
        label: "Expiré",
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
        dot: "bg-red-500",
        icon: AlertTriangle,
      };
  }
}

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Nearest-neighbor TSP greedy pour ordonner les clients par proximité */
function optimizeClientRoute(clients: PreventionClient[]): PreventionClient[] {
  if (clients.length <= 1) return clients;

  // Sépare les clients avec/sans coordonnées GPS
  const withGps = clients.filter((c) => c.latitude && c.longitude);
  const withoutGps = clients.filter((c) => !c.latitude || !c.longitude);

  if (withGps.length === 0) return clients;

  const optimized: PreventionClient[] = [];
  const remaining = [...withGps];

  // Partir du premier client (le plus prioritaire — renouvellement)
  let current = remaining.shift()!;
  optimized.push(current);

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      if (!c.latitude || !c.longitude || !current.latitude || !current.longitude) continue;
      const dist = haversineKm(current.latitude, current.longitude, c.latitude, c.longitude);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    current = remaining.splice(nearestIdx, 1)[0];
    optimized.push(current);
  }

  // Ajouter les clients sans GPS à la fin
  return [...optimized, ...withoutGps];
}

// ---------------------------------------------------------------------------
// Client Row Card
// ---------------------------------------------------------------------------
function ClientCard({
  client,
  index,
  prevClient,
  showDistance,
}: {
  client: PreventionClient;
  index: number;
  prevClient?: PreventionClient;
  showDistance: boolean;
}) {
  const status = statusConfig(client.statusLabel);
  const StatusIcon = status.icon;

  const distanceKm =
    showDistance &&
    prevClient?.latitude &&
    prevClient?.longitude &&
    client.latitude &&
    client.longitude
      ? haversineKm(
          prevClient.latitude,
          prevClient.longitude,
          client.latitude,
          client.longitude
        ).toFixed(1)
      : null;

  const daysUntilExpiry = client.warrantyExpiresAt
    ? differenceInDays(new Date(client.warrantyExpiresAt), new Date())
    : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.propertyAddress)}`;

  return (
    <div
      className={`relative bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 ${status.border} border-l-4`}
    >
      {/* Number badge */}
      <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow">
        {index + 1}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + status */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 text-sm">{client.clientName}</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
            {client.guaranteeYear >= 2 && (
              <span className="text-xs text-gray-400 font-mono">AN{client.guaranteeYear}</span>
            )}
          </div>

          {/* Address */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors mb-1"
          >
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{client.propertyAddress}</span>
          </a>

          {/* Service label + techniciens */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
              {client.serviceLabel}
            </span>

            {client.technicianNames.length > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {client.technicianNames.join(", ")}
              </span>
            )}

            {daysUntilExpiry !== null && (
              <span
                className={`text-xs font-medium flex items-center gap-1 ${
                  daysUntilExpiry < 0
                    ? "text-red-600"
                    : daysUntilExpiry < 60
                    ? "text-amber-600"
                    : "text-gray-400"
                }`}
              >
                <Clock className="h-3 w-3" />
                {daysUntilExpiry < 0
                  ? `Expiré il y a ${Math.abs(daysUntilExpiry)}j`
                  : `Expire dans ${daysUntilExpiry}j`}
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {client.clientPhone && (
            <a
              href={`tel:${client.clientPhone}`}
              className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md font-medium transition-colors"
            >
              <Phone className="h-3 w-3" />
              Appeler
            </a>
          )}
          <Link
            href={`/clients/${client.clientId}`}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Voir fiche
          </Link>
          {distanceKm && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Navigation className="h-3 w-3" />
              {distanceKm} km
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sector Panel
// ---------------------------------------------------------------------------
function SecteurPanel({
  group,
  isSelected,
  onSelect,
}: {
  group: SecteurGroup;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const urgencyColor =
    group.renewalDueCount > 0
      ? "bg-amber-500"
      : group.warrantyActiveCount > 0
      ? "bg-emerald-500"
      : "bg-gray-400";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 ${
        isSelected
          ? "bg-gray-900 text-white border-gray-700 shadow-md"
          : "bg-white text-gray-800 border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${urgencyColor}`} />
          <span className="font-semibold text-sm">{group.secteur}</span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {group.totalCount}
        </span>
      </div>
      <div className="mt-1.5 flex gap-3 text-xs">
        {group.renewalDueCount > 0 && (
          <span className={isSelected ? "text-amber-300" : "text-amber-600"}>
            ⚠ {group.renewalDueCount} à renouveler
          </span>
        )}
        {group.warrantyActiveCount > 0 && (
          <span className={isSelected ? "text-emerald-300" : "text-emerald-600"}>
            ✓ {group.warrantyActiveCount} garantie
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
interface PreventionRoutesViewProps {
  secteurs: SecteurGroup[];
  totalClients: number;
  totalRenewalsDue: number;
  allTechnicians: { id: string; name: string }[];
}

export function PreventionRoutesView({
  secteurs,
  totalClients,
  totalRenewalsDue,
  allTechnicians,
}: PreventionRoutesViewProps) {
  const [selectedSecteur, setSelectedSecteur] = useState<string | null>(
    secteurs[0]?.secteur ?? null
  );
  const [isRouteOptimized, setIsRouteOptimized] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "RENOUVELLEMENT_DU" | "GARANTIE_ACTIVE" | "PREMIERE_ANNEE">("ALL");
  const [filterTechnicianId, setFilterTechnicianId] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  const activeGroup = useMemo(
    () => secteurs.find((s) => s.secteur === selectedSecteur),
    [secteurs, selectedSecteur]
  );

  const filteredClients = useMemo(() => {
    if (!activeGroup) return [];
    let base =
      filterStatus === "ALL"
        ? activeGroup.clients
        : activeGroup.clients.filter((c) => c.statusLabel === filterStatus);
    if (filterTechnicianId !== "ALL") {
      base = base.filter((c) => c.technicianIds.includes(filterTechnicianId));
    }
    return isRouteOptimized ? optimizeClientRoute(base) : base;
  }, [activeGroup, filterStatus, filterTechnicianId, isRouteOptimized]);

  const copyRouteList = useCallback(async () => {
    if (!filteredClients.length) return;
    const text = filteredClients
      .map(
        (c, i) =>
          `${i + 1}. ${c.clientName}\n   ${c.propertyAddress}\n   ${
            c.clientPhone ?? "Pas de téléphone"
          } — ${c.serviceLabel}`
      )
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [filteredClients]);

  const openAllInMaps = useCallback(() => {
    if (!filteredClients.length) return;
    const addresses = filteredClients
      .filter((c) => c.propertyAddress)
      .map((c) => encodeURIComponent(c.propertyAddress))
      .join("/");
    window.open(`https://www.google.com/maps/dir/${addresses}`, "_blank");
  }, [filteredClients]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Route className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Routes Prévention Extérieure
                </h1>
              </div>
              <p className="text-sm text-gray-500 ml-10">
                Tous les clients avec arrosage extérieur actif — Plan annuel ou inclus dans un autre service
              </p>
            </div>

            {/* Stats globales */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                <div className="text-2xl font-bold text-gray-900">{totalClients}</div>
                <div className="text-xs text-gray-500 font-medium">Clients</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                <div className="text-2xl font-bold text-amber-700">{totalRenewalsDue}</div>
                <div className="text-xs text-amber-600 font-medium">À renouveler</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                <div className="text-2xl font-bold text-blue-700">{secteurs.length}</div>
                <div className="text-xs text-blue-600 font-medium">Secteurs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {secteurs.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Route className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              Aucun client de prévention extérieure trouvé
            </h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Les clients apparaîtront ici dès qu'un job avec le service{" "}
              <strong>Arrosage Extérieur</strong> ou <strong>Plan Annuel – Arrosage Extérieur</strong>{" "}
              sera complété dans la division Extermination.
            </p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* ── Left: Secteur List ── */}
            <aside className="w-64 shrink-0 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Secteurs ({secteurs.length})
                </span>
              </div>
              {secteurs.map((group) => (
                <SecteurPanel
                  key={group.secteur}
                  group={group}
                  isSelected={group.secteur === selectedSecteur}
                  onSelect={() => {
                    setSelectedSecteur(group.secteur);
                    setIsRouteOptimized(false);
                    setFilterStatus("ALL");
                    setFilterTechnicianId("ALL");
                  }}
                />
              ))}
            </aside>

            {/* ── Right: Route Panel ── */}
            <main className="flex-1 min-w-0">
              {activeGroup ? (
                <>
                  {/* Toolbar */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3 flex-wrap shadow-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      <h2 className="font-bold text-gray-900">{activeGroup.secteur}</h2>
                      <span className="text-sm text-gray-400">
                        — {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Filtre technicien */}
                      {allTechnicians.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                          <select
                            id="filter-technician"
                            value={filterTechnicianId}
                            onChange={(e) => setFilterTechnicianId(e.target.value)}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          >
                            <option value="ALL">Tous les techniciens</option>
                            {allTechnicians.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Filtre statut */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        {(
                          [
                            ["ALL", "Tous"],
                            ["RENOUVELLEMENT_DU", "⚠ Renouvellement"],
                            ["GARANTIE_ACTIVE", "✓ Garantie"],
                            ["PREMIERE_ANNEE", "★ 1ère année"],
                          ] as const
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setFilterStatus(val)}
                            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                              filterStatus === val
                                ? "bg-white shadow text-gray-900"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Optimiser route */}
                      <button
                        onClick={() => setIsRouteOptimized(!isRouteOptimized)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${
                          isRouteOptimized
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:text-emerald-700"
                        }`}
                      >
                        <Route className="h-3.5 w-3.5" />
                        {isRouteOptimized ? "Route optimisée ✓" : "Optimiser route"}
                      </button>

                      {/* Ouvrir dans Maps */}
                      <button
                        onClick={openAllInMaps}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Google Maps
                      </button>

                      {/* Copier liste */}
                      <button
                        onClick={copyRouteList}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:border-gray-400 transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Copié!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copier liste
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Légende garantie */}
                  {isRouteOptimized && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-2 text-xs text-emerald-800">
                      <Route className="h-4 w-4 text-emerald-600" />
                      <strong>Route optimisée</strong> — Clients ordonnés par proximité géographique (algorithme TSP). Les distances indiquées sont à vol d'oiseau.
                    </div>
                  )}

                  {/* Client cards */}
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                      <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Aucun client pour ce filtre</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pl-4">
                      {filteredClients.map((client, i) => (
                        <ClientCard
                          key={client.propertyId}
                          client={client}
                          index={i}
                          prevClient={i > 0 ? filteredClients[i - 1] : undefined}
                          showDistance={isRouteOptimized}
                        />
                      ))}
                    </div>
                  )}

                  {/* Garantie info box */}
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Fonctionnement de la garantie
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-800">
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-bold text-blue-600 mb-1">⭐ AN1 — 1ère année</div>
                        <div>Pas de garantie encore. Première visite de prévention.</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-bold text-emerald-600 mb-1">✓ AN2+ — Garantie active</div>
                        <div>Tous les insectes extérieurs sont couverts tant que le contrat est signé.</div>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="font-bold text-amber-600 mb-1">⚠ Renouvellement dû</div>
                        <div>Contrat à renouveler dans moins de 60 jours pour maintenir la garantie.</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Sélectionnez un secteur</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
