const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();

    // Verify count before deletion using DATE()
    const resCount = await client.query('SELECT COUNT(*) FROM "Invoice" WHERE DATE("createdAt") = \'2026-03-09\'');
    console.log(`Found ${resCount.rows[0].count} duplicate invoices from March 9.`);

    if (parseInt(resCount.rows[0].count) > 0) {
        console.log("Deleting associated dependencies (Transactions/Items)...");
        await client.query(`
            DELETE FROM "Transaction" WHERE "invoiceId" IN (
                SELECT id FROM "Invoice" WHERE DATE("createdAt") = '2026-03-09'
            )
        `);
        
        await client.query(`
            DELETE FROM "InvoiceItem" WHERE "invoiceId" IN (
                SELECT id FROM "Invoice" WHERE DATE("createdAt") = '2026-03-09'
            )
        `);

        console.log("Deleting the March 9th invoices...");
        const resDelete = await client.query(`
            DELETE FROM "Invoice" WHERE DATE("createdAt") = '2026-03-09'
        `);
        console.log(`Deleted ${resDelete.rowCount} invoices successfully!`);
    }

    await client.end();
}

main().catch(console.error);
