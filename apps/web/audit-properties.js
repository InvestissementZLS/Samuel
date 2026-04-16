const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.property.findMany({
  select: { address: true, street: true, city: true, postalCode: true },
  take: 30,
}).then(props => {
  console.log('=== Exemples d\'adresses ===');
  props.forEach((p, i) => {
    console.log(`${i+1}. address: "${p.address}" | street: "${p.street}" | city: "${p.city}" | postal: "${p.postalCode}"`);
  });
  return p.$disconnect();
}).catch(e => {
  console.error('ERREUR:', e.message);
  process.exit(1);
});
