const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Query invoices, sorted by createdAt DESC
    const res = await client.query('SELECT number, "createdAt" FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 15');
    
    console.log(`Recent Invoices:`);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
