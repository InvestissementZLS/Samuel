/**
 * PREVENTION EXTÉRIEURE — Mots-clés de produits
 *
 * Ces mots-clés identifient tous les services qui impliquent une visite de
 * prévention extérieure ZLS, peu importe dans quel forfait ils se trouvent.
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
 * Carte géographique des secteurs ZLS — basée sur le FSA (3 premiers caractères
 * du code postal). La fonction essaie 3 chars, puis 2, puis 1 pour maximiser
 * la granularité.
 *
 * Territoires desservis :
 *   - Montréal + Laval (un seul secteur)
 *   - Rive-Sud
 *   - Basse Laurentides  (au sud de Saint-Jérôme)
 *   - Saint-Jérôme       (ville + environs immédiats)
 *   - Saint-Hippolyte    (secteur distinct)
 *   - Sainte-Agathe et alentours
 *   - Lanaudière
 */
export const SECTEURS_GEOGRAPHIQUES: Record<string, string> = {
  // ── Montréal & Laval ─────────────────────────────────────────
  // Tous les codes H = île de Montréal + Laval → 1 seul secteur
  H1: "Montréal / Laval",
  H2: "Montréal / Laval",
  H3: "Montréal / Laval",
  H4: "Montréal / Laval",
  H5: "Montréal / Laval",
  H6: "Montréal / Laval",
  H7: "Montréal / Laval", // Laval
  H8: "Montréal / Laval",
  H9: "Montréal / Laval",

  // ── Rive-Sud ─────────────────────────────────────────────────
  J3: "Rive-Sud",   // Longueuil, Brossard, Saint-Bruno
  J4: "Rive-Sud",   // Saint-Hubert, Greenfield Park
  J5: "Rive-Sud",   // Varennes, Contrecœur

  // ── Basse Laurentides (au sud de Saint-Jérôme) ───────────────
  J7A: "Basse Laurentides",   // Rosemère / Sainte-Thérèse
  J7B: "Basse Laurentides",   // Blainville
  J7C: "Basse Laurentides",   // Blainville / Sainte-Thérèse Ouest
  J7E: "Basse Laurentides",   // Deux-Montagnes
  J7G: "Basse Laurentides",   // Saint-Eustache
  J7H: "Basse Laurentides",   // Oka / Saint-Joseph-du-Lac
  J7J: "Basse Laurentides",   // Mirabel Sud
  J7K: "Basse Laurentides",   // Sainte-Anne-des-Plaines
  J7N: "Basse Laurentides",   // Bois-des-Filion / Lorraine

  // ── Saint-Jérôme ─────────────────────────────────────────────
  J7L: "Saint-Jérôme",   // Saint-Jérôme Centre
  J7M: "Saint-Jérôme",   // Saint-Jérôme
  J7P: "Saint-Jérôme",   // Saint-Jérôme / Mirabel Nord
  J7R: "Saint-Jérôme",   // Lachute / Argenteuil
  J7T: "Saint-Jérôme",   // Saint-Colomban / Sainte-Sophie
  J7Y: "Saint-Jérôme",   // Saint-Jérôme Est
  J7Z: "Saint-Jérôme",   // Saint-Jérôme Ouest/Sud

  // ── Saint-Hippolyte ──────────────────────────────────────────
  J8A: "Saint-Hippolyte", // Saint-Hippolyte, Saint-Colomban nord

  // ── Sainte-Agathe et alentours ───────────────────────────────
  J8B: "Sainte-Agathe et alentours",   // Sainte-Anne-des-Lacs
  J8C: "Sainte-Agathe et alentours",   // Sainte-Agathe-des-Monts
  J8R: "Sainte-Agathe et alentours",   // Val-David / Val-Morin
  J8E: "Sainte-Agathe et alentours",   // Mont-Tremblant / Saint-Jovite

  // ── Haute Laurentides / Nord ──────────────────────────────────
  J8G: "Haute Laurentides",   // Arundel / Mille-Isles
  J8L: "Haute Laurentides",   // Laurentides très nord
  J8M: "Haute Laurentides",
  J8N: "Haute Laurentides",   // Mont-Laurier area

  // ── Lanaudière ───────────────────────────────────────────────
  J6: "Lanaudière",       // Repentigny, L'Assomption, Joliette, etc.
  J0K: "Lanaudière",      // Lanaudière rural
  J5Y: "Lanaudière",
  J5Z: "Lanaudière",

  // ── Montérégie rurale ────────────────────────────────────────
  J0: "Montérégie Rurale",
};

/**
 * Détermine le secteur géographique à partir d'un code postal canadien.
 * Essaie d'abord les 3 premiers caractères (FSA complet), puis 2, puis 1.
 * Ex: "J8A 3B2" → "Saint-Hippolyte"
 *     "H7P 2X4" → "Montréal / Laval"
 */
