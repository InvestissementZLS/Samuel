const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    const res = await client.query('SELECT COUNT(*) FROM "Invoice"');
    console.log(`Total invoices in DB: ${res.rows[0].count}`);

    const resDates = await client.query('SELECT "createdAt" FROM "Invoice" ORDER BY "createdAt" ASC LIMIT 5');
    console.log(`Oldest invoices:`, resDates.rows);

    await client.end();
}

main().catch(console.error);
