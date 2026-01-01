import * as SQLite from 'expo-sqlite';

// Open the database (creates it if it doesn't exist)
const db = SQLite.openDatabaseSync('antigravity.db');

export const initDB = () => {
    return new Promise<void>((resolve, reject) => {
        try {
            db.execSync(`
            PRAGMA journal_mode = WAL;
            
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                scheduledAt TEXT,
                status TEXT,
                description TEXT,
                clientName TEXT,
                address TEXT,
                details_json TEXT, -- Full object for details view
                syncStatus TEXT DEFAULT 'SYNCED' -- SYNCED, DIRTY
            );

            CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT,
                method TEXT,
                body TEXT,
                createdAt TEXT
            );
        `);
            console.log('Database initialized successfully');
            resolve();
        } catch (e) {
            console.error('Database initialization failed', e);
            reject(e);
        }
    });
};

export const getDB = () => db;

// Data Access Helpers

export const saveJobsToLocal = (jobs: any[]) => {
    try {
        db.withTransactionSync(() => {
            // Clear old cache? Or just upsert?
            // For simplicity, let's clear and replace for the schedule list. 
            // BUT we must be careful not to delete DIRTY jobs if we were doing 2-way sync.
            // For now, simple cache: delete all and re-insert.
            db.execSync('DELETE FROM jobs WHERE syncStatus = "SYNCED"'); // Only replace synced jobs

            jobs.forEach(job => {
                db.runSync(
                    'INSERT OR REPLACE INTO jobs (id, scheduledAt, status, description, clientName, address, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        job.id,
                        job.scheduledAt,
                        job.status,
                        job.description,
                        job.property.client.name,
                        job.property.address,
                        JSON.stringify(job)
                    ]
                );
            });
        });
        console.log(`Saved ${jobs.length} jobs to local DB`);
    } catch (e) {
        console.error("Failed to save jobs locally", e);
    }
};

export const getLocalJobs = (): any[] => {
    try {
        const result = db.getAllSync('SELECT * FROM jobs ORDER BY scheduledAt ASC');
        // Parse the JSON again
        return result.map((r: any) => JSON.parse(r.details_json));
    } catch (e) {
        console.error("Failed to get local jobs", e);
        return [];
    }
};

export const addToOutbox = (url: string, method: string, body: any) => {
    try {
        db.runSync(
            'INSERT INTO outbox (url, method, body, createdAt) VALUES (?, ?, ?, ?)',
            [url, method, JSON.stringify(body), new Date().toISOString()]
        );
        console.log('Added to outbox');
    } catch (e) {
        console.error("Failed to add to outbox", e);
    }
};

export const getOutbox = () => {
    try {
        return db.getAllSync('SELECT * FROM outbox ORDER BY createdAt ASC');
    } catch (e) {
        return [];
    }
};

export const removeFromOutbox = (id: number) => {
    db.runSync('DELETE FROM outbox WHERE id = ?', [id]);
};
