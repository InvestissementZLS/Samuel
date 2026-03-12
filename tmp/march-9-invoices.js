const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Query invoices from March 9, 2026 or 2025 (depending on current year in system)
    // Actually, "March 9" might mean exactly "2026-03-09"
    const res = await client.query(`
        SELECT id, number, description, "createdAt", status 
        FROM "Invoice" 
        WHERE "createdAt" >= '2026-03-09 00:00:00' AND "createdAt" < '2026-03-10 00:00:00'
        LIMIT 5
    `);
    
    console.log(`Sample of March 9 Invoices:`);
    console.log(JSON.stringify(res.rows, null, 2));

    const totalMarch9 = await client.query(`
        SELECT COUNT(*) 
        FROM "Invoice" 
        WHERE "createdAt" >= '2026-03-09 00:00:00' AND "createdAt" < '2026-03-10 00:00:00'
    `);
    console.log(`Total March 9 Invoices: ${totalMarch9.rows[0].count}`);

    await client.end();
}

main().catch(console.error);