export function getSecteurFromPostalCode(postalCode: string | null | undefined): string {
  if (!postalCode) return "Inconnu";
  const clean = postalCode.trim().toUpperCase().replace(/\s/g, "");
  if (clean.length < 2) return "Autre";
  const threeChar = clean.substring(0, 3); // J8A, J7L, H7P…
  const twoChar   = clean.substring(0, 2); // J3, J6, H7…
  const oneChar   = clean.substring(0, 1); // J, H…

  return (
    SECTEURS_GEOGRAPHIQUES[threeChar] ??
    SECTEURS_GEOGRAPHIQUES[twoChar]   ??
    SECTEURS_GEOGRAPHIQUES[oneChar]   ??
    "Autre"
  );
}

/**
 * Fallback : détermine le secteur à partir du nom de ville (insensible à la casse).
 * Utilisé quand le code postal est absent ou non reconnu.
 */
const CITY_TO_SECTEUR: Record<string, string> = {
  // Montréal / Laval
  "montréal": "Montréal / Laval",
  "montreal": "Montréal / Laval",
  "laval": "Montréal / Laval",
  "saint-léonard": "Montréal / Laval",
  "saint-laurent": "Montréal / Laval",
  "dollard-des-ormeaux": "Montréal / Laval",
  "pierrefonds": "Montréal / Laval",
  "kirkland": "Montréal / Laval",
  "beaconsfield": "Montréal / Laval",
  "pointe-claire": "Montréal / Laval",
  "lachine": "Montréal / Laval",
  "verdun": "Montréal / Laval",
  "lasalle": "Montréal / Laval",
  "ahuntsic": "Montréal / Laval",
  // Rive-Sud
  "longueuil": "Rive-Sud",
  "brossard": "Rive-Sud",
  "saint-bruno": "Rive-Sud",
  "saint-hubert": "Rive-Sud",
  "laprairie": "Rive-Sud",
  "boucherville": "Rive-Sud",
  "varennes": "Rive-Sud",
  // Basse Laurentides
  "blainville": "Basse Laurentides",
  "boisbriand": "Basse Laurentides",
  "rosemère": "Basse Laurentides",
  "rosemere": "Basse Laurentides",
  "sainte-thérèse": "Basse Laurentides",
  "sainte-therese": "Basse Laurentides",
  "deux-montagnes": "Basse Laurentides",
  "saint-eustache": "Basse Laurentides",
  "mirabel": "Basse Laurentides",
  "oka": "Basse Laurentides",
  "lorraine": "Basse Laurentides",
  "bois-des-filion": "Basse Laurentides",
  "sainte-anne-des-plaines": "Basse Laurentides",
  // Saint-Jérôme
  "saint-jérôme": "Saint-Jérôme",
  "saint-jerome": "Saint-Jérôme",
  "prévost": "Saint-Jérôme",
  "prevost": "Saint-Jérôme",
  "sainte-sophie": "Saint-Jérôme",
  "lachute": "Saint-Jérôme",
  // Saint-Hippolyte
  "saint-hippolyte": "Saint-Hippolyte",
  "saint-colomban": "Saint-Hippolyte",
  // Sainte-Agathe et alentours
  "sainte-agathe-des-monts": "Sainte-Agathe et alentours",
  "sainte-agathe": "Sainte-Agathe et alentours",
  "val-david": "Sainte-Agathe et alentours",
  "val-morin": "Sainte-Agathe et alentours",
  "sainte-anne-des-lacs": "Sainte-Agathe et alentours",
  "mont-tremblant": "Sainte-Agathe et alentours",
  // Lanaudière
  "repentigny": "Lanaudière",
  "terrebonne": "Lanaudière",
  "mascouche": "Lanaudière",
  "joliette": "Lanaudière",
  "l'assomption": "Lanaudière",
  "lassomption": "Lanaudière",
};

export function getSecteurFromCity(city: string | null | undefined): string {
  if (!city) return "Inconnu";
  const key = city.trim().toLowerCase();
  return CITY_TO_SECTEUR[key] ?? "Autre";
}

/**
 * Détermine le secteur en essayant d'abord le code postal, puis la ville.
 */
export function getSecteur(
  postalCode: string | null | undefined,
  city: string | null | undefined
): string {
  const fromPostal = getSecteurFromPostalCode(postalCode);
  if (fromPostal !== "Inconnu" && fromPostal !== "Autre") return fromPostal;
  return getSecteurFromCity(city);
}


/**
 * Ordre de tri des secteurs dans la sidebar (du plus proche au plus loin du depot).
 */
export const SECTEUR_SORT_ORDER: Record<string, number> = {
  "Montréal / Laval":             1,
  "Basse Laurentides":            2,
  "Saint-Jérôme":                 3,
  "Saint-Hippolyte":              4,
  "Sainte-Agathe et alentours":   5,
  "Haute Laurentides":            6,
  "Lanaudière":                   7,
  "Rive-Sud":                     8,
  "Montérégie Rurale":            9,
};

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
