/**
 * Script de setup Supabase Storage — Praxis ZLS
 * 
 * Crée les buckets nécessaires via l'API REST Supabase.
 * 
 * Usage:
 *   node setup-supabase-storage.mjs
 * 
 * Requis: SUPABASE_URL et SUPABASE_SERVICE_KEY dans l'environnement
 * Ou: modifiez les constantes directement ci-dessous.
 */

// ===========================
// 🔧 MODIFIER CES VALEURS
// ===========================
// Allez sur: https://supabase.com/dashboard/project/ixtzlngxowhoqtefchxs/settings/api
// Copiez la clé "service_role" (PAS la clé "anon") 
const SUPABASE_URL = 'https://hvdogvukekimeuazhczl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'COLLER_VOTRE_SERVICE_ROLE_KEY_ICI';
// ===========================

const BUCKETS = [
    {
        id: 'odometer-photos',
        name: 'odometer-photos',
        public: false,
        fileSizeLimit: 10485760, // 10 MB per photo
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    {
        id: 'job-photos',
        name: 'job-photos',
        public: false,
        fileSizeLimit: 10485760, // 10 MB per photo
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
];

async function createBucket(bucket) {
    const url = `${SUPABASE_URL}/storage/v1/bucket`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bucket),
    });

    const result = await response.json();

    if (response.ok) {
        console.log(`✅ Bucket "${bucket.id}" créé avec succès.`);
    } else if (result.error === 'Duplicate' || result.message?.includes('already exists')) {
        console.log(`ℹ️  Bucket "${bucket.id}" existe déjà — OK.`);
    } else {
        console.error(`❌ Erreur pour "${bucket.id}":`, result);
    }
}

async function main() {
    if (SUPABASE_SERVICE_KEY === 'COLLER_VOTRE_SERVICE_ROLE_KEY_ICI') {
        console.error('❌ ERREUR: Vous devez définir SUPABASE_SERVICE_KEY.');
        console.error('   Allez sur: https://supabase.com/dashboard/project/ixtzlngxowhoqtefchxs/settings/api');
        console.error('   Copiez la clé "service_role" et modifiez ce script ou définissez la variable d\'environnement.');
        process.exit(1);
    }

    console.log('🚀 Configuration Supabase Storage — Praxis ZLS');
    console.log(`   URL: ${SUPABASE_URL}\n`);

    for (const bucket of BUCKETS) {
        await createBucket(bucket);
    }

    console.log('\n🎉 Setup terminé!');
    console.log('📋 Prochaine étape: Ajouter SUPABASE_SERVICE_KEY dans:');
    console.log('   1. apps/web/.env (local dev)');
    console.log('   2. Vercel Dashboard → Project Settings → Environment Variables');
}

main().catch(console.error);
