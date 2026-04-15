/**
 * PREVENTION EXTÉRIEURE — Mots-clés de produits
 *
 * Ces mots-clés identifient tous les services qui impliquent une visite de
 * prévention extérieure ZLS, peu importe dans quel forfait ils se trouvent.
 *
 * Produits confirmés en DB (EXTERMINATION):
 *   - "Arrosage Extérieur"
 *   - "Plan Annuel – Arrosage Extérieur"
 *
 * Pour ajouter un nouveau produit, ajoutez simplement son nom (ou partie du nom)
 * à la liste ci-dessous. La correspondance est insensible à la casse.
 */
export const PREVENTION_EXTERIEURE_KEYWORDS = [
  "Arrosage Extérieur",
  "Plan Annuel – Arrosage Extérieur",
  "Prévention Extérieure",
  "Traitement Extérieur",
] as const;

/**
 * Vérifie si un nom de produit correspond à une prévention extérieure.
 */
export function isExteriorPreventionProduct(productName: string): boolean {
  const lower = productName.toLowerCase();
  return PREVENTION_EXTERIEURE_KEYWORDS.some((keyword) =>
    lower.includes(keyword.toLowerCase())
  );
}

/**
 * Définitions des secteurs géographiques du Québec par préfixe de code postal.
 * Les códes postaux commencent par H = île de Montréal / région métropolitaine.
 *
 * Format : première lettre ou deux lettres du code postal → nom du secteur
 */
export const SECTEURS_GEOGRAPHIQUES: Record<string, string> = {
  // Laval
  H7: "Laval",
  // Montréal — Nord
  H1: "Montréal-Nord / Est",
  H2: "Montréal-Centre",
  H3: "Montréal-Ouest",
  H4: "Montréal-Sud-Ouest",
  H8: "Dollard-des-Ormeaux",
  H9: "Kirkland / Beaconsfield",
  // Rive-Sud
  J3: "Longueuil / Brossard",
  J4: "Rive-Sud Centre",
  J5: "Rive-Sud Est",
  // Laurentides
  J7: "Saint-Jérôme / Mirabel",
  J8: "Laurentides Nord",
  // Lanaudière
  J6: "Lanaudière Sud",
  // Montérégie
  J0: "Montérégie Rurale",
};

/**
 * Détermine le secteur géographique à partir d'un code postal canadien.
 * Ex: "H7P 2X4" → "Laval"
 */
export function getSecteurFromPostalCode(postalCode: string | null | undefined): string {
  if (!postalCode) return "Inconnu";
  const clean = postalCode.trim().toUpperCase().replace(/\s/g, "");
  // Essayer 2 lettres d'abord (H7), sinon 1 lettre
  const twoChar = clean.substring(0, 2);
  const oneChar = clean.substring(0, 1);
  return SECTEURS_GEOGRAPHIQUES[twoChar] ?? SECTEURS_GEOGRAPHIQUES[oneChar] ?? "Autre";
}

/**
 * Type représentant un client avec prévention extérieure due
 */
export interface PreventionClient {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  propertyId: string;
  propertyAddress: string;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  secteur: string;
  // Garantie
  guaranteeYear: number; // 1 = première année (pas de garantie), 2+ = garantie active
  warrantyExpiresAt: Date | null;
  contractRenewedAt: Date | null;
  isWarrantyActive: boolean;
  // Dernière visite
  lastVisitDate: Date | null;
  lastJobId: string | null;
  // Type de service
  serviceType: "PLAN_ANNUEL" | "INCLUS_AUTRE_SERVICE";
  serviceLabel: string;
  // Statut
  statusLabel: "GARANTIE_ACTIVE" | "RENOUVELLEMENT_DU" | "PREMIERE_ANNEE" | "EXPIRE";
  // Techniciens assignés (depuis le dernier job)
  technicianIds: string[];
  technicianNames: string[];
}

export interface SecteurGroup {
  secteur: string;
  clients: PreventionClient[];
  totalCount: number;
  renewalDueCount: number;
  warrantyActiveCount: number;
}
