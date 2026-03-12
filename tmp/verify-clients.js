const { Client: PgClient } = require('pg');

async function main() {
    const client = new PgClient({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1",
    });

    try {
        await client.connect();
        console.log("Connected");

        // Get the latest client created
        const { rows: clientRows } = await client.query(`SELECT id, name, "billingAddress", "createdAt" FROM "Client" ORDER BY "createdAt" DESC LIMIT 3`);
        
        console.log("\nLatest Clients:");
        console.table(clientRows);

        if (clientRows.length > 0) {
            const { rows: propRows } = await client.query(`SELECT id, "clientId", address, street, city FROM "Property" WHERE "clientId" IN ($1, $2, $3)`, [clientRows[0].id, clientRows[1]?.id || clientRows[0].id, clientRows[2]?.id || clientRows[0].id]);
            console.log("\nAssociated Properties:");
            console.table(propRows);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
