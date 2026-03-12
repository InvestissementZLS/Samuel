const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Query old duplicates (updatedAt is before today)
    const oldDups = await client.query(`
        SELECT COUNT(*) 
        FROM "Invoice" 
        WHERE "updatedAt" < '2026-03-11 00:00:00'
    `);
    
    // Query recently inserted correct invoices (updatedAt is today)
    const trueInvoices = await client.query(`
        SELECT COUNT(*) 
        FROM "Invoice" 
        WHERE "updatedAt" >= '2026-03-11 00:00:00'
    `);
    
    console.log(`Fake invoices (before Mar 11): ${oldDups.rows[0].count}`);
    console.log(`True newly imported invoices (Mar 11): ${trueInvoices.rows[0].count}`);

    await client.end();
}

main().catch(console.error);
