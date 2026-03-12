const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Query invoices with total 8623.13 to see if there are 2 versions of it
    const res = await client.query('SELECT number, "clientId", total, status, "createdAt" FROM "Invoice" WHERE total = 8623.13');
    
    console.log(`Invoices with total 8623.13:`);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
