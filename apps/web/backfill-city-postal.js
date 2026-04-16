/**
 * Script de backfill : extrait city + postalCode depuis le champ address
 * Format attendu : "123 Rue XYZ, Ville, QC J7Y 4M3"
 *                  "123 Rue XYZ, Ville, QC"  (sans code postal)
 *
 * Usage : node backfill-city-postal.js
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Regex : capture Ville, Province, et optionnellement le code postal canadien
// Ex: "Boisbriand, QC J7G 2J1" → city=Boisbriand, postal=J7G 2J1
const ADDRESS_RE = /,\s*([^,]+),\s*(QC|Quebec|Québec)\s*([A-Z]\d[A-Z][\s-]?\d[A-Z]\d)?/i;

function parseAddress(address) {
  if (!address) return { city: null, postalCode: null };
  const match = address.match(ADDRESS_RE);
  if (!match) return { city: null, postalCode: null };
  const city = match[1]?.trim() || null;
  const postalCode = match[3]?.trim().toUpperCase().replace(/-/g, ' ') || null;
  return { city, postalCode };
}

async function main() {
  const properties = await p.property.findMany({
    select: { id: true, address: true },
  });

  console.log(`📍 ${properties.length} propriétés à traiter...`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Traiter par batch de 50
  const BATCH = 50;
  for (let i = 0; i < properties.length; i += BATCH) {
    const batch = properties.slice(i, i + BATCH);
    const ops = [];

    for (const prop of batch) {
      const { city, postalCode } = parseAddress(prop.address);
      if (!city && !postalCode) {
        skipped++;
        continue;
      }
      ops.push(
        p.property.update({
          where: { id: prop.id },
          data: {
            ...(city       ? { city }       : {}),
            ...(postalCode ? { postalCode } : {}),
          },
        })
      );
      updated++;
    }

    if (ops.length > 0) {
      await p.$transaction(ops);
    }

    process.stdout.write(`\r  Progression: ${Math.min(i + BATCH, properties.length)}/${properties.length}`);
  }

  console.log(`\n\n✅ Terminé!`);
  console.log(`  Mis à jour : ${updated}`);
  console.log(`  Ignorés    : ${skipped} (adresse non parseable)`);

  // Vérification finale
  const [withPostal, withCity] = await Promise.all([
    p.property.count({ where: { postalCode: { not: null } } }),
    p.property.count({ where: { city: { not: null } } }),
  ]);
  console.log(`\n📊 Résultat en DB:`);
  console.log(`  Propriétés avec code postal : ${withPostal}`);
  console.log(`  Propriétés avec ville       : ${withCity}`);

  await p.$disconnect();
}

main().catch(e => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
