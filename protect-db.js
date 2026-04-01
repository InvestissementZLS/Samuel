#!/usr/bin/env node
const { spawn } = require('child_process');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback if .env.local doesn't exist

const url = process.env.DATABASE_URL || '';
const isProd = url.includes('supabase') || url.includes('aws');

const args = process.argv.slice(2);
const commandStr = args.join(' ');

// The commands we want to block entirely if pointed to prod
const dangerousCommands = [
    'db push',
    'migrate reset',
    'migrate drop',
    'db execute'
];

const isDangerous = dangerousCommands.some(cmd => commandStr.includes(cmd));

if (isProd && isDangerous) {
    if (process.env.DB_OVERRIDE_CODE !== 'I_KNOW_I_AM_WIPING_PROD_54321') {
        console.error('\n' + '='.repeat(80));
        console.error('🚫🚫🚫 CATASTROPHIC DATA LOSS PREVENTION ENABLED 🚫🚫🚫');
        console.error('🚨 ALERT: You are attempting to run a DESTRUCTIVE Prisma command:');
        console.error(`> prisma ${commandStr}`);
        console.error('While connected to the PRODUCTION database (Supabase)!\n');
        console.error('Commands like `reset` or `push` are BLOCKED on production.');
        console.error('To proceed anyway (highly unsafe), run the command with DB_OVERRIDE_CODE=I_KNOW_I_AM_WIPING_PROD_54321.');
        console.error('='.repeat(80) + '\n');
        process.exit(1);
    } else {
        console.warn("\x1b[33m%s\x1b[0m", "⚠️ WARNING: Proceeding with dangerous Prisma command because override code was provided.");
    }
}

// Pass-through execution
const child = spawn('npx', ['prisma', ...args], { stdio: 'inherit', shell: true });
child.on('exit', code => process.exit(code ?? 0));
