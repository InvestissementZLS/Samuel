import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: any = null;
if (Platform.OS !== 'web') {
    try {
        db = SQLite.openDatabaseSync('antigravity.db');
    } catch(e) {
        console.error("DB error", e);
    }
} else {
    // Mock for web
    db = {
        execSync: () => {},
        withTransactionSync: (cb: any) => cb(),
        runSync: () => {},
        getAllSync: () => []
    };
}

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
                division TEXT DEFAULT 'EXTERMINATION',
                details_json TEXT, -- Full object for details view
                syncStatus TEXT DEFAULT 'SYNCED' -- SYNCED, DIRTY
            );

            CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT,
                method TEXT,
                body TEXT,
                createdAt TEXT,
                retryCount INTEGER DEFAULT 0
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

export const saveJobsToLocal = (jobs: any[]) => {
    try {
        db.withTransactionSync(() => {
            jobs.forEach(job => {
                if (job.isDeleted) {
                    try {
                        db.runSync('DELETE FROM jobs WHERE id = ?', [job.id]);
                        console.log(`Deleted job ${job.id} from local cache (Delta Sync)`);
                    } catch (err) {
                        console.warn(`Failed to delete job ${job.id}:`, err);
                    }
                    return; // Skip insert
                }

                try {
                    db.runSync(
                        'INSERT OR REPLACE INTO jobs (id, scheduledAt, status, description, clientName, address, division, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            job.id,
                            job.scheduledAt,
                            job.status,
                            job.description || '',
                            job.property?.client?.name ?? 'Client Inconnu',
                            job.property?.address ?? 'Adresse Inconnue',
                            job.division || 'EXTERMINATION',
                            JSON.stringify(job)
                        ]
                    );
                } catch (err) {
                    console.warn(`Skipped inserting job ${job.id} due to SQLite error: `, err);
                }
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

// M-07 FIX: Increment retry count so we can abandon permanently broken items
export const incrementOutboxRetry = (id: number) => {
    try {
        db.runSync('UPDATE outbox SET retryCount = retryCount + 1 WHERE id = ?', [id]);
    } catch (e) {
        console.error("Failed to increment outbox retry count", e);
    }
};
