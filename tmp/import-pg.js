const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

function mapStatus(raw) {
    if (!raw) return "DRAFT";
    const s = raw.toLowerCase();
    if (s.includes("paid")) return "PAID";
    if (s.includes("sent")) return "SENT";
    if (s.includes("overdue")) return "OVERDUE";
    if (s.includes("partially")) return "PARTIALLY_PAID";
    if (s.includes("cancelled") || s.includes("void")) return "CANCELLED";
    return "DRAFT";
}

function parseDateStr(str) {
    if (!str) return new Date();
    const parts = str.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date();
}

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1"
    });
    
    await client.connect();
    console.log("Connected to DB.");

    const filePath = "c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/invoices_all.json";
    if (!fs.existsSync(filePath)) {
        console.error("JSON file not found at " + filePath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const rows = JSON.parse(rawData);

    console.log(`Loaded ${rows.length} invoices. Executing import...`);
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
        const invNumber = row["Invoice #"] ? row["Invoice #"].toString() : null;
        const clientName = row["Customer"];
        const dateStr = row["Date"];
        let totalVal = row["Total"] ? row["Total"].toString().replace(/[^0-9.-]+/g, "") : "0";
        if (!totalVal) totalVal = "0";
        const total = parseFloat(totalVal);
        const status = mapStatus(row["Status"]);

        if (!clientName || !invNumber) {
            skipped++;
            continue;
        }

        // 1. Find Client
        let res = await client.query('SELECT id FROM "Client" WHERE name = $1 LIMIT 1', [clientName]);
        let clientId;

        if (res.rows.length === 0) {
            // Create Client
            clientId = crypto.randomUUID();
            await client.query(
                `INSERT INTO "Client" (id, name, divisions, language, "updatedAt") VALUES ($1, $2, $3, $4, NOW())`,
                [clientId, clientName, '{EXTERMINATION}', 'FR']
            );
        } else {
            clientId = res.rows[0].id;
        }

        // 2. Check if Invoice exists
        let invRes = await client.query('SELECT id FROM "Invoice" WHERE number = $1 LIMIT 1', [invNumber]);
        if (invRes.rows.length > 0) {
            skipped++;
            continue;
        }

        const dateObj = parseDateStr(dateStr);
        const amountPaid = status === "PAID" ? total : 0;
        const invoiceId = crypto.randomUUID();

        // 3. Insert Invoice
        await client.query(
            `INSERT INTO "Invoice" 
            (id, number, "clientId", total, status, description, "createdAt", "issuedDate", "amountPaid", division, notes, "updatedAt") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
            [invoiceId, invNumber, clientId, total, status, row["Job"], dateObj, dateObj, amountPaid, 'EXTERMINATION', row["Invoice Tags"]]
        );
        
        added++;
        if (added % 100 === 0) console.log(`Imported ${added} invoices...`);
    }

    console.log(`\nImport complete! Added: ${added}, Skipped: ${skipped}`);
    await client.end();
}

main().catch(console.error);
