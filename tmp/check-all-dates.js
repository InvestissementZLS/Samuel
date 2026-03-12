const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Group invoices by date to see the distribution
    const res = await client.query('SELECT DATE("createdAt") as date, COUNT(*) FROM "Invoice" GROUP BY DATE("createdAt") ORDER BY COUNT(*) DESC LIMIT 10');
    
    console.log(`Top 10 Dates by Invoice Count:`);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
