const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Query invoices from March 9th
    const res = await client.query('SELECT number, "jobId" FROM "Invoice" WHERE "createdAt" >= \'2026-03-09\' AND "createdAt" < \'2026-03-10\' LIMIT 5');
    
    console.log(`March 9th Invoices sample:`);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
