/**
 * STOCK UNITS — Toutes les unités supportées pour les produits d'inventaire
 * Division : Extermination ZLS
 */

export const STOCK_UNITS = [
  // Liquides
  { value: "ml",        label: "Millilitres (ml)",    type: "liquid" as const },
  { value: "L",         label: "Litres (L)",           type: "liquid" as const },
  // Solides / poudres
  { value: "g",         label: "Grammes (g)",          type: "solid"  as const },
  { value: "kg",        label: "Kilogrammes (kg)",      type: "solid"  as const },
  { value: "granules",  label: "Granulés (g)",         type: "solid"  as const },
  // Contenants unitaires
  { value: "bloc",      label: "Bloc(s)",              type: "unit"   as const },
  { value: "canne",     label: "Canne(s)",             type: "unit"   as const },
  { value: "sachet",    label: "Sachet(s)",            type: "unit"   as const },
  { value: "tablette",  label: "Tablette(s)",          type: "unit"   as const },
  { value: "unité",     label: "Unité(s)",             type: "unit"   as const },
  { value: "boîte",     label: "Boîte(s)",             type: "unit"   as const },
] as const;

export type StockUnitValue = (typeof STOCK_UNITS)[number]["value"];

/**
 * Unités qui supportent les "contenants mesurables" (quantité partielle possible).
 * Ex: une bouteille de 400ml peut revenir avec 200ml → on suit le reste.
 */
export const MEASURABLE_UNITS: StockUnitValue[] = ["ml", "L", "g", "kg", "granules"];

/**
 * Détermine si une unité supporte le suivi de quantité partielle.
 */
export function isMeasurableUnit(unit: string): boolean {
  return MEASURABLE_UNITS.includes(unit as StockUnitValue);
}

/**
 * Formate une quantité avec son unité de façon lisible.
 * Ex: formatQuantity(850, "ml") → "850 ml"
 *     formatQuantity(1, "bloc") → "1 bloc"
 *     formatQuantity(3, "canne") → "3 cannes"
 */
export function formatQuantity(qty: number, unit: string): string {
  const rounded = Math.round(qty * 10) / 10;
  if (unit === "bloc" && qty > 1) return `${rounded} blocs`;
  if (unit === "canne" && qty > 1) return `${rounded} cannes`;
  if (unit === "sachet" && qty > 1) return `${rounded} sachets`;
  if (unit === "tablette" && qty > 1) return `${rounded} tablettes`;
  if (unit === "unité" && qty > 1) return `${rounded} unités`;
  if (unit === "boîte" && qty > 1) return `${rounded} boîtes`;
  return `${rounded} ${unit}`;
}

/**
 * Décompose une quantité totale en "X contenants pleins + Y restants".
 * Ex: 850ml / 400ml par bouteille → { full: 2, remainder: 50, unit: "ml" }
 */
export function breakdownByContainer(
  totalQty: number,
  containerSize: number | null | undefined,
  unit: string
): { full: number; remainder: number; label: string } {
  if (!containerSize || containerSize <= 0) {
    return { full: Math.floor(totalQty), remainder: 0, label: formatQuantity(totalQty, unit) };
  }
  const full = Math.floor(totalQty / containerSize);
  const remainder = Math.round((totalQty % containerSize) * 10) / 10;
  const parts: string[] = [];
  if (full > 0) parts.push(`${full} plein${full > 1 ? "s" : ""}`);
  if (remainder > 0) parts.push(`${remainder} ${unit} restant`);
  return { full, remainder, label: parts.join(" + ") || "0" };
}
