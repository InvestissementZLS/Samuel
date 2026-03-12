const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    console.log("Deleting associated dependencies (Transactions/Items) for pre-Mar 11 invoices...");
    await client.query(`
        DELETE FROM "Transaction" WHERE "invoiceId" IN (
            SELECT id FROM "Invoice" WHERE "updatedAt" < '2026-03-11 00:00:00'
        )
    `);
    
    await client.query(`
        DELETE FROM "InvoiceItem" WHERE "invoiceId" IN (
            SELECT id FROM "Invoice" WHERE "updatedAt" < '2026-03-11 00:00:00'
        )
    `);

    console.log("Deleting the fake invoices (updatedAt < Mar 11)...");
    const resDelete = await client.query(`
        DELETE FROM "Invoice" WHERE "updatedAt" < '2026-03-11 00:00:00'
    `);
    console.log(`Deleted ${resDelete.rowCount} fake invoices successfully!`);

    await client.end();
}

main().catch(console.error);
