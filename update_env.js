const { execSync } = require('child_process');
const fs = require('fs');

const dbUrl = "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=20&connection_limit=1";
const directUrl = "postgresql://postgres.ixtzlngxowhoqtefchxs:ZLSEmpire247Level@aws-1-ca-central-1.pooler.supabase.com:5432/postgres";

fs.writeFileSync('val1.txt', dbUrl);
fs.writeFileSync('val2.txt', directUrl);

try {
    console.log(execSync('npx vercel env rm DATABASE_URL production --yes', {stdio: 'pipe'}).toString());
} catch(e) {}
try {
    console.log(execSync('npx vercel env rm DIRECT_URL production --yes', {stdio: 'pipe'}).toString());
} catch(e) {}

try {
    console.log(execSync('npx vercel env add DATABASE_URL production < val1.txt').toString());
    console.log(execSync('npx vercel env add DIRECT_URL production < val2.txt').toString());
} catch(e) {
    console.error(e.message);
    if (e.stderr) console.error(e.stderr.toString());
    if (e.stdout) console.log(e.stdout.toString());
}

fs.unlinkSync('val1.txt');
fs.unlinkSync('val2.txt');
console.log("Done.");
